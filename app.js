require("dotenv").config();
const express = require('express');
const cors = require("cors");
const path = require('path');
const multer = require("multer");
const fs = require("fs-extra");

const uploadsStore = require('./api/controllers/uploadsStore');
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

// Multer config for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadFolder);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "_" + file.originalname);
  }
});
const upload = multer({ storage });

// ===================================================
//   AGORA WEBHOOK – RECEIVES RECORDING FILES
//   Agora may call this endpoint with files (multipart/form-data)
//   or with metadata that contains file URLs to download.
// ===================================================
app.post("/agora/upload", upload.array("file"), async (req, res) => {
  try {
    console.log("🔔 AGORA CALLBACK RECEIVED");
    console.log("Headers =>", req.headers);

    // Metadata could be in req.body (some providers send JSON string in body)
    // Try to parse common fields: sid, resourceId, fileList
    const metadata = req.body || {};
    // If body fields are JSON strings, try to parse them
    if (typeof metadata === 'string') {
      try { metadata = JSON.parse(metadata); } catch (e) { }
    }

    const savedFiles = [];

    // 1) If Agora uploaded actual files (multipart)
    if (req.files && req.files.length > 0) {
      console.log("📁 Uploaded Files:");
      req.files.forEach(file => {
        const publicUrl = `${SERVER_PUBLIC_URL}/uploads/agora/${file.filename}`;
        console.log(file.path, '->', publicUrl);
        savedFiles.push({
          fileName: file.originalname,
          storedName: file.filename,
          path: file.path,
          url: publicUrl
        });
      });
    }

    // 2) If Agora posted JSON metadata with file URLs (fileList), download them
    // Example metadata.fileList might be JSON string or array: [{fileName, url}, ...]
    let fileList = metadata.fileList || metadata.files || metadata.file_list;
    if (fileList) {
      if (typeof fileList === 'string') {
        try { fileList = JSON.parse(fileList); } catch (e) { /* ignore */ }
      }
      if (Array.isArray(fileList) && fileList.length > 0) {
        // download remote files into uploads folder
        const axios = require('axios');
        for (const f of fileList) {
          const fileUrl = f.url || f.fileUrl || f.file_url;
          if (!fileUrl) continue;
          const outName = `${Date.now()}_${path.basename(fileUrl.split('?')[0])}`;
          const outPath = path.join(uploadFolder, outName);
          const writer = fs.createWriteStream(outPath);
          console.log('Downloading', fileUrl, '->', outPath);
          const response = await axios({
            url: fileUrl,
            method: 'GET',
            responseType: 'stream'
          });
          await new Promise((resolve, reject) => {
            response.data.pipe(writer);
            writer.on('finish', resolve);
            writer.on('error', reject);
          });
          const publicUrl = `${SERVER_PUBLIC_URL}/uploads/agora/${outName}`;
          savedFiles.push({
            fileName: f.fileName || outName,
            storedName: outName,
            path: outPath,
            url: publicUrl
          });
        }
      }
    }

    // Determine sid/resourceId if present
    const sid = metadata.sid || req.headers['x-agora-sid'] || null;
    const resourceId = metadata.resourceId || metadata.resource_id || req.headers['x-agora-resourceid'] || null;

    // Save metadata file for debugging
    try {
      const metaFile = path.join(uploadFolder, `metadata_${Date.now()}.json`);
      await fs.writeFile(metaFile, JSON.stringify({ headers: req.headers, body: req.body, savedFiles }, null, 2));
    } catch (e) { console.warn('Failed to write metadata file', e.message); }

    // Save to in-memory store for retrieval by stopRecording
    if (savedFiles.length > 0) {
      uploadsStore.addFiles({ sid, resourceId, files: savedFiles });
      console.log(`Stored ${savedFiles.length} files for SID=${sid} RESOURCE=${resourceId}`);
    } else {
      console.log('No files were saved in this callback (metadata only?)');
    }

    // Respond 200 OK to Agora
    res.status(200).json({
      success: true,
      message: "Upload received",
      sid,
      resourceId,
      files: savedFiles
    });

  } catch (err) {
    console.error("❌ ERROR saving Agora upload:", err);
    res.status(500).send("upload failed");
  }
});

// Endpoint to fetch recording files by SID (frontend or recording controller can poll this)
app.get('/agora/recording/:sid', (req, res) => {
  const sid = req.params.sid;
  const files = uploadsStore.getFilesBySid(sid);
  if (!files) {
    return res.status(404).json({ success: false, message: 'Files not yet available for sid', sid });
  }
  return res.status(200).json({ success: true, sid, files });
});

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