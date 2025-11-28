const express = require('express');
const router = express.Router();
const createRoomController = require("../controllers/create.room");
require("dotenv").config();

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
  vendor: 1, // 1 = AWS S3 (change based on your cloud storage)
  region: 0, // 0 = US_EAST_1, adjust based on your S3 region
  bucket: process.env.AGORA_S3_BUCKET || "agora-recordings",
  accessKey: process.env.AGORA_S3_ACCESS_KEY || "",
  secretKey: process.env.AGORA_S3_SECRET_KEY || "",
  // Optional: for temporary credentials
  // stsToken: process.env.AGORA_S3_STS_TOKEN || "",
  // stsExpiration: Math.floor(Date.now() / 1000) + 3600,
  fileNamePrefix: ["recordings"] // Files stored in /recordings/ folder
};

/*
The first function (nocache) will apply the response headers, which force 
the browser to never cache the response, ensuring that we always get a fresh 
token. You’ll notice we call the next() method at the end because this function 
is a middleware function that is the first in the series, so we need to call 
next() to let Express know to continue to the next function in the series
*/
const nocache = (_, resp, next) => {
  resp.header('Cache-Control', 'private, no-cache, no-store, must-revalidate');
  resp.header('Expires', '-1');
  resp.header('Pragma', 'no-cache');
  next();
}

// Route to create an Agora room
router.post('/create_room', nocache, createRoomController.createRoom);


// HELPER: Agora Basic Auth Header
const CUSTOMER_ID = process.env.AGORA_CUSTOMER_ID;
const CUSTOMER_SECRET = process.env.AGORA_CUSTOMER_SECRET;
const APP_ID = process.env.AGORA_APP_ID;
const APP_CERTIFICATE = process.env.AGORA_APP_CERTIFICATE;

const getAuthHeader = () => {
  const credentials = Buffer.from(`${CUSTOMER_ID}:${CUSTOMER_SECRET}`).toString('base64');
  return { Authorization: `Basic ${credentials}`, 'Content-Type': 'application/json' };
};

// Format error response
const formatErrorResponse = (errorCode, customMessage) => {
  return {
    success: false,
    errorCode: errorCode,
    errorMessage: ERROR_CODES[errorCode] || customMessage || "Unknown error",
    timestamp: new Date().toISOString()
  };
};

// START RECORDING (Frontend calls this)
router.post('/start-recording', async (req, res) => {
  // const { channelName, uid } = req.body; // uid should be a unique ID for the recorder bot (e.g., 999999)
  const { channelName, uid, recordingMode = 'mix' } = req.body;

  console.log(`[Recording Start] Channel: ${channelName}, UID: ${uid}, Mode: ${recordingMode}`);

  try {
    // Step 1: Acquire Resource
    const acquire = await axios.post(
      // `https://api.agora.io/v1/apps/${APP_ID}/cloud_recording/acquire`,
      `https://api.sd-rtn.com/v1/apps/${APP_ID}/cloud_recording/acquire`,
      { cname: channelName, uid: uid, clientRequest: { resourceExpiredHour: 24 } },
      { headers: getAuthHeader() }
    );
    const resourceId = acquire.data.resourceId;

    // Step 2: Start Recording
    const start = await axios.post(
      `https://api.agora.io/v1/apps/${APP_ID}/cloud_recording/resourceid/${resourceId}/mode/mix/start`,
      {
        cname: channelName,
        uid: uid,
        clientRequest: {
          token: RtcTokenBuilder.buildTokenWithUid(APP_ID, APP_CERTIFICATE, channelName, uid, RtcRole.PUBLISHER, Math.floor(Date.now() / 1000) + 3600),
          recordingConfig: {
            channelType: 0, // Communication
            streamTypes: 2, // Audio+Video
            maxIdleTime: 30,
            transcodingConfig: {
              height: 640, width: 360, bitrate: 500, fps: 15, mixedVideoLayout: 1, backgroundColor: "#000000"
            }
          },
          storageConfig: STORAGE_CONFIG
        }
      },
      { headers: getAuthHeader() }
    );
    console.log(`start-recording --> ${start}`);

    res.json({ sid: start.data.sid, resourceId: resourceId });
  } catch (error) {
    console.error(error.response?.data);
    res.status(500).json({ error: error.message });
  }
});

