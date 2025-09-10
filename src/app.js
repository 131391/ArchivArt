const express = require('express');
const session = require('express-session');
const flash = require('connect-flash');
const expressLayouts = require('express-ejs-layouts');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const IMAGE_BASE_URL = process.env.IMAGE_BASE_URL || `http://localhost:${PORT}`;

// Database connection
const db = require('./config/database');

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'archivart_secret',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 } // 24 hours
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
    // If already absolute (e.g., starts with http), return as-is
    if (/^https?:\/\//i.test(relativePath)) return relativePath;
    // Ensure single leading slash
    const normalized = relativePath.startsWith('/') ? relativePath : `/${relativePath}`;
    return `${IMAGE_BASE_URL}${normalized}`;
  };
  // Convenience: mediaUrl to prefix uploads/media
  res.locals.mediaUrl = function mediaUrl(filename) {
    if (!filename) return '';
    return res.locals.imageUrl(`/uploads/media/${filename}`);
  };
  // Convenience: scanningImageUrl to prefix uploads/media
  res.locals.scanningImageUrl = function scanningImageUrl(filename) {
    if (!filename) return '';
    return res.locals.imageUrl(`/uploads/media/${filename}`);
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

// Routes
app.use('/api', require('./routes/api'));
app.use('/admin', require('./routes/admin'));
app.use('/', require('./routes/web'));

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).render('error', { 
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err : {}
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).render('error', { 
    message: 'Page not found',
    error: {}
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Admin panel: http://localhost:${PORT}/admin`);
  console.log(`API base: http://localhost:${PORT}/api`);
});

module.exports = app;
