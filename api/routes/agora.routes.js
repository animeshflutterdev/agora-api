const express = require('express');
const router = express.Router();
const createRoomController = require("../controllers/create.room");
const recordingController = require("../controllers/recording.controller");
require("dotenv").config();

/*
The first function (nocache) will apply the response headers, which force 
the browser to never cache the response, ensuring that we always get a fresh 
token. You'll notice we call the next() method at the end because this function 
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
router.post('/token_genarate', nocache, createRoomController.tokenGenarate);

// Recording routes (HOST only operations)  
router.post('/start-recording', nocache, recordingController.startRecording);
router.post('/stop-recording', nocache, recordingController.stopRecording);
// router.post('/query-recording', recordingController.queryRecording);
// router.post('/update-recording-layout', recordingController.updateRecordingLayout);
// router.get('/active-sessions', recordingController.getActiveSessions);

module.exports = router;