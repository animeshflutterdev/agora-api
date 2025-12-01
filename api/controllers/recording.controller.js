require("dotenv").config();
const axios = require('axios');
const { RtcTokenBuilder, RtcRole } = require("agora-token");

const APP_ID = process.env.AGORA_APP_ID;
const APP_CERTIFICATE = process.env.AGORA_APP_CERTIFICATE;
const CUSTOMER_ID = process.env.AGORA_CUSTOMER_ID;
const CUSTOMER_SECRET = process.env.AGORA_CUSTOMER_SECRET;

const ERROR_CODES = {
  2: "Invalid parameter",
  7: "Recording already running",
  8: "HTTP request header error",
  49: "Repeated stop request",
  53: "Recording already running (different resource)",
  62: "Cloud recording not enabled",
  65: "Network jitter - retry recommended",
  109: "Token expired",
  110: "Token invalid",
  432: "Parameter mismatch",
  433: "Resource ID expired",
  435: "No recorded files created",
  501: "Recording service exiting",
  1001: "Failed to parse resource ID",
  1003: "App ID or recording ID mismatch",
  1013: "Invalid channel name"
};

const STORAGE_CONFIG = {
  vendor: 1,
  region: 0,
  bucket: process.env.AGORA_S3_BUCKET || "agora-recordings",
  accessKey: process.env.AGORA_S3_ACCESS_KEY || "",
  secretKey: process.env.AGORA_S3_SECRET_KEY || "",
  fileNamePrefix: ["recordings"]
};

// In-memory storage for active sessions (use Redis/DB in production)
const activeSessions = new Map();

// Helper: Generate Agora Basic Auth Header
const getAuthHeader = () => {
  const credentials = Buffer.from(`${CUSTOMER_ID}:${CUSTOMER_SECRET}`).toString('base64');
  console.log(`getAuthHeader_credentials--> ${credentials}`);
  return {
    Authorization: `Basic ${credentials}`,
    'Content-Type': 'application/json'
  };
};

// Helper: Format error response
const formatErrorResponse = (errorCode, customMessage) => {
  return {
    success: false,
    errorCode: errorCode,
    errorMessage: ERROR_CODES[errorCode] || customMessage || "Unknown error",
    timestamp: new Date().toISOString()
  };
};

/**
 * START RECORDING (Only HOST can initiate)
 * Acquire resource and start cloud recording
 */