// STOP RECORDING
router.post('/stop-recording', async (req, res) => {
  const { channelName, uid, resourceId, sid } = req.body;
  try {
    const response = await axios.post(
      `https://api.agora.io/v1/apps/${APP_ID}/cloud_recording/resourceid/${resourceId}/sid/${sid}/mode/mix/stop`,
      { cname: channelName, uid: uid, clientRequest: {} },
      { headers: getAuthHeader() }
    );
    console.log(`stop-recording --> ${response}`);
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * ====== QUERY RECORDING STATUS ======
 * Check the current status of a recording session
 */
router.post('/query-recording', async (req, res) => {
  try {
    const { channelName, uid, resourceId, sid, recordingMode = 'mix' } = req.body;

    if (!resourceId || !sid) {
      return res.status(400).json(formatErrorResponse(2, "Missing resourceId or sid"));
    }

    try {
      const queryResponse = await axios.get(
        `https://api.sd-rtn.com/v1/apps/${APP_ID}/cloud_recording/resourceid/${resourceId}/sid/${sid}/mode/${recordingMode}/query`,
        { headers: getAuthHeader() }
      );

      console.log(`[Query Recording] Status: ${queryResponse.data.serverResponse?.status}`);
      res.status(200).json({
        success: true,
        resourceId: resourceId,
        sid: sid,
        status: queryResponse.data.serverResponse?.status,
        fileList: queryResponse.data.serverResponse?.fileList,
        timestamp: new Date().toISOString()
      });

    } catch (queryError) {
      const errorCode = queryError.response?.data?.code || 501;
      const errorMsg = queryError.response?.data?.message || queryError.message;
      console.error(`[Query Error] Code: ${errorCode}, Message: ${errorMsg}`);
      return res.status(500).json(formatErrorResponse(errorCode, errorMsg));
    }

  } catch (error) {
    console.error(`[Unexpected Error] ${error.message}`);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * ====== STOP RECORDING ======
 * Stop recording and upload files to cloud storage
 * 
 * Supports both synchronous and asynchronous stop modes
 */
router.post('/stop-recording', async (req, res) => {
  try {
    const { resourceId, sid, channelName, uid, recordingMode = 'mix', asyncStop = false } = req.body;

    // Validation
    if (!resourceId || !sid) {
      return res.status(400).json(formatErrorResponse(2, "Missing resourceId or sid"));
    }

    console.log(`[Recording Stop] SID: ${sid}, Async: ${asyncStop}`);

    try {
      const stopResponse = await axios.post(
        `https://api.sd-rtn.com/v1/apps/${APP_ID}/cloud_recording/resourceid/${resourceId}/sid/${sid}/mode/${recordingMode}/stop`,
        {
          cname: channelName,
          uid: uid?.toString(),
          clientRequest: {
            async_stop: asyncStop // true = return immediately, false = wait for upload
          }
        },
        { headers: getAuthHeader() }
      );

      const recordingResult = {
        success: true,
        resourceId: resourceId,
        sid: sid,
        status: "stopped",
        stoppedAt: new Date().toISOString(),
        fileList: stopResponse.data.serverResponse?.fileList,
        uploadingStatus: stopResponse.data.serverResponse?.uploadingStatus || "unknown"
      };

      console.log(`[Recording Stopped] Files uploaded: ${stopResponse.data.serverResponse?.uploadingStatus}`);
      res.status(200).json(recordingResult);

    } catch (stopError) {
      const errorCode = stopError.response?.data?.code || 501;
      const errorMsg = stopError.response?.data?.message || stopError.message;
      console.error(`[Stop Recording Error] Code: ${errorCode}, Message: ${errorMsg}`);
      return res.status(500).json(formatErrorResponse(errorCode, errorMsg));
    }

  } catch (error) {
    console.error(`[Unexpected Error] ${error.message}`);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * ====== UPDATE RECORDING LAYOUT ======
 * Update recording layout (composite mode only)
 */
router.post('/update-recording-layout', async (req, res) => {
  try {
    const { resourceId, sid, channelName, uid, recordingMode = 'mix', layoutConfig } = req.body;

    if (!resourceId || !sid) {
      return res.status(400).json(formatErrorResponse(2, "Missing resourceId or sid"));
    }

    try {
      const updateResponse = await axios.post(
        `https://api.sd-rtn.com/v1/apps/${APP_ID}/cloud_recording/resourceid/${resourceId}/sid/${sid}/mode/${recordingMode}/updateLayout`,
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
        timestamp: new Date().toISOString()
      });

    } catch (updateError) {
      const errorCode = updateError.response?.data?.code || 501;
      const errorMsg = updateError.response?.data?.message || updateError.message;
      console.error(`[Update Layout Error] Code: ${errorCode}, Message: ${errorMsg}`);
      return res.status(500).json(formatErrorResponse(errorCode, errorMsg));
    }

  } catch (error) {
    console.error(`[Unexpected Error] ${error.message}`);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = router;
