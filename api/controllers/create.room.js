require("dotenv").config();
const { RtcTokenBuilder, RtcRole } = require("agora-token");

/**
 * Generate RTC token for joining a channel
 * @param {string} channelName - Channel name
 * @param {string} uid - User ID
 * @param {string} role - User role (publisher/subscriber)
 */
exports.tokenGenarate = async (req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");

  try {
    const AGORA_APP_ID = process.env.AGORA_APP_ID;
    const AGORA_APP_CERTIFICATE = process.env.AGORA_APP_CERTIFICATE;

    // Check environment variables
    if (!AGORA_APP_ID || !AGORA_APP_CERTIFICATE) {
      return res.status(500).json({
        success: false,
        message: "Missing AGORA_APP_ID or AGORA_APP_CERTIFICATE in environment variables",
        data: {},
      });
    }

    const { channelName, uid, role = "publisher" } = req.body;

    // Validation
    if (!channelName || uid === undefined) {
      return res.status(400).json({
        success: false,
        error: "channelName and uid are required",
      });
    }

    // Determine RTC role
    const rtcRole = role.toLowerCase() === "subscriber"
      ? RtcRole.SUBSCRIBER
      : RtcRole.PUBLISHER;

    // Token expiration (1 hour)
    const expirationTimeInSeconds = 3600;
    const currentTimestamp = Math.floor(Date.now() / 1000);
    const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds;

    // Generate RTC Token
    const rtcToken = RtcTokenBuilder.buildTokenWithUid(
      AGORA_APP_ID,
      AGORA_APP_CERTIFICATE,
      channelName,
      uid,
      rtcRole,
      privilegeExpiredTs
    );

    console.log(`[Create Room] Channel: ${channelName}, UID: ${uid}, Role: ${role}`);

    res.status(200).json({
      success: true,
      message: "Agora room creation successful",
      data: {
        timestamp: new Date().toISOString(),
        rtcToken: rtcToken,
        appId: AGORA_APP_ID,
        channelName: channelName,
        uid: uid,
        role: role,
        expiresIn: expirationTimeInSeconds,
        privilegeExpiredTs: privilegeExpiredTs,
      },
    });

  } catch (error) {
    console.error(`[Create Room Error] ${error.message}`);
    res.status(500).json({
      success: false,
      message: "Error creating Agora room",
      error: error.message,
    });
  }
};

module.exports = exports;