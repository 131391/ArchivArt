const multer = require('multer');
const path = require('path');

// For S3 uploads, we'll use memory storage instead of disk storage
// This allows us to upload files directly to S3 without saving them locally first
const memoryStorage = multer.memoryStorage();

// File filter for allowed file types
const fileFilter = (req, file, cb) => {
  const allowedTypes = {
    'image/jpeg': 'image',
    'image/jpg': 'image',
    'image/png': 'image',
    'image/gif': 'image',
    'image/webp': 'image',
    'video/mp4': 'video',
    'video/avi': 'video',
    'video/mov': 'video',
    'video/wmv': 'video',
    'video/webm': 'video',
    'video/quicktime': 'video',
    'audio/mp3': 'audio',
    'audio/mpeg': 'audio',
    'audio/wav': 'audio',
    'audio/m4a': 'audio',
    'audio/ogg': 'audio',
    'audio/aac': 'audio',
    'audio/flac': 'audio',
    'audio/wma': 'audio'
  };

  if (allowedTypes[file.mimetype]) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only images, videos, and audio files are allowed.'), false);
  }
};

// Common multer configuration for S3 uploads
const commonUploadConfig = {
  storage: memoryStorage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB limit
  }
};

// Media upload configuration (for S3)
const mediaUpload = multer(commonUploadConfig);

// Logo upload configuration (S3 storage for logos)
const logoUpload = multer({
  storage: memoryStorage,
  fileFilter: function (req, file, cb) {
    console.log('Logo upload - File filter - originalname:', file.originalname);
    console.log('Logo upload - File filter - mimetype:', file.mimetype);
    
    const allowedExtensions = /\.(jpeg|jpg|png|svg)$/i;
    const allowedMimeTypes = /^image\/(jpeg|jpg|png|svg\+xml)$/;
    
    const extname = allowedExtensions.test(file.originalname);
    const mimetype = allowedMimeTypes.test(file.mimetype);
    
    console.log('Logo upload - File filter - extname check:', extname);
    console.log('Logo upload - File filter - mimetype check:', mimetype);
    
    if (mimetype && extname) {
      console.log('Logo upload - File filter - accepted');
      return cb(null, true);
    } else {
      console.log('Logo upload - File filter - rejected');
      cb(new Error('Only image files (JPEG, PNG, SVG) are allowed'));
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

// Profile picture upload configuration (for S3)
const profileUpload = multer({
  storage: memoryStorage,
  fileFilter: function (req, file, cb) {
    console.log('Profile picture upload - File filter - originalname:', file.originalname);
    console.log('Profile picture upload - File filter - mimetype:', file.mimetype);
    
    const allowedTypes = /jpeg|jpg|png|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    console.log('Profile picture upload - File filter - extname check:', extname);
    console.log('Profile picture upload - File filter - mimetype check:', mimetype);
    
    if (mimetype && extname) {
      console.log('Profile picture upload - File filter - accepted');
      return cb(null, true);
    } else {
      console.log('Profile picture upload - File filter - rejected');
      cb(new Error('Only image files (JPEG, PNG, WebP) are allowed for profile pictures'));
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

// Scanning image upload configuration (for S3)
const scanningImageUpload = multer({
  storage: memoryStorage,
  fileFilter: function (req, file, cb) {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files (JPEG, PNG, GIF, WebP) are allowed for scanning images'));
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit for scanning images
  }
});

// Combined upload for media and scanning image (for S3)
const combinedUpload = multer({
  storage: memoryStorage,
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB limit for media files
  },
  fileFilter: function (req, file, cb) {
    console.log('Combined upload - File filter - fieldname:', file.fieldname);
    console.log('Combined upload - File filter - originalname:', file.originalname);
    console.log('Combined upload - File filter - mimetype:', file.mimetype);
    
    if (file.fieldname === 'media_file') {
      // Media file validation
      const allowedExtensions = /\.(jpeg|jpg|png|gif|mp4|avi|mov|wmv|flv|webm|mp3|wav|ogg|m4a)$/i;
      const allowedMimeTypes = /^(image|video|audio)\//;
      
      const extname = allowedExtensions.test(file.originalname);
      const mimetype = allowedMimeTypes.test(file.mimetype);
      
      console.log('Media file validation:', {
        filename: file.originalname,
        mimetype: file.mimetype,
        extname: extname,
        mimetypeValid: mimetype
      });
      
      if (mimetype && extname) {
        console.log('Combined upload - Media file accepted');
        return cb(null, true);
      } else {
        console.log('Combined upload - Media file rejected');
        cb(new Error('Only image, video, and audio files are allowed for media files'));
      }
    } else if (file.fieldname === 'scanning_image') {
      // Scanning image validation
      const allowedExtensions = /\.(jpeg|jpg|png|gif|webp)$/i;
      const allowedMimeTypes = /^image\//;
      
      const extname = allowedExtensions.test(file.originalname);
      const mimetype = allowedMimeTypes.test(file.mimetype);
      
      console.log('Scanning image validation:', {
        filename: file.originalname,
        mimetype: file.mimetype,
        extname: extname,
        mimetypeValid: mimetype
      });
      
      if (mimetype && extname) {
        console.log('Combined upload - Scanning image accepted');
        return cb(null, true);
      } else {
        console.log('Combined upload - Scanning image rejected');
        cb(new Error('Only image files (JPEG, PNG, GIF, WebP) are allowed for scanning images'));
      }
    } else {
      console.log('Combined upload - Unknown field name:', file.fieldname);
      cb(new Error('Unexpected field: ' + file.fieldname));
    }
  }
});

// Text-only form parser (no file uploads expected)
const textOnlyParser = multer({
  storage: memoryStorage,
  fileFilter: (req, file, cb) => {
    // Reject any files for text-only updates
    cb(new Error('File uploads are not allowed for text-only updates. Use the regular update endpoint if you need to upload files.'), false);
  }
});

module.exports = {
  mediaUpload,
  logoUpload: logoUpload.single('logo'),
  profileUpload: profileUpload.single('profile_picture'),
  scanningImageUpload: scanningImageUpload.single('scanning_image'),
  combinedUpload: combinedUpload.fields([
    { name: 'media_file', maxCount: 1 },
    { name: 'scanning_image', maxCount: 1 }
  ]),
  textOnlyParser: textOnlyParser.none(), // Parse form data but expect no files
  commonUploadConfig
};