exports.startRecording = async (req, res) => {
  try {
    const { channelName, uid, recordingMode = 'mix', initiatorRole = 'host' } = req.body;
    console.log(`Onion--- ${JSON.stringify(req.body)}`);

    // Validation
    console.log("Onion99");
    if (!channelName || uid === undefined) {
      return res.status(400).json(formatErrorResponse(2, "Missing channelName or uid"));
    }

    console.log("Onion98");
    // Only HOST can start recording
    if (initiatorRole !== 'host') {
      return res.status(403).json({
        success: false,
        message: "Only HOST can start recording",
        timestamp: new Date().toISOString()
      });
    }

    console.log("Onion97");
    if (!APP_ID || !APP_CERTIFICATE || !CUSTOMER_ID || !CUSTOMER_SECRET) {
      return res.status(500).json(formatErrorResponse(2, "Missing Agora credentials in environment"));
    }

    console.log("Onion96");
    // Check if recording a lready exists for this channel
    if (activeSessions.has(channelName)) {
      console.log("Onion1");
      return res.status(400).json({
        success: false,
        message: "Recording already in progress for this channel",
        timestamp: new Date().toISOString()
      });
    }

    console.log(`[Recording Start] Channel: ${channelName}, UID: ${uid}, Mode: ${recordingMode}, Role: ${initiatorRole}`);

    // Step 1: Acquire Resource
    console.log("Onion95");
    const acquireResponse = await axios.post(
      `https://api.agora.io/v1/apps/${APP_ID}/cloud_recording/acquire`,
      {
        cname: channelName,
        uid: uid.toString(),
        clientRequest: {
          resourceExpiredHour: 24
        }
      },
      { headers: getAuthHeader() }
    );

    const resourceId = acquireResponse.data.resourceId;
    console.log(`[Acquire] Resource ID: ${resourceId}`);

    // Step 2: Generate token for recorder bot
    const currentTimestamp = Math.floor(Date.now() / 1000);
    const privilegeExpiredTs = currentTimestamp + 3600;
    const recorderToken = RtcTokenBuilder.buildTokenWithUid(
      APP_ID,
      APP_CERTIFICATE,
      channelName,
      uid,
      RtcRole.PUBLISHER,
      privilegeExpiredTs
    );

    let url = `https://api.agora.io/v1/apps/${APP_ID}/cloud_recording/resourceid/${resourceId}/mode/${recordingMode}/start`;
    console.log(`[Start Recording] URL: ${url}`);

    let data = {
      cname: channelName,
      uid: uid.toString(),
      clientRequest: {
        token: recorderToken,
        recordingConfig: {
          channelType: 0,
          streamTypes: 2,
          maxIdleTime: 30,
          transcodingConfig: {
            height: 640,
            width: 360,
            bitrate: 500,
            fps: 15,
            mixedVideoLayout: 1,
            backgroundColor: "#000000"
          }
        },
        storageConfig: STORAGE_CONFIG
      }
    };
    console.log(`[Start Recording] Data: ${JSON.stringify(data)}`);

    // Step 3: Start Recording
    const startResponse = await axios.post(
      url,
      data,
      { headers: getAuthHeader() }
    );

    const sid = startResponse.data.sid;
    console.log(`[Start Recording] SID: ${sid}`);

    // Store session info
    activeSessions.set(channelName, {
      resourceId,
      sid,
      channelName,
      uid,
      initiatorRole,
      startedAt: new Date().toISOString()
    });

    res.status(200).json({
      success: true,
      resourceId: resourceId,
      sid: sid,
      channelName: channelName,
      uid: uid,
      initiatedBy: initiatorRole,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[Start Recording Error]', error.response?.data || error.message);

    const errorCode = error.response?.data?.code || 501;
    const errorMsg = error.response?.data?.message || error.message;

    res.status(500).json(formatErrorResponse(errorCode, errorMsg));
  }
};

/**
 * STOP RECORDING (Only HOST can stop)
 * Stop recording and upload files to cloud storage
 */
exports.stopRecording = async (req, res) => {
  try {
    const { resourceId, sid, channelName, uid, recordingMode = 'mix', asyncStop = false, initiatorRole = 'host' } = req.body;

    // Validation
    if (!resourceId || !sid) {
      return res.status(400).json(formatErrorResponse(2, "Missing resourceId or sid"));
    }

    // Only HOST can stop recording
    if (initiatorRole !== 'host') {
      return res.status(403).json({
        success: false,
        message: "Only HOST can stop recording",
        timestamp: new Date().toISOString()
      });
    }

    console.log(`[Recording Stop] SID: ${sid}, Async: ${asyncStop}, Role: ${initiatorRole}`);

    const stopResponse = await axios.post(
      `https://api.agora.io/v1/apps/${APP_ID}/cloud_recording/resourceid/${resourceId}/sid/${sid}/mode/${recordingMode}/stop`,
      {
        cname: channelName,
        uid: uid?.toString(),
        clientRequest: {
          async_stop: asyncStop
        }
      },
      { headers: getAuthHeader() }
    );

    // Remove from active sessions
    if (channelName) {
      activeSessions.delete(channelName);
    }

    console.log(`[Recording Stopped] Upload status: ${stopResponse.data.serverResponse?.uploadingStatus}`);

    res.status(200).json({
      success: true,
      resourceId: resourceId,
      sid: sid,
      status: "stopped",
      stoppedAt: new Date().toISOString(),
      stoppedBy: initiatorRole,
      fileList: stopResponse.data.serverResponse?.fileList,
      uploadingStatus: stopResponse.data.serverResponse?.uploadingStatus || "unknown"
    });

  } catch (error) {
    console.error('[Stop Recording Error]', error.response?.data || error.message);

    const errorCode = error.response?.data?.code || 501;
    const errorMsg = error.response?.data?.message || error.message;

    res.status(500).json(formatErrorResponse(errorCode, errorMsg));
  }
};

/**
 * QUERY RECORDING STATUS
 * Check the current status of a recording session
 */
exports.queryRecording = async (req, res) => {
  try {
    const { resourceId, sid, recordingMode = 'mix', channelName } = req.body;

    if (!resourceId || !sid) {
      return res.status(400).json(formatErrorResponse(2, "Missing resourceId or sid"));
    }

    const queryResponse = await axios.get(
      `https://api.agora.io/v1/apps/${APP_ID}/cloud_recording/resourceid/${resourceId}/sid/${sid}/mode/${recordingMode}/query`,
      { headers: getAuthHeader() }
    );

    console.log(`[Query Recording] Status: ${queryResponse.data.serverResponse?.status}`);

    // Get session info if available
    const sessionInfo = channelName ? activeSessions.get(channelName) : null;

    res.status(200).json({
      success: true,
      resourceId: resourceId,
      sid: sid,
      status: queryResponse.data.serverResponse?.status,
      fileList: queryResponse.data.serverResponse?.fileList,
      sessionInfo: sessionInfo,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[Query Recording Error]', error.response?.data || error.message);

    const errorCode = error.response?.data?.code || 501;
    const errorMsg = error.response?.data?.message || error.message;

    res.status(500).json(formatErrorResponse(errorCode, errorMsg));
  }
};

/**
 * UPDATE RECORDING LAYOUT (Only HOST can update)
 * Update recording layout (composite mode only)
 */
exports.updateRecordingLayout = async (req, res) => {
  try {
    const { resourceId, sid, channelName, uid, recordingMode = 'mix', layoutConfig, initiatorRole = 'host' } = req.body;

    if (!resourceId || !sid) {
      return res.status(400).json(formatErrorResponse(2, "Missing resourceId or sid"));
    }

    // Only HOST can update layout
    if (initiatorRole !== 'host') {
      return res.status(403).json({
        success: false,
        message: "Only HOST can update recording layout",
        timestamp: new Date().toISOString()
      });
    }

    const updateResponse = await axios.post(
      `https://api.agora.io/v1/apps/${APP_ID}/cloud_recording/resourceid/${resourceId}/sid/${sid}/mode/${recordingMode}/updateLayout`,
      {
        cname: channelName,
        uid: uid?.toString(),
        clientRequest: {
          mixedVideoLayout: layoutConfig?.layout || 1,
          backgroundColor: layoutConfig?.backgroundColor || "#000000"
        }
      },
      { headers: getAuthHeader() }
    );

    res.status(200).json({
      success: true,
      resourceId: resourceId,
      sid: sid,
      message: "Layout updated successfully",
      updatedBy: initiatorRole,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[Update Layout Error]', error.response?.data || error.message);

    const errorCode = error.response?.data?.code || 501;
    const errorMsg = error.response?.data?.message || error.message;

    res.status(500).json(formatErrorResponse(errorCode, errorMsg));
  }
};

/**
 * GET ACTIVE SESSIONS
 * Get list of all active recording sessions
 */
exports.getActiveSessions = async (req, res) => {
  try {
    const sessions = Array.from(activeSessions.entries()).map(([channel, info]) => ({
      channelName: channel,
      ...info
    }));

    res.status(200).json({
      success: true,
      count: sessions.length,
      sessions: sessions,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[Get Active Sessions Error]', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

module.exports = exports;