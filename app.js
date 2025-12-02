require("dotenv").config();
const express = require('express');
const cors = require("cors");
const path = require('path');
const fs = require("fs-extra");

const app = express();

const hostname = process.env.HOST_NAME || '0.0.0.0';
const port = process.env.PORT || 4000;
const SERVER_PUBLIC_URL = process.env.SERVER_PUBLIC_URL || `http://${hostname}:${port}`;

// Middleware
app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true }));

// Request logging for debugging
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

// Routes - MUST come before 404 handler
app.get('/', (req, res) => {
  res.send('Agora API Running!');
});

app.get('/videoCall', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/noposter', (req, res) => {
  res.send('No Poster');
});

app.use('/agora', require('./api/routes/agora.routes'));

// --------------------------------------------------------------------------------------
// Storage location for uploaded recording files
const uploadFolder = path.join(__dirname, "uploads/agora");
fs.ensureDirSync(uploadFolder);

// Serve uploaded files statically so the returned URLs are reachable
app.use('/uploads/agora', express.static(uploadFolder));

// --------------------------------------------------------------------------------------
// Error handling middleware - MUST be last
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({
    error: 'Internal server error',
    details: err.message
  });
});

app.listen(port, () => {
  console.log(`Agora API listening at ${SERVER_PUBLIC_URL}`);
});