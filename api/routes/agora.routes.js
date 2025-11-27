const express = require('express');
const router = express.Router();
const createRoomController = require("../controllers/create.room");
require("dotenv").config();

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

// START RECORDING (Frontend calls this)
router.post('/start-recording', async (req, res) => {
  const { channelName, uid } = req.body; // uid should be a unique ID for the recorder bot (e.g., 999999)

  try {
    // Step 1: Acquire Resource
    const acquire = await axios.post(
      `https://api.agora.io/v1/apps/${APP_ID}/cloud_recording/acquire`,
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

module.exports = router;
