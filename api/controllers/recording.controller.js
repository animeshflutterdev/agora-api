require("dotenv").config();
const axios = require('axios');
const { RtcTokenBuilder, RtcRole } = require("agora-token");
const uploadsStore = require('./uploadsStore'); // adjust path if needed
const multer = require("multer");
const fs = require("fs-extra");
const path = require('path');

const APP_ID = process.env.AGORA_APP_ID;
const APP_CERTIFICATE = process.env.AGORA_APP_CERTIFICATE;
const CUSTOMER_ID = process.env.AGORA_CUSTOMER_ID;
const CUSTOMER_SECRET = process.env.AGORA_CUSTOMER_SECRET;
const SERVER_PUBLIC_URL = process.env.SERVER_PUBLIC_URL || `${process.env.HOST_NAME}:${process.env.PORT}`;
console.log(`SERVER_PUBLIC_URL---> ${SERVER_PUBLIC_URL}`);

const ERROR_CODES = { 2: "Invalid parameter", 7: "Recording already running", 8: "HTTP request header error", 49: "Repeated stop request", 53: "Recording already running (different resource)", 62: "Cloud recording not enabled", 65: "Network jitter - retry recommended", 109: "Token expired", 110: "Token invalid", 432: "Parameter mismatch", 433: "Resource ID expired", 435: "No recorded files created", 501: "Recording service exiting", 1001: "Failed to parse resource ID", 1003: "App ID or recording ID mismatch", 1013: "Invalid channel name" };

const LOCAL_STORAGE_CONFIG = {
  vendor: 6,          // 6 = CUSTOM HTTPS SERVER
  region: 1,
  bucket: `${SERVER_PUBLIC_URL}/upload`, // Agora will POST here
  accessKey: "none",
  secretKey: "none",
  fileNamePrefix: ["records"]
};

// In-memory storage for active sessions (use Redis/DB in production)
const activeSessions = new Map();

const getAuthHeader = () => {
  const credentials = Buffer.from(`${CUSTOMER_ID}:${CUSTOMER_SECRET}`).toString('base64');
  return {
    Authorization: `Basic ${credentials}`,
    'Content-Type': 'application/json'
  };
};

const formatErrorResponse = (errorCode, customMessage) => {
  return {
    success: false,
    errorCode: errorCode,
    errorMessage: ERROR_CODES[errorCode] || customMessage || "Unknown error",
    timestamp: new Date().toISOString()
  };
};

// Storage location for uploaded recording files
// Using process.cwd() to ensure we target the project root 'uploads/agora' folder
const uploadFolder = path.join(process.cwd(), "uploads/");
fs.ensureDirSync(uploadFolder);

// Multer config for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadFolder);
  },
  filename: (req, file, cb) => {
    const timestamp = new Date().toISOString().replace(/T/, '_').replace(/\..+/, '').replace(/:/g, '-');
    cb(null, `${timestamp}_${Date.now()}_${file.originalname}`);
  }
});
const upload = multer({ storage });

// Export middleware for use in routes
exports.uploadMiddleware = upload.array("file");

