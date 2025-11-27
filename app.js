require("dotenv").config();
const express = require('express');
const cors = require("cors");
const path = require('path');


const app = express();

const hostname = process.env.HOST_NAME;
const port = process.env.PORT;

// Middleware
app.use(cors());
app.use(express.json());
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

app.use('/agora', require('./api/routes/agora.routes'));

// 404 handler - MUST be after all routes
// app.use((req, res) => {
//   res.status(404).json({ error: 'Route not found' });
// });

// Error handling middleware - MUST be last
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({
    error: 'Internal server error',
    details: err.message
  });
});

app.listen(port, () => {
  console.log(`Agora API listening at http://${hostname}:${port}`);
});