# Agora Chat REST API - Fixed Implementation Guide

## ✅ Problem Fixed

**Issue:** `ReferenceError: self is not defined`  
**Cause:** The `agora-chat` SDK is a browser-only library and cannot run in Node.js  
**Solution:** Switched to using Agora Chat REST API directly via HTTP requests

## 🔧 What Changed

### 1. Removed Browser SDK
- ❌ Removed `agora-chat` package dependency
- ✅ Now using `axios` to make REST API calls

### 2. Updated Controller
The `agora.chat.js` controller now uses HTTP requests instead of SDK:
- App token management with caching
- User registration via REST API
- User token generation via REST API
- Message sending via REST API

### 3. New Endpoints Added

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/agora/chat/register` | Register new chat user |
| POST | `/agora/chat/user-token` | Get user access token |
| POST | `/agora/chat` | Send chat message |
| GET | `/agora/chat/status` | Check API status |

## 📋 Setup Instructions

### 1. Environment Variables

Add to your `.env` file:
```env
# Agora Chat Configuration
AGORA_CHAT_ORG_NAME=your_org_name
AGORA_CHAT_APP_NAME=your_app_name
AGORA_CHAT_CLIENT_ID=your_client_id
AGORA_CHAT_CLIENT_SECRET=your_client_secret
```

### 2. Get Credentials

1. Go to [Agora Console](https://console.agora.io/)
2. Select your project
3. Enable "Chat" service
4. Get your credentials:
   - **Org Name**: Found in Chat settings
   - **App Name**: Your application name
   - **Client ID**: App credentials
   - **Client Secret**: App credentials

### 3. Test the Server

```bash
# Start server
npm run dev

# Test status endpoint
curl http://localhost:4000/agora/chat/status
```

## 🚀 Usage Examples

### 1. Register a User

```bash
curl -X POST http://localhost:4000/agora/chat/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "user1",
    "password": "password123"
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "uuid": "user-uuid",
    "type": "user",
    "created": 1702200000000,
    "username": "user1"
  }
}
```

### 2. Get User Token

```bash
curl -X POST http://localhost:4000/agora/chat/user-token \
  -H "Content-Type: application/json" \
  -d '{
    "username": "user1",
    "password": "password123"
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "User token generated successfully",
  "data": {
    "username": "user1",
    "accessToken": "YWMt...",
    "expiresIn": 3600
  }
}
```

### 3. Send Message

```bash
curl -X POST http://localhost:4000/agora/chat \
  -H "Content-Type: application/json" \
  -d '{
    "from": "user1",
    "to": "user2",
    "message": "Hello from REST API!",
    "chatType": "users"
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "Message sent successfully",
  "data": {
    "from": "user1",
    "to": "user2",
    "messageContent": "Hello from REST API!",
    "chatType": "users",
    "messageId": "msg-id",
    "timestamp": "2025-12-10T09:30:00.000Z"
  }
}
```

## 💻 Frontend Integration

### Update index.html

Add these functions to your `public/index.html`:

```javascript
// Chat configuration
const chatConfig = {
    currentUser: null,
    userToken: null
};

// Register user (call once per user)
async function registerChatUser(username, password) {
    try {
        const response = await axios.post(`${config.backendUrl}/chat/register`, {
            username: username,
            password: password
        });
        console.log('✅ User registered:', response.data);
        return response.data;
    } catch (error) {
        console.error('❌ Registration failed:', error.response?.data);
        throw error;
    }
}

// Login user (get token)
async function loginChatUser(username, password) {
    try {
        const response = await axios.post(`${config.backendUrl}/chat/user-token`, {
            username: username,
            password: password
        });
        
        chatConfig.currentUser = username;
        chatConfig.userToken = response.data.data.accessToken;
        
        console.log('✅ User logged in:', username);
        return response.data;
    } catch (error) {
        console.error('❌ Login failed:', error.response?.data);
        throw error;
    }
}

// Send chat message
async function sendChatMessage(to, message) {
    try {
        if (!chatConfig.currentUser) {
            throw new Error('Please login first');
        }
        
        const response = await axios.post(`${config.backendUrl}/chat`, {
            from: chatConfig.currentUser,
            to: to,
            message: message,
            chatType: 'users'
        });
        
        console.log('✅ Message sent:', response.data);
        return response.data;
    } catch (error) {
        console.error('❌ Failed to send message:', error.response?.data);
        throw error;
    }
}

// Update sendQuickMessage function
async function sendQuickMessage() {
    const input = document.getElementById('chatMessageInput');
    const message = input.value.trim();
    
    if (!message || !Object.keys(remoteUsers).length) {
        alert('Please enter a message and ensure someone is in the call');
        return;
    }
    
    // Use the remote user's ID as chat username
    const remoteUserId = Object.keys(remoteUsers)[0];
    
    try {
        // If not logged in, register and login first
        if (!chatConfig.currentUser) {
            const username = `user_${currentUserId}`;
            const password = 'temp123'; // In production, use secure password
            
            try {
                await registerChatUser(username, password);
            } catch (e) {
                // User might already exist, try login
            }
            
            await loginChatUser(username, password);
        }
        
        // Send message
        await sendChatMessage(`user_${remoteUserId}`, message);
        input.value = '';
        alert('Message sent!');
    } catch (error) {
        alert('Failed to send message: ' + error.message);
    }
}
```

## 🔍 Testing Workflow

### Complete Test Sequence:

```bash
# 1. Check status
curl http://localhost:4000/agora/chat/status

# 2. Register user1
curl -X POST http://localhost:4000/agora/chat/register \
  -H "Content-Type: application/json" \
  -d '{"username": "user1", "password": "pass123"}'

# 3. Register user2
curl -X POST http://localhost:4000/agora/chat/register \
  -H "Content-Type: application/json" \
  -d '{"username": "user2", "password": "pass123"}'

# 4. Get user1 token
curl -X POST http://localhost:4000/agora/chat/user-token \
  -H "Content-Type: application/json" \
  -d '{"username": "user1", "password": "pass123"}'

# 5. Send message from user1 to user2
curl -X POST http://localhost:4000/agora/chat \
  -H "Content-Type: application/json" \
  -d '{
    "from": "user1",
    "to": "user2",
    "message": "Hello user2!",
    "chatType": "users"
  }'
```

## 📊 API Response Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 400 | Bad Request (missing fields) |
| 401 | Unauthorized (invalid credentials) |
| 500 | Server Error |

## 🐛 Troubleshooting

### Error: "Failed to get app token"
- Check your `AGORA_CHAT_CLIENT_ID` and `AGORA_CHAT_CLIENT_SECRET`
- Verify Chat service is enabled in Agora Console

### Error: "User already exists"
- User is already registered
- Try logging in instead of registering

### Error: "Invalid username or password"
- Check credentials
- Username and password are case-sensitive

## 🎯 Key Differences from SDK

| Feature | SDK (Browser) | REST API (Server) |
|---------|---------------|-------------------|
| Environment | Browser only | Node.js server |
| Connection | WebSocket | HTTP requests |
| Real-time | Yes | No (polling needed) |
| Token | User token | App token + User token |
| Complexity | Higher | Lower |

## ✅ Advantages of REST API

1. **Server-side** - Works in Node.js
2. **Simple** - Just HTTP requests
3. **Reliable** - No connection management
4. **Secure** - Credentials stay on server
5. **Scalable** - Stateless architecture

---

**Status**: ✅ Fixed and Working  
**Last Updated**: December 10, 2025  
**Version**: 2.0.0 (REST API)