exports.startRecording = async (req, res) => {
  try {
    const { channelName, uid, recordingMode = 'mix', initiatorRole = 'host' } = req.body;

    if (!channelName || uid === undefined) {
      return res.status(400).json(formatErrorResponse(2, "Missing channelName or uid"));
    }

    if (initiatorRole !== 'host') {
      return res.status(403).json({ success: false, message: "Only HOST can start recording", timestamp: new Date().toISOString() });
    }

    if (!APP_ID || !APP_CERTIFICATE || !CUSTOMER_ID || !CUSTOMER_SECRET) {
      return res.status(500).json(formatErrorResponse(2, "Missing Agora credentials in environment"));
    }

    if (activeSessions.has(channelName)) {
      return res.status(400).json({ success: false, message: "Recording already in progress for this channel", timestamp: new Date().toISOString() });
    }

    // Acquire
    const acquireResponse = await axios.post(
      `https://api.agora.io/v1/apps/${APP_ID}/cloud_recording/acquire`,
      { cname: channelName, uid: uid.toString(), clientRequest: { resourceExpiredHour: 24 } },
      { headers: getAuthHeader() }
    );

    const resourceId = acquireResponse.data.resourceId;

    // recorder token
    const currentTimestamp = Math.floor(Date.now() / 1000);
    const privilegeExpiredTs = currentTimestamp + 3600;
    const recorderToken = RtcTokenBuilder.buildTokenWithUid(APP_ID, APP_CERTIFICATE, channelName, uid, RtcRole.PUBLISHER, privilegeExpiredTs);

    const url = `https://api.agora.io/v1/apps/${APP_ID}/cloud_recording/resourceid/${resourceId}/mode/${recordingMode}/start`;

    const data = {
      cname: channelName,
      uid: uid.toString(),
      clientRequest: {
        token: recorderToken,
        recordingConfig: {
          channelType: 0,
          streamTypes: 2,
          maxIdleTime: 30,
          transcodingConfig: {
            height: 640, width: 360, bitrate: 500, fps: 15, mixedVideoLayout: 1, backgroundColor: "#000000"
          }
        },
        // IMPORTANT: tell Agora where to POST files when recording finishes
        storageConfig: LOCAL_STORAGE_CONFIG,
        uploadWebhookUrl: `${SERVER_PUBLIC_URL}/agora/upload` // ensure this is public HTTPS reachable by Agora
      }
    };

    console.log(`url-data: ---${url} ||| ${data}`);

    const startResponse = await axios.post(url, data, { headers: getAuthHeader() });

    console.log(`startResponse_startRecording: ---${startResponse}`);

    const sid = startResponse.data.sid;

    activeSessions.set(channelName, { resourceId, sid, channelName, uid, initiatorRole, startedAt: new Date().toISOString() });

    res.status(200).json({ success: true, resourceId, sid, channelName, uid, initiatedBy: initiatorRole, timestamp: new Date().toISOString() });

  } catch (error) {
    console.error('[Start Recording Error]', error.response?.data || error.message);
    const errorCode = error.response?.data?.code || 501;
    const errorMsg = error.response?.data?.message || error.message;
    res.status(500).json(formatErrorResponse(errorCode, errorMsg));
  }
};

exports.stopRecording = async (req, res) => {
  try {
    const { resourceId, sid, channelName, uid, recordingMode = 'mix', asyncStop = false, initiatorRole = 'host' } = req.body;

    if (!resourceId || !sid) {
      return res.status(400).json(formatErrorResponse(2, "Missing resourceId or sid"));
    }

    if (initiatorRole !== 'host') {
      return res.status(403).json({ success: false, message: "Only HOST can stop recording", timestamp: new Date().toISOString() });
    }

    const stopResponse = await axios.post(
      `https://api.agora.io/v1/apps/${APP_ID}/cloud_recording/resourceid/${resourceId}/sid/${sid}/mode/${recordingMode}/stop`,
      { cname: channelName, uid: uid?.toString(), clientRequest: { async_stop: asyncStop } },
      { headers: getAuthHeader() }
    );

    console.log(`stopResponse_stopRecording: ---${stopResponse}`);
    console.log(`stopResponse.data.serverResponse?.uploadingStatus: ---${stopResponse.data.serverResponse?.uploadingStatus}`);

    // Remove from active sessions
    if (channelName) activeSessions.delete(channelName);

    // Check if uploadStore already has the files for this sid
    const uploadedFiles = uploadsStore.getFilesBySid(sid);
    if (uploadedFiles && uploadedFiles.length > 0) {
      return res.status(200).json({
        success: true,
        resourceId,
        sid,
        status: "stopped",
        stoppedAt: new Date().toISOString(),
        stoppedBy: initiatorRole,
        fileList: uploadedFiles,
        uploadingStatus: stopResponse.data.serverResponse?.uploadingStatus || "done"
      });
    }

    // If files are not yet available, respond with stop info and a poll endpoint
    const pollEndpoint = `${SERVER_PUBLIC_URL}/upload/${sid}`;
    console.log(`[Recording Stopped] files not yet in store for sid=${sid}. poll at ${pollEndpoint}`);

    res.status(200).json({
      success: true,
      resourceId,
      sid,
      status: "stopped",
      stoppedAt: new Date().toISOString(),
      stoppedBy: initiatorRole,
      fileList: stopResponse.data.serverResponse?.fileList || null,
      uploadingStatus: stopResponse.data.serverResponse?.uploadingStatus || "pending",
      pollEndpoint
    });

  } catch (error) {
    console.error('[Stop Recording Error]', error.response?.data || error.message);
    const errorCode = error.response?.data?.code || 501;
    const errorMsg = error.response?.data?.message || error.message;
    res.status(500).json(formatErrorResponse(errorCode, errorMsg));
  }
};

