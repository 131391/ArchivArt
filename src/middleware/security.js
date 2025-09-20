const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const slowDown = require('express-slow-down');
const mongoSanitize = require('express-mongo-sanitize');
const hpp = require('hpp');
const xss = require('xss-clean');
const { body, validationResult } = require('express-validator');
const path = require('path');

// Security headers middleware
const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.tailwindcss.com", "https://cdnjs.cloudflare.com"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.tailwindcss.com"],
      scriptSrcAttr: ["'unsafe-inline'"], // Allow inline event handlers for table functionality
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'", "https://cdnjs.cloudflare.com"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'", "https:", "blob:"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false,
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
});

// CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, Postman, direct browser requests, etc.)
    if (!origin || origin === 'null') return callback(null, true);
    
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:3001',
      'https://archivart.vercel.app',
      'https://archivart.netlify.app',
      'https://archivart.onrender.com',
      process.env.FRONTEND_URL,
      process.env.ADMIN_URL
    ].filter(Boolean);
    
    // In development, be more permissive
    if (process.env.NODE_ENV === 'development') {
      // Allow localhost and 127.0.0.1 with any port in development
      if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
        return callback(null, true);
      }
      // Allow null origins in development (common with form submissions and fetch requests)
      if (origin === 'null') {
        return callback(null, true);
      }
    }
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`CORS blocked origin: ${origin}`);
      callback(new Error(`Not allowed by CORS: ${origin}`));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Refresh-Token', 'Accept', 'X-File-Name', 'X-File-Size', 'X-File-Type'],
  exposedHeaders: ['X-Total-Count', 'X-Page-Count', 'X-New-Access-Token', 'X-Token-Expires-In']
};

// Rate limiting configurations
const createRateLimit = (windowMs, max, message) => {
  return rateLimit({
    windowMs,
    max,
    message: {
      error: message,
      retryAfter: Math.ceil(windowMs / 1000)
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      res.status(429).json({
        error: message,
        retryAfter: Math.ceil(windowMs / 1000),
        timestamp: new Date().toISOString()
      });
    }
  });
};

// Different rate limits for different endpoints
const authRateLimit = createRateLimit(
  15 * 60 * 1000, // 15 minutes
  process.env.NODE_ENV === 'production' ? 5 : 20, // 5 attempts in production, 20 in development
  'Too many authentication attempts, please try again later'
);

const apiRateLimit = createRateLimit(
  15 * 60 * 1000, // 15 minutes
  100, // 100 requests per window
  'Too many API requests, please try again later'
);

const uploadRateLimit = createRateLimit(
  60 * 60 * 1000, // 1 hour
  process.env.NODE_ENV === 'production' ? 50 : 200, // 50 uploads/hour in production, 200 in development
  'Too many file uploads, please try again later'
);

const strictRateLimit = createRateLimit(
  15 * 60 * 1000, // 15 minutes
  3, // 3 attempts per window
  'Too many requests, please try again later'
);

// Speed limiting (slow down after certain number of requests)
const speedLimiter = slowDown({
  windowMs: 15 * 60 * 1000, // 15 minutes
  delayAfter: 50, // Allow 50 requests per window without delay
  delayMs: (used, req) => {
    const delayAfter = req.slowDown.limit;
    return (used - delayAfter) * 500;
  },
  maxDelayMs: 20000, // Maximum delay of 20 seconds
  skipSuccessfulRequests: true
});

// Input validation middleware
const validateInput = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array().map(err => ({
        field: err.path || err.param,
        message: err.msg,
        value: err.value
      }))
    });
  }
  next();
};

