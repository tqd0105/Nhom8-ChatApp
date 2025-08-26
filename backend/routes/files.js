const express = require('express');
const { upload, handleMulterError, getFileInfo } = require('../middleware/upload');
const auth = require('../middleware/auth');
const createError = require('http-errors');
const path = require('path');
const fs = require('fs');

const router = express.Router();

// Upload file endpoint (cần authentication)
router.post('/upload', auth.verifyToken, (req, res, next) => {
  upload.single('file')(req, res, (err) => {
    if (err) {
      return handleMulterError(err, req, res, next);
    }
    
    if (!req.file) {
      return next(createError(400, 'No file provided'));
    }

    try {
      const fileInfo = getFileInfo(req.file);
      
      res.json({
        message: 'File uploaded successfully',
        file: fileInfo
      });
    } catch (error) {
      next(error);
    }
  });
});

// Get file info endpoint
router.get('/info/:filename', (req, res, next) => {
  try {
    const filename = req.params.filename;
    const filePath = path.join(process.cwd(), 'uploads', filename);
    
    if (!fs.existsSync(filePath)) {
      return next(createError(404, 'File not found'));
    }
    
    const stats = fs.statSync(filePath);
    const ext = path.extname(filename).toLowerCase();
    let fileType = 'unknown';
    
    if (['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext)) {
      fileType = 'image';
    } else if (['.pdf'].includes(ext)) {
      fileType = 'pdf';
    } else if (['.doc', '.docx'].includes(ext)) {
      fileType = 'document';
    }
    
    res.json({
      filename,
      size: stats.size,
      type: fileType,
      url: `/uploads/${filename}`,
      uploadDate: stats.birthtime
    });
  } catch (error) {
    next(error);
  }
});

// Delete file endpoint (cần authentication)
router.delete('/:filename', auth.verifyToken, (req, res, next) => {
  try {
    const filename = req.params.filename;
    const filePath = path.join(process.cwd(), 'uploads', filename);
    
    if (!fs.existsSync(filePath)) {
      return next(createError(404, 'File not found'));
    }
    
    fs.unlinkSync(filePath);
    
    res.json({
      message: 'File deleted successfully',
      filename
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
