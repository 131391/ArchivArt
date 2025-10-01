// Suppress specific deprecation warnings
process.removeAllListeners('warning');
process.on('warning', (warning) => {
  if (warning.name === 'DeprecationWarning' && warning.message.includes('util.isArray')) {
    // Suppress util.isArray deprecation warnings from dependencies
    return;
  }
  // Log other warnings normally
  console.warn(warning.name + ': ' + warning.message);
});

const express = require('express');
const session = require('express-session');
const flash = require('connect-flash');
const expressLayouts = require('express-ejs-layouts');
const path = require('path');
require('dotenv').config();

// Security middleware
const {
  securityHeaders,
  cors,
  apiRateLimit,
  speedLimiter,
  requestLogger,
  mongoSanitize,
  hpp,
  xss
} = require('./middleware/security');

const app = express();
const PORT = process.env.PORT || 3000;
const IMAGE_BASE_URL = process.env.IMAGE_BASE_URL || `http://localhost:${PORT}`;

// Database connection
const db = require('./config/database');

// Security middleware (must be first)
app.use(securityHeaders);
app.use(cors);
app.use(requestLogger);

// Trust proxy for accurate IP addresses
app.set('trust proxy', 1);

// Body parsing middleware
app.use(express.json({ limit: '800mb' }));
app.use(express.urlencoded({ extended: true, limit: '800mb' }));

// Security middleware
app.use(mongoSanitize);
app.use(hpp);
app.use(xss);

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'archivart_secret',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    sameSite: 'strict'
  },
  name: 'archivart.sid' // Change default session name
}));

app.use(flash());

// View engine setup
app.use(expressLayouts);
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.set('layout', 'layout');
app.set('layout extractScripts', true);
app.set('layout extractStyles', true);

// Global variables for flash messages
app.use((req, res, next) => {
  res.locals.success_msg = req.flash('success_msg');
  res.locals.error_msg = req.flash('error_msg');
  res.locals.user = req.session.user || null;
  // Helper to build image URLs using a dynamic base (can be CDN/S3 later)
  res.locals.imageUrl = function imageUrl(relativePath) {
    if (!relativePath) return '';
    // If already absolute (e.g., starts with http), return as-is (for S3 URLs)
    if (/^https?:\/\//i.test(relativePath)) return relativePath;
    // Ensure single leading slash
    const normalized = relativePath.startsWith('/') ? relativePath : `/${relativePath}`;
    return `${IMAGE_BASE_URL}${normalized}`;
  };
  // Convenience: mediaUrl - handles both S3 URLs and local paths
  res.locals.mediaUrl = function mediaUrl(filePath) {
    if (!filePath) return '';
    // If it's already a full S3 URL, return as-is
    if (/^https?:\/\//i.test(filePath)) return filePath;
    // Otherwise, treat as relative path and add prefix
    return res.locals.imageUrl(`/uploads/media/${filePath}`);
  };
  // Convenience: scanningImageUrl - handles both S3 URLs and local paths
  res.locals.scanningImageUrl = function scanningImageUrl(filePath) {
    if (!filePath) return '';
    // If it's already a full S3 URL, return as-is
    if (/^https?:\/\//i.test(filePath)) return filePath;
    // Otherwise, treat as relative path and add prefix
    return res.locals.imageUrl(`/uploads/media/${filePath}`);
  };
  next();
});

// Layout middleware - set admin layout for admin routes (except login)
app.use((req, res, next) => {
  // Set admin layout for admin routes except login
  if (req.path.startsWith('/admin') && req.path !== '/admin/login') {
    res.locals.layout = 'layouts/admin';
    // Set default title for admin routes
    res.locals.title = res.locals.title || 'Admin';
  } else {
    res.locals.layout = 'layout';
    // Set default title for non-admin routes
    res.locals.title = res.locals.title || 'ArchivArt';
  }
  next();
});

// Rate limiting and speed limiting
app.use(speedLimiter);

// Routes with rate limiting
app.use('/api', apiRateLimit, require('./routes/api'));
app.use('/admin', require('./routes/admin'));
app.use('/', require('./routes/web'));

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  
  // Handle CORS errors specifically
  if (err.message && err.message.includes('Not allowed by CORS')) {
    return res.status(403).json({
      error: 'CORS Error',
      message: err.message,
      timestamp: new Date().toISOString()
    });
  }
  
  // Handle other errors
  if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
    // AJAX request - return JSON error
    res.status(500).json({
      error: 'Internal Server Error',
      message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong!',
      timestamp: new Date().toISOString()
    });
  } else {
    // Regular request - render error page
    res.status(500).render('error', { 
      message: 'Something went wrong!',
      error: process.env.NODE_ENV === 'development' ? err : {}
    });
  }
});

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    const smartImageService = require('./services/smartImageService');
    const serviceInfo = smartImageService.getServiceInfo();
    const cacheStats = smartImageService.getCacheStats();
    
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      services: {
        imageProcessing: serviceInfo,
        cache: cacheStats
      },
      version: '1.0.0'
    });
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Keep-alive endpoint for Render free tier
app.get('/keep-alive', (req, res) => {
  res.json({ 
    status: 'alive', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).render('error', { 
    message: 'Page not found',
    error: {}
  });
});

// Start server with timeout configurations for large file uploads
const server = app.listen(PORT, () => {
  // Start keep-alive service for production
  if (process.env.NODE_ENV === 'production') {
    const keepAlive = () => {
      setInterval(async () => {
        try {
          const response = await fetch(`http://localhost:${PORT}/keep-alive`);
        } catch (error) {
        }
      }, 14 * 60 * 1000); // Every 14 minutes
    };
    
    setTimeout(keepAlive, 60000); // Start after 1 minute
  }
});

// Configure server timeouts for large file uploads
server.timeout = 30 * 60 * 1000; // 30 minutes timeout
server.keepAliveTimeout = 30 * 60 * 1000; // 30 minutes keep-alive timeout
server.headersTimeout = 35 * 60 * 1000; // 35 minutes headers timeout

console.log(`Server started on port ${PORT}`);
console.log(`Server timeout configured: ${server.timeout / 1000 / 60} minutes`);
console.log(`Keep-alive timeout configured: ${server.keepAliveTimeout / 1000 / 60} minutes`);

module.exports = app;