// Common validation rules
const commonValidations = {
  email: body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required')
    .isLength({ max: 255 })
    .withMessage('Email must be less than 255 characters'),
    
  password: body('password')
    .isLength({ min: 8, max: 128 })
    .withMessage('Password must be between 8 and 128 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),
    
  name: body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters')
    .matches(/^[a-zA-Z\s\-'\.]+$/)
    .withMessage('Name can only contain letters, spaces, hyphens, apostrophes, and periods'),
    
  username: body('username')
    .optional()
    .trim()
    .isLength({ min: 3, max: 50 })
    .withMessage('Username must be between 3 and 50 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers, and underscores'),
    
  mobile: body('mobile')
    .notEmpty()
    .withMessage('Mobile number is required')
    .matches(/^\+[1-9]\d{1,14}$/)
    .withMessage('Mobile must be in international format (e.g., +1234567890)'),
    
  title: body('title')
    .trim()
    .isLength({ min: 1, max: 255 })
    .withMessage('Title must be between 1 and 255 characters')
    .escape(),
    
  description: body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Description must be less than 1000 characters')
    .escape()
};

// File upload validation
const validateFileUpload = (req, res, next) => {
  if (!req.files || Object.keys(req.files).length === 0) {
    return res.status(400).json({ error: 'No files uploaded' });
  }
  
  const allowedImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  const allowedMediaTypes = ['video/mp4', 'video/webm', 'video/ogg', 'audio/mpeg', 'audio/wav', 'audio/ogg'];
  const maxFileSize = 50 * 1024 * 1024; // 50MB
  
  for (const [fieldName, files] of Object.entries(req.files)) {
    const fileArray = Array.isArray(files) ? files : [files];
    
    for (const file of fileArray) {
      // Check file size
      if (file.size > maxFileSize) {
        return res.status(400).json({ 
          error: `File ${file.originalname} is too large. Maximum size is 50MB` 
        });
      }
      
      // Check file type based on field name
      if (fieldName === 'image' && !allowedImageTypes.includes(file.mimetype)) {
        return res.status(400).json({ 
          error: `Invalid image type for ${file.originalname}. Allowed types: JPEG, PNG, GIF, WebP` 
        });
      }
      
      if (fieldName === 'media' && !allowedMediaTypes.includes(file.mimetype)) {
        return res.status(400).json({ 
          error: `Invalid media type for ${file.originalname}. Allowed types: MP4, WebM, OGG, MP3, WAV` 
        });
      }
      
      // Check for malicious file extensions
      const maliciousExtensions = ['.exe', '.bat', '.cmd', '.com', '.pif', '.scr', '.vbs', '.js', '.jar'];
      const fileExtension = path.extname(file.originalname).toLowerCase();
      if (maliciousExtensions.includes(fileExtension)) {
        return res.status(400).json({ 
          error: `File type ${fileExtension} is not allowed` 
        });
      }
    }
  }
  
  next();
};

// Single file upload validation for (req.file)
const validateSingleFileUpload = (req, res, next) => {
  if (!req.file) {
    return res.status(400).json({ 
      success: false,
      message: 'Image file is required. Please upload an image file.' 
    });
  }
  
  const allowedImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  const maxFileSize = 50 * 1024 * 1024; // 50MB
  
  // Check file size
  if (req.file.size > maxFileSize) {
    return res.status(400).json({ 
      success: false,
      message: `File ${req.file.originalname} is too large. Maximum size is 50MB` 
    });
  }
  
  // Check file type for image uploads
  if (!allowedImageTypes.includes(req.file.mimetype)) {
    return res.status(400).json({ 
      success: false,
      message: `Invalid image type for ${req.file.originalname}. Allowed types: JPEG, PNG, GIF, WebP` 
    });
  }
  
  // Check for malicious file extensions
  const maliciousExtensions = ['.exe', '.bat', '.cmd', '.com', '.pif', '.scr', '.vbs', '.js', '.jar'];
  const fileExtension = path.extname(req.file.originalname).toLowerCase();
  if (maliciousExtensions.includes(fileExtension)) {
    return res.status(400).json({ 
      success: false,
      message: `File type ${fileExtension} is not allowed` 
    });
  }
  
  next();
};

// SQL injection prevention middleware
const preventSQLInjection = (req, res, next) => {
  const sqlInjectionPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b)/i,
    /(\b(OR|AND)\s+\d+\s*=\s*\d+)/i,
    /(\b(OR|AND)\s+['"]\s*=\s*['"])/i,
    /(\bUNION\s+SELECT\b)/i,
    /(\bDROP\s+TABLE\b)/i,
    /(\bINSERT\s+INTO\b)/i,
    /(\bDELETE\s+FROM\b)/i,
    /(\bUPDATE\s+SET\b)/i
  ];
  
  const checkForSQLInjection = (obj) => {
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'string') {
        for (const pattern of sqlInjectionPatterns) {
          if (pattern.test(value)) {
            return true;
          }
        }
      } else if (typeof value === 'object' && value !== null) {
        if (checkForSQLInjection(value)) {
          return true;
        }
      }
    }
    return false;
  };
  
  if (checkForSQLInjection(req.body) || checkForSQLInjection(req.query) || checkForSQLInjection(req.params)) {
    return res.status(400).json({ 
      error: 'Invalid input detected',
      timestamp: new Date().toISOString()
    });
  }
  
  next();
};

// Request logging middleware
const requestLogger = (req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const logData = {
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent'),
      timestamp: new Date().toISOString()
    };
    
    // Log suspicious activities
    if (res.statusCode >= 400) {
      console.warn('Suspicious request:', logData);
    } else {
      console.log('Request:', logData);
    }
  });
  
  next();
};

// IP whitelist middleware (for admin routes)
const ipWhitelist = (allowedIPs = []) => {
  return (req, res, next) => {
    if (process.env.NODE_ENV === 'development') {
      return next(); // Skip in development
    }
    
    const clientIP = req.ip || req.connection.remoteAddress;
    
    if (allowedIPs.length === 0 || allowedIPs.includes(clientIP)) {
      next();
    } else {
      console.warn(`Blocked request from unauthorized IP: ${clientIP}`);
      res.status(403).json({ 
        error: 'Access denied',
        timestamp: new Date().toISOString()
      });
    }
  };
};

module.exports = {
  securityHeaders,
  cors: cors(corsOptions),
  authRateLimit,
  apiRateLimit,
  uploadRateLimit,
  strictRateLimit,
  speedLimiter,
  validateInput,
  commonValidations,
  validateFileUpload,
  validateSingleFileUpload,
  preventSQLInjection,
  requestLogger,
  ipWhitelist,
  mongoSanitize: mongoSanitize(),
  hpp: hpp(),
  xss: xss()
};