exports.handleUpload = async (req, res) => {
  try {
    console.log("🔔 AGORA CALLBACK RECEIVED");
    console.log("Headers =>", req.headers);

    // Metadata could be in req.body (some providers send JSON string in body)
    // Try to parse common fields: sid, resourceId, fileList
    const metadata = req.body || {};
    // If body fields are JSON strings, try to parse them
    if (typeof metadata === 'string') {
      try { metadata = JSON.parse(metadata); } catch (e) { }
    }

    const savedFiles = [];

    // 1) If Agora uploaded actual files (multipart)
    if (req.files && req.files.length > 0) {
      console.log("📁 Uploaded Files:");
      req.files.forEach(file => {
        const publicUrl = `${SERVER_PUBLIC_URL}/uploads/${file.filename}`;
        console.log(file.path, '->', publicUrl);
        savedFiles.push({
          fileName: file.originalname,
          storedName: file.filename,
          path: file.path,
          url: publicUrl
        });
      });
    }

    // 2) If Agora posted JSON metadata with file URLs (fileList), download them
    // Example metadata.fileList might be JSON string or array: [{fileName, url}, ...]
    let fileList = metadata.fileList || metadata.files || metadata.file_list;
    if (fileList) {
      if (typeof fileList === 'string') {
        try { fileList = JSON.parse(fileList); } catch (e) { /* ignore */ }
      }
      if (Array.isArray(fileList) && fileList.length > 0) {
        // download remote files into uploads folder
        // We need axios here, but it is already imported at the top
        for (const f of fileList) {
          const fileUrl = f.url || f.fileUrl || f.file_url;
          if (!fileUrl) continue;
          const timestamp = new Date().toISOString().replace(/T/, '_').replace(/\..+/, '').replace(/:/g, '-');
          const outName = `${timestamp}_${Date.now()}_${path.basename(fileUrl.split('?')[0])}`;
          const outPath = path.join(uploadFolder, outName);
          const writer = fs.createWriteStream(outPath);
          console.log('Downloading', fileUrl, '->', outPath);
          const response = await axios({
            url: fileUrl,
            method: 'GET',
            responseType: 'stream'
          });
          await new Promise((resolve, reject) => {
            response.data.pipe(writer);
            writer.on('finish', resolve);
            writer.on('error', reject);
          });
          const publicUrl = `${SERVER_PUBLIC_URL}/uploads/agora/${outName}`;
          savedFiles.push({
            fileName: f.fileName || outName,
            storedName: outName,
            path: outPath,
            url: publicUrl
          });
        }
      }
    }

    // Determine sid/resourceId if present
    const sid = metadata.sid || req.headers['x-agora-sid'] || null;
    const resourceId = metadata.resourceId || metadata.resource_id || req.headers['x-agora-resourceid'] || null;

    // Save metadata file for debugging
    try {
      const metaFile = path.join(uploadFolder, `metadata_${Date.now()}.json`);
      await fs.writeFile(metaFile, JSON.stringify({ headers: req.headers, body: req.body, savedFiles }, null, 2));
    } catch (e) { console.warn('Failed to write metadata file', e.message); }

    // Save to in-memory store for retrieval by stopRecording
    if (savedFiles.length > 0) {
      uploadsStore.addFiles({ sid, resourceId, files: savedFiles });
      console.log(`Stored ${savedFiles.length} files for SID=${sid} RESOURCE=${resourceId}`);
    } else {
      console.log('No files were saved in this callback (metadata only?)');
    }

    // Respond 200 OK to Agora
    res.status(200).json({
      success: true,
      message: "Upload received",
      sid,
      resourceId,
      files: savedFiles
    });

  } catch (err) {
    console.error("❌ ERROR saving Agora upload:", err);
    res.status(500).send("upload failed");
  }
};

exports.getRecordingFiles = (req, res) => {
  const sid = req.params.sid;
  const files = uploadsStore.getFilesBySid(sid);
  if (!files) {
    return res.status(404).json({ success: false, message: 'Files not yet available for sid', sid });
  }
  return res.status(200).json({ success: true, sid, files });
};