# Telemedicine - Doctor-Patient Video Consultation Platform

## 📋 Table of Contents
- [Overview](#overview)
- [Features](#features)
- [Technology Stack](#technology-stack)
- [Project Structure](#project-structure)
- [Installation](#installation)
- [Configuration](#configuration)
- [API Documentation](#api-documentation)
- [Frontend Documentation](#frontend-documentation)
- [Recording System](#recording-system)
- [Usage Guide](#usage-guide)
- [Troubleshooting](#troubleshooting)
- [Security Considerations](#security-considerations)

---

## 🎯 Overview

This is a real-time telemedicine video consultation platform built with Agora RTC SDK, enabling secure doctor-patient video calls with automatic recording capabilities. The system provides role-based access control, automatic session recording for doctors, and a user-friendly interface for both medical professionals and patients.

### Key Capabilities
- **Real-time Video/Audio Communication**: High-quality video calls using Agora RTC
- **Role-Based System**: Distinct Doctor and Patient roles with different permissions
- **Automatic Recording**: Doctors can automatically record consultations
- **Session Management**: Track active sessions and manage recordings
- **Responsive Design**: Works on desktop and mobile devices

---

## ✨ Features

### Doctor Features
- 🩺 Start and manage video consultations
- 🔴 Automatic recording when patient joins
- 🎬 Control recording start/stop
- 📊 Full consultation control
- 🚪 End consultation for all participants

### Patient Features
- 👤 Join consultations via channel name
- 📹 Video and audio participation
- 🔇 Mute/unmute controls
- ℹ️ Real-time consultation status
- 🚶 Leave consultation anytime

### Technical Features
- ✅ Adaptive video quality (1280x720 ideal, fallback to default)
- 🎤 Mandatory microphone, optional camera
- 🔄 Automatic reconnection handling
- 📱 Mobile-responsive interface
- 🎨 Modern gradient UI with role badges
- ⚡ Real-time status updates

---

## 🛠 Technology Stack

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **Agora RTC SDK** - Video/audio communication
- **Agora Cloud Recording** - Session recording
- **Axios** - HTTP client for Agora API calls
- **dotenv** - Environment variable management
- **CORS** - Cross-origin resource sharing

### Frontend
- **HTML5** - Structure
- **CSS3** - Styling (Gradients, Animations, Flexbox/Grid)
- **Vanilla JavaScript** - Logic and Agora SDK integration
- **Agora RTC SDK 4.x** - Client-side video/audio
- **Axios** - API communication

---

## 📁 Project Structure

```
agora-api/
├── api/
│   ├── controllers/
│   │   ├── create.room.js          # RTC token generation
│   │   └── recording.controller.js  # Recording management
│   └── routes/
│       └── agora.routes.js          # API route definitions
├── public/
│   └── index.html                   # Frontend application
├── .env                             # Environment variables
├── app.js                           # Express server setup
├── package.json                     # Dependencies
└── Docs.md                          # This file
```

---

## 🚀 Installation

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn
- Agora account with App ID and credentials

### Steps

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd agora-api
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   Create a `.env` file in the root directory:
   ```env
   PORT=3000
   AGORA_APP_ID=your_agora_app_id
   AGORA_APP_CERTIFICATE=your_agora_app_certificate
   AGORA_CUSTOMER_ID=your_customer_id
   AGORA_CUSTOMER_SECRET=your_customer_secret
   AGORA_BUCKET_NAME=your_s3_bucket_name
   AGORA_BUCKET_ACCESS_KEY=your_s3_access_key
   AGORA_BUCKET_SECRET_KEY=your_s3_secret_key
   AGORA_BUCKET_REGION=0
   AGORA_BUCKET_VENDOR=1
   ```

4. **Start the server**
   ```bash
   npm run dev    # Development mode with nodemon
   # or
   npm start      # Production mode
   ```

5. **Access the application**
   - Local: `http://localhost:3000`
   - Production: `https://agora-api-qthb.onrender.com`

---

## ⚙️ Configuration

### Environment Variables

| Variable | Description | Required | Example |
|----------|-------------|----------|---------|
| `PORT` | Server port | No | `3000` |
| `AGORA_APP_ID` | Agora App ID | Yes | `abc123...` |
| `AGORA_APP_CERTIFICATE` | Agora App Certificate | Yes | `xyz789...` |
| `AGORA_CUSTOMER_ID` | Agora Customer ID for Cloud Recording | Yes | `customer123` |
| `AGORA_CUSTOMER_SECRET` | Agora Customer Secret | Yes | `secret456` |
| `AGORA_BUCKET_NAME` | S3 bucket name for recordings | Yes | `my-recordings` |
| `AGORA_BUCKET_ACCESS_KEY` | S3 access key | Yes | `AKIA...` |
| `AGORA_BUCKET_SECRET_KEY` | S3 secret key | Yes | `secret...` |
| `AGORA_BUCKET_REGION` | S3 region code | Yes | `0` (US East) |
| `AGORA_BUCKET_VENDOR` | Storage vendor (1=AWS, 2=Alibaba, etc.) | Yes | `1` |

### Frontend Configuration

In `public/index.html`, update the `Live` constant:
```javascript
const Live = true;  // Set to false for local development

const config = {
    backendUrl: Live ? 'https://agora-api-qthb.onrender.com' : 'http://127.0.0.1:3000',
    appId: null
};
```

---

## 📡 API Documentation

### Base URL
- **Production**: `https://agora-api-qthb.onrender.com`
- **Development**: `http://localhost:3000`

### Endpoints

#### 1. Generate RTC Token
```http
POST /agora/create_room
```

**Request Body:**
```json
{
  "channelName": "Onion",
  "uid": 12345,
  "role": "publisher"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "rtcToken": "006abc...",
    "appId": "your_app_id"
  }
}
```

#### 2. Start Recording
```http
POST /agora/start-recording
```

**Request Body:**
```json
{
  "channelName": "Onion",
  "uid": 999999,
  "recordingMode": "mix",
  "initiatorRole": "host"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Recording started successfully",
  "data": {
    "resourceId": "resource123",
    "sid": "session456",
    "channelName": "Onion",
    "uid": 999999,
    "mode": "mix",
    "startedAt": "2025-12-01T10:00:00.000Z"
  }
}
```

#### 3. Stop Recording
```http
POST /agora/stop-recording
```

**Request Body:**
```json
{
  "channelName": "Onion",
  "uid": 999999,
  "resourceId": "resource123",
  "sid": "session456"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Recording stopped successfully",
  "data": {
    "resourceId": "resource123",
    "sid": "session456",
    "serverResponse": {
      "fileList": "recording.m3u8"
    }
  }
}
```

#### 4. Query Recording Status
```http
GET /agora/query-recording?channelName=Onion&uid=999999&resourceId=resource123&sid=session456
```

**Response:**
```json
{
  "success": true,
  "data": {
    "resourceId": "resource123",
    "sid": "session456",
    "serverResponse": {
      "status": "5",
      "fileList": "recording.m3u8"
    }
  }
}
```

#### 5. Get Active Sessions
```http
GET /agora/active-sessions
```

**Response:**
```json
{
  "success": true,
  "sessions": [
    {
      "channelName": "Onion",
      "resourceId": "resource123",
      "sid": "session456",
      "uid": 999999,
      "mode": "mix",
      "startedAt": "2025-12-01T10:00:00.000Z"
    }
  ]
}
```

---

## 🎨 Frontend Documentation

### User Interface Components

#### 1. Role Selection
- **Doctor Mode**: Green gradient badge, full control
- **Patient Mode**: Blue gradient badge, limited control

#### 2. Video Display
- **Local Video**: Shows your camera feed with role badge
- **Remote Video**: Shows other participant's feed
- **Recording Indicator**: Pulsing red dot when recording active

#### 3. Controls
- **Join Consultation**: Starts the video call
- **End/Leave Consultation**: Terminates the session
- **🎤 Mic Toggle**: Mute/unmute microphone
- **📹 Camera Toggle**: Enable/disable camera

### JavaScript Functions

#### Core Functions

**`joinCall()`**
- Validates channel input
- Generates random user ID
- Creates audio/video tracks
- Joins Agora channel
- Publishes local streams

**`handleUserPublished(user, mediaType)`**
- Subscribes to remote user's media
- Displays remote video/audio
- Triggers recording for doctors

**`handleUserLeft(user)`**
- Handles user disconnection
- Shows appropriate alerts
- Auto-disconnects patients if doctor leaves

**`startRecording()`**
- Initiates cloud recording
- Shows recording indicator
- Only accessible to doctors

**`leaveCall()`**
- Stops recording (doctors only)
- Closes local tracks
- Leaves channel
- Resets UI

---

## 🎥 Recording System

### How It Works

1. **Automatic Start**: When a doctor joins and a patient connects, recording starts automatically
2. **Cloud Storage**: Recordings are saved to configured S3 bucket
3. **Session Tracking**: Active sessions are tracked in-memory
4. **Automatic Stop**: Recording stops when doctor ends consultation

### Recording Configuration

```javascript
{
  channelType: 0,           // Communication mode
  streamTypes: 2,           // Audio + Video
  maxIdleTime: 30,          // Stop after 30s of inactivity
  transcodingConfig: {
    height: 640,
    width: 360,
    bitrate: 500,
    fps: 15,
    mixedVideoLayout: 1,    // Floating layout
    backgroundColor: "#000000"
  }
}
```

### Storage Structure
Recordings are stored in your S3 bucket with the following structure:
```
bucket-name/
└── recordings/
    └── {channelName}/
        └── {sid}/
            ├── recording.m3u8
            ├── segment0.ts
            ├── segment1.ts
            └── ...
```

---

## 📖 Usage Guide

### For Doctors

1. **Start Consultation**
   - Open the application
   - Select "🩺 Doctor" role
   - Enter channel name (default: "Onion")
   - Click "Join Consultation"

2. **During Consultation**
   - Wait for patient to join
   - Recording starts automatically
   - Use mic/camera controls as needed
   - Monitor recording indicator

3. **End Consultation**
   - Click "End Consultation"
   - Recording stops automatically
   - Patient is disconnected

### For Patients

1. **Join Consultation**
   - Open the application
   - Select "👤 Patient" role
   - Enter the same channel name as doctor
   - Click "Join Consultation"

2. **During Consultation**
   - Video call connects automatically
   - Use mic/camera controls
   - Consultation is being recorded

3. **Leave Consultation**
   - Click "Leave Consultation"
   - Or wait for doctor to end session

---

## 🔧 Troubleshooting

### Common Issues

#### 1. Camera Not Working
**Problem**: "Camera permission denied" or "Camera not found"

**Solutions**:
- Grant camera permissions in browser
- Check if camera is being used by another application
- Ensure HTTPS connection (required for camera access)
- Try refreshing the page

#### 2. Microphone Not Working
**Problem**: "Microphone is mandatory and not found"

**Solutions**:
- Grant microphone permissions
- Check system audio settings
- Verify microphone is connected
- Try a different browser

#### 3. Recording Fails to Start
**Problem**: "Failed to start recording"

**Solutions**:
- Verify Agora credentials in `.env`
- Check S3 bucket configuration
- Ensure both users are in the channel
- Check console for detailed error messages

#### 4. Cannot Join Channel
**Problem**: "Failed to join call" or "Failed to get token"

**Solutions**:
- Verify backend server is running
- Check network connection
- Ensure channel name is entered
- Verify Agora App ID and Certificate

#### 5. User Left Alert Not Showing
**Problem**: No notification when other user leaves

**Solutions**:
- Check browser console for errors
- Ensure `handleUserLeft` function is working
- Verify event listeners are attached
- Refresh the page

---

## 🔒 Security Considerations

### Current Implementation
- ✅ RTC token-based authentication
- ✅ Role-based access control (Doctor/Patient)
- ✅ Server-side token generation
- ✅ Environment variable protection

### Recommendations for Production

1. **Authentication**
   - Implement user authentication (JWT, OAuth)
   - Validate user identity before token generation
   - Add session management

2. **Authorization**
   - Verify doctor credentials
   - Implement appointment-based access
   - Add patient consent mechanisms

3. **Data Protection**
   - Enable HTTPS/SSL
   - Encrypt recordings at rest
   - Implement access logging
   - Add HIPAA compliance measures

4. **Recording Security**
   - Encrypt S3 bucket
   - Implement access controls
   - Add retention policies
   - Enable audit trails

5. **Rate Limiting**
   - Add API rate limiting
   - Implement DDoS protection
   - Monitor unusual activity

---

## 📝 Development Notes

### Code Quality
- ES6+ JavaScript syntax
- Async/await for asynchronous operations
- Error handling with try-catch blocks
- Console logging for debugging

### Browser Compatibility
- Chrome 74+
- Firefox 66+
- Safari 12+
- Edge 79+

### Performance Optimization
- Adaptive video quality
- Efficient track management
- Proper cleanup on disconnect
- Memory leak prevention

---

## 🤝 Contributing

### Development Workflow
1. Create a feature branch
2. Make changes
3. Test thoroughly
4. Submit pull request

### Code Style
- Use meaningful variable names
- Add comments for complex logic
- Follow existing code structure
- Update documentation

---

## 📄 License

This project is proprietary software. All rights reserved.

---

## 📞 Support

For issues, questions, or feature requests:
- Check the troubleshooting section
- Review console logs for errors
- Contact development team

---

## 🔄 Version History

### Version 1.0.0 (Current)
- ✅ Doctor-Patient role system
- ✅ Automatic recording for doctors
- ✅ Real-time video/audio communication
- ✅ Session management
- ✅ Responsive UI with role badges
- ✅ User leave notifications
- ✅ Default channel name support

### Planned Features
- 🔜 URL parameter-based authentication
- 🔜 Appointment-based access
- 🔜 Recording playback interface
- 🔜 Multi-language support
- 🔜 Screen sharing capability
- 🔜 Chat functionality
- 🔜 Consultation history

---

**Last Updated**: December 1, 2025  
**Maintained By**: Development Team
