const multer = require('multer');
const path = require('path');
const createError = require('http-errors');

// Cấu hình storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/') // Thư mục lưu file
  },
  filename: function (req, file, cb) {
    // Tạo tên file unique: timestamp_originalname
    const timestamp = Date.now();
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext);
    const safeFilename = `${timestamp}_${name.replace(/[^a-zA-Z0-9]/g, '_')}${ext}`;
    cb(null, safeFilename);
  }
});

// File filter để kiểm tra loại file
const fileFilter = (req, file, cb) => {
  // Các loại file được phép
  const allowedTypes = [
    // Images
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'image/gif',
    'image/webp',
    // Documents
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    // Text files
    'text/plain',
    'text/csv',
    // Archives
    'application/zip',
    'application/x-rar-compressed',
    'application/x-7z-compressed',
    // Audio
    'audio/mpeg',
    'audio/wav',
    'audio/ogg',
    // Video (giới hạn kích thước)
    'video/mp4',
    'video/webm',
    'video/ogg'
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(createError(400, `File type ${file.mimetype} is not allowed`), false);
  }
};

// Cấu hình multer
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 1 // Chỉ cho phép 1 file mỗi lần upload
  }
});

// Middleware để xử lý lỗi multer
const handleMulterError = (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return next(createError(400, 'File too large. Maximum size is 10MB'));
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return next(createError(400, 'Too many files. Only 1 file allowed'));
    }
    if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      return next(createError(400, 'Unexpected field name'));
    }
  }
  next(error);
};

// Utility function để get file info
const getFileInfo = (file) => {
  const ext = path.extname(file.filename).toLowerCase();
  let fileType = 'unknown';
  
  if (['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext)) {
    fileType = 'image';
  } else if (['.pdf'].includes(ext)) {
    fileType = 'pdf';
  } else if (['.doc', '.docx'].includes(ext)) {
    fileType = 'document';
  } else if (['.xls', '.xlsx'].includes(ext)) {
    fileType = 'spreadsheet';
  } else if (['.ppt', '.pptx'].includes(ext)) {
    fileType = 'presentation';
  } else if (['.txt', '.csv'].includes(ext)) {
    fileType = 'text';
  } else if (['.zip', '.rar', '.7z'].includes(ext)) {
    fileType = 'archive';
  } else if (['.mp3', '.wav', '.ogg'].includes(ext)) {
    fileType = 'audio';
  } else if (['.mp4', '.webm', '.ogv'].includes(ext)) {
    fileType = 'video';
  }

  return {
    filename: file.filename,
    originalName: file.originalname,
    size: file.size,
    type: fileType,
    url: `/uploads/${file.filename}`,
    uploadDate: new Date().toISOString()
  };
};

module.exports = {
  upload,
  handleMulterError,
  getFileInfo
};
