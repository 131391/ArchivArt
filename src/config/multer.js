const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;

// Ensure uploads directories exist
const ensureUploadDirs = async () => {
  const dirs = [
    'src/public/uploads/logos',
    'src/public/uploads/media'
  ];
  
  for (const dir of dirs) {
    try {
      await fs.access(dir);
    } catch (error) {
      await fs.mkdir(dir, { recursive: true });
      console.log(`Created directory: ${dir}`);
    }
  }
};

// Initialize directories
ensureUploadDirs();

// Logo upload configuration
const logoStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'src/public/uploads/logos/');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'logo-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const logoUpload = multer({
  storage: logoStorage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: function (req, file, cb) {
    console.log('Logo upload - File filter - originalname:', file.originalname);
    console.log('Logo upload - File filter - mimetype:', file.mimetype);
    
    const allowedTypes = /jpeg|jpg|png|svg/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    console.log('Logo upload - File filter - extname check:', extname);
    console.log('Logo upload - File filter - mimetype check:', mimetype);
    
    if (mimetype && extname) {
      console.log('Logo upload - File filter - accepted');
      return cb(null, true);
    } else {
      console.log('Logo upload - File filter - rejected');
      cb(new Error('Only image files (JPEG, PNG, SVG) are allowed'));
    }
  }
});

// Media upload configuration (for API routes)
const mediaStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'src/public/uploads/media/');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: mediaStorage,
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB limit for media files
  },
  fileFilter: function (req, file, cb) {
    const allowedTypes = /jpeg|jpg|png|gif|mp4|avi|mov|wmv|flv|webm|mp3|wav|ogg|m4a/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image, video, and audio files are allowed'));
    }
  }
});

// Scanning image upload configuration
const scanningImageStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'src/public/uploads/media/');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'scanning-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const scanningImageUpload = multer({
  storage: scanningImageStorage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit for scanning images
  },
  fileFilter: function (req, file, cb) {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files (JPEG, PNG, GIF, WebP) are allowed for scanning images'));
    }
  }
});

// Combined upload for media and scanning image
const combinedUpload = multer({
  storage: mediaStorage,
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

module.exports = {
  logoUpload: logoUpload.single('logo'),
  upload,
  scanningImageUpload: scanningImageUpload.single('scanning_image'),
  combinedUpload: combinedUpload.fields([
    { name: 'media_file', maxCount: 1 },
    { name: 'scanning_image', maxCount: 1 }
  ]),
  ensureUploadDirs
};