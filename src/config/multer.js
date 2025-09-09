const multer = require('multer');
const path = require('path');
const crypto = require('crypto');

// Configure multer for temporary file storage
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  // Allow images
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  }
  // Allow videos
  else if (file.mimetype.startsWith('video/')) {
    cb(null, true);
  }
  // Allow audio
  else if (file.mimetype.startsWith('audio/')) {
    cb(null, true);
  }
  else {
    cb(new Error('Only image, video, and audio files are allowed!'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB limit
  }
});

// Generate unique filename
const generateFileName = (originalName) => {
  const ext = path.extname(originalName);
  const name = crypto.randomBytes(16).toString('hex');
  return `${name}${ext}`;
};

module.exports = {
  upload,
  generateFileName
};
