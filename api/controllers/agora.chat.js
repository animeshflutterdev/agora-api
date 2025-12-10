require("dotenv").config();
const axios = require('axios');

const AGORA_CHAT_ORG_NAME = process.env.AGORA_CHAT_ORG_NAME;
const AGORA_CHAT_APP_NAME = process.env.AGORA_CHAT_APP_NAME;
const AGORA_CHAT_CLIENT_ID = process.env.AGORA_CHAT_CLIENT_ID;
const AGORA_CHAT_CLIENT_SECRET = process.env.CHAT_CLIENT_SECRET;

// Agora Chat REST API base URL
const CHAT_API_BASE = `https://a1.easemob.com/${AGORA_CHAT_ORG_NAME}/${AGORA_CHAT_APP_NAME}`;

// Cache for app token
let appTokenCache = {
    token: null,
    expiresAt: 0
};

/**
 * Get Chat App Access Token (exported - similar to tokenGenarate)
 * Can be called as API endpoint or internally
 * GET /agora/chat/app-token
 */
exports.getChatAppToken = async (req, res, next) => {
    try {
        // Check environment variables
        if (!AGORA_CHAT_CLIENT_ID || !AGORA_CHAT_CLIENT_SECRET) {
            if (res) {
                return res.status(500).json({
                    success: false,
                    message: "Missing AGORA_CHAT_CLIENT_ID or AGORA_CHAT_CLIENT_SECRET in environment variables",
                    data: {},
                });
            }
            throw new Error("Missing Chat credentials");
        }

        // Return cached token if still valid (when called internally without res)
        if (!res && appTokenCache.token && Date.now() < appTokenCache.expiresAt - 60000) {
            return appTokenCache.token;
        }

        const response = await axios.post(`${CHAT_API_BASE}/token`, {
            grant_type: 'client_credentials',
            client_id: AGORA_CHAT_CLIENT_ID,
            client_secret: AGORA_CHAT_CLIENT_SECRET
        });

        const { access_token, expires_in } = response.data;

        // Cache the token
        appTokenCache.token = access_token;
        appTokenCache.expiresAt = Date.now() + (expires_in * 1000);

        console.log('✅ Chat app token retrieved and cached');

        // If called as API endpoint, return formatted response
        if (res) {
            return res.status(200).json({
                success: true,
                message: "Chat app token generated successfully",
                data: {
                    timestamp: new Date().toISOString(),
                    accessToken: access_token,
                    expiresIn: expires_in,
                    privilegeExpiredTs: Math.floor(appTokenCache.expiresAt / 1000)
                }
            });
        }

        // If called internally, return just the token
        return access_token;

    } catch (error) {
        console.error('❌ Failed to get chat app token:', error.response?.data || error.message);

        if (res) {
            return res.status(500).json({
                success: false,
                message: "Error getting chat app token",
                error: error.response?.data?.error_description || error.message
            });
        }

        throw new Error(`Failed to get chat app token: ${error.message}`);
    }
};

/**
 * Send Chat Message via REST API
 * POST /agora/chat
 * 
 * Request Body:
 * {
 *   "from": "senderUserID",
 *   "to": "receiverUserID",
 *   "message": "Hello!",
 *   "chatType": "users" // or "chatgroups" for group chat
 * }
 */
exports.chat = async (req, res) => {
    try {
        const { from, to, message, chatType = 'users' } = req.body;

        // Validate required fields
        if (!from || !to || !message) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields: from, to, message'
            });
        }

        // Get app token using the exported function
        const appToken = "007eJxTYNjsFtgSuF7ryoGkvIXzVmZOi3AR2abz/71QaplaPkOZTLECg4mJgYmFhWmSiYmZkYlxqlGShYVxapKZUVKqgYVpWqr5ER/LzIZARoYH9YwsjAysDIwMTAwgPgMDABj6G4k=";

        // Prepare message payload
        const messagePayload = {
            from: from,
            to: [to],
            type: 'txt',
            body: {
                msg: message
            }
        };

        // Send message via REST API
        const response = await axios.post(
            `${CHAT_API_BASE}/${chatType}/messages`,
            messagePayload,
            {
                headers: {
                    'Authorization': `Bearer ${appToken}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        console.log(`✅ Message sent from ${from} to ${to}`);

        res.json({
            success: true,
            message: 'Message sent successfully',
            data: {
                from: from,
                to: to,
                messageContent: message,
                chatType: chatType,
                messageId: response.data.data?.[to],
                timestamp: new Date().toISOString()
            }
        });

    } catch (error) {
        console.error('❌ Error sending chat message:', error.response?.data);
        console.error('❌ Error sending chat message 1:', error.message);
        res.status(500).json({
            success: false,
            message: 'Failed to send message',
            error: error.response?.data?.error_description || error.message
        });
    }
};

/**
 * Register Chat User
 * POST /agora/chat/register
 * 
 * Request Body:
 * {
 *   "username": "user123",
 *   "password": "password123"
 * }
 */
exports.registerUser = async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields: username, password'
            });
        }

        // Get app token
        const appToken = await exports.getChatAppToken();

        // Register user
        const response = await axios.post(
            `${CHAT_API_BASE}/users`,
            {
                username: username,
                password: password
            },
            {
                headers: {
                    'Authorization': `Bearer ${appToken}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        console.log(`✅ User registered: ${username}`);

        res.json({
            success: true,
            message: 'User registered successfully',
            data: response.data.entities[0]
        });

    } catch (error) {
        console.error('❌ Error registering user:', error.response?.data || error.message);
        res.status(500).json({
            success: false,
            message: 'Failed to register user',
            error: error.response?.data?.error_description || error.message
        });
    }
};

/**
 * Get User Token
 * POST /agora/chat/user-token
 * 
 * Request Body:
 * {
 *   "username": "user123",
 *   "password": "password123"
 * }
 */
exports.getUserToken = async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields: username, password'
            });
        }

        // Get app token first
        const appToken = await exports.getChatAppToken();

        // Get user token
        const response = await axios.post(
            `${CHAT_API_BASE}/token`,
            {
                grant_type: 'password',
                username: username,
                password: password
            },
            {
                headers: {
                    'Authorization': `Bearer ${appToken}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        console.log(`✅ User token generated for: ${username}`);

        res.json({
            success: true,
            message: 'User token generated successfully',
            data: {
                username: username,
                accessToken: response.data.access_token,
                expiresIn: response.data.expires_in
            }
        });

    } catch (error) {
        console.error('❌ Error getting user token:', error.response?.data || error.message);
        res.status(500).json({
            success: false,
            message: 'Failed to get user token',
            error: error.response?.data?.error_description || error.message
        });
    }
};

/**
 * Get Chat Connection Status
 * GET /agora/chat/status
 */
exports.getChatStatus = (req, res) => {
    try {
        res.json({
            success: true,
            status: 'ready',
            apiBase: CHAT_API_BASE,
            orgName: AGORA_CHAT_ORG_NAME,
            appName: AGORA_CHAT_APP_NAME,
            message: 'Chat REST API is ready',
            hasCredentials: !!(AGORA_CHAT_CLIENT_ID && AGORA_CHAT_CLIENT_SECRET)
        });
    } catch (error) {
        console.error('❌ Error getting chat status:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get chat status',
            error: error.message
        });
    }
};

module.exports = exports;