const jwt = require('jsonwebtoken');
const db = require('../config/database');

// Middleware to check if user is authenticated
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Get user from database
    const [users] = await db.execute(
      'SELECT id, name, email, role, is_active, is_blocked FROM users WHERE id = ?',
      [decoded.userId]
    );

    if (users.length === 0) {
      return res.status(401).json({ error: 'User not found' });
    }

    const user = users[0];

    if (!user.is_active || user.is_blocked) {
      return res.status(401).json({ error: 'Account is inactive or blocked' });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
};

// Middleware to check if user is admin
const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

// Middleware for web routes (session-based)
const requireAuth = (req, res, next) => {
  if (!req.session.user) {
    req.flash('error_msg', 'Please log in to access this page');
    return res.redirect('/admin/login');
  }
  next();
};

// Middleware for admin web routes
const requireAdminWeb = (req, res, next) => {
  if (!req.session.user || req.session.user.role !== 'admin') {
    req.flash('error_msg', 'Admin access required');
    return res.redirect('/admin/login');
  }
  next();
};

// Middleware to check if user is already logged in (for login page)
const redirectIfAuthenticated = (req, res, next) => {
  if (req.session.user) {
    return res.redirect('/admin/dashboard');
  }
  next();
};

module.exports = {
  authenticateToken,
  requireAdmin,
  requireAuth,
  requireAdminWeb,
  redirectIfAuthenticated
};
