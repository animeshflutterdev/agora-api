require("dotenv").config();
const { RtcTokenBuilder, RtcRole, RtmTokenBuilder } = require("agora-token");


/**
 * Generate both RTC and RTM tokens in a single request
 * @param {string} channelName - Channel name
 * @param {string} uid - User ID
 * @param {string} role - User role (publisher/audience)
 */
exports.createRoom = async (req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");

  try {
    const AGORA_APP_ID = process.env.AGORA_APP_ID;
    const AGORA_APP_CERTIFICATE = process.env.AGORA_APP_CERTIFICATE;
    console.log("<O_O>");

    if (!AGORA_APP_ID || !AGORA_APP_CERTIFICATE) {
      //   process.exit(1);
      res.status(500).json({
        success: false,
        message:
          "Missing AGORA_APP_ID or AGORA_APP_CERTIFICATE in environment variables",
        data: {},
      });
    }

    const { channelName, uid, role = "publisher" } = req.body;
    // Validation
    if (!channelName || uid === undefined) {
      return res.status(400).json({
        error: "channelName and uid are required",
      });
    }

    const rtcRole =
      role.toLowerCase() === "subscriber" ? RtcRole.SUBSCRIBER : RtcRole.PUBLISHER;
    const expirationTimeInSeconds = 60 * 60; // 5 minutes 86400; // 24 hours
    const currentTimestamp = Math.floor(Date.now() / 1000);
    const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds;

    const rtcToken = RtcTokenBuilder.buildTokenWithUid(
      AGORA_APP_ID,
      AGORA_APP_CERTIFICATE,
      channelName,
      uid,
      rtcRole,
      privilegeExpiredTs
    );

    // const rtmToken = RtmTokenBuilder.buildToken(
    //   AGORA_APP_ID,
    //   AGORA_APP_CERTIFICATE,
    //   uid,
    //   role,
    //   privilegeExpiredTs
    // );

    res.status(200).json({
      success: true,
      message: "Agora room creation endpoint",
      data: {
        timestamp: new Date().toISOString(),
        rtcToken: rtcToken,
        // rtmToken: rtmToken,
        appId: AGORA_APP_ID,
        channelName: channelName,
        uid: uid,
        role: role,
        expiresIn: expirationTimeInSeconds,
        privilegeExpiredTs: privilegeExpiredTs,
      },
    });
  } catch (error) {
    console.log(`Error-> ${error}`);
    res.status(500).json({
      success: false,
      message: "Error creating Agora room",
      error: error.message,
    });
  }
};
