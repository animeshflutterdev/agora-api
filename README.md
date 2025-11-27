# Agora API

A Node.js Express API project for Agora integration.

## Prerequisites

- Node.js (v14 or higher)
- npm (Node Package Manager)

## Installation

1. Clone the repository or navigate to the project directory:
   ```bash
   cd d:\Projects\Node-JS-Projects\agora-api
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file (optional):
   ```bash
   cp .env.example .env
   ```
   Then edit `.env` with your configuration values.

## Running the Project

### Production Mode
```bash
npm start
```

### Development Mode (with auto-reload)
```bash
npm run dev
```

The server will start on `http://localhost:3000` by default.

## Project Structure

```
agora-api/
├── api/              # API routes and controllers
├── app.js            # Main application file
├── package.json      # Project dependencies and scripts
├── .env.example      # Environment variables template
└── README.md         # This file
```

## Dependencies

- **express**: Web framework for Node.js
- **axios**: HTTP client for making requests
- **cors**: Enable CORS for cross-origin requests
- **dotenv**: Load environment variables from .env file
- **agora-rtc-react**: Agora RTC React SDK

## Dev Dependencies

- **nodemon**: Auto-restart server on file changes during development

## Available Scripts

- `npm start` - Run the application in production mode
- `npm run dev` - Run the application in development mode with auto-reload
- `npm test` - Run tests (not yet configured)

## License

ISC
