const jwt = require('jsonwebtoken');
const db = require('../config/database');
const crypto = require('crypto');

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
      'SELECT id, name, email, role, username, mobile, is_active, is_blocked, is_verified FROM users WHERE id = ?',
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
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        error: 'Token expired', 
        code: 'TOKEN_EXPIRED',
        message: 'Please refresh your token' 
      });
    }
    return res.status(403).json({ error: 'Invalid token' });
  }
};

// Middleware to handle token refresh automatically
const authenticateWithRefresh = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Get user from database
    const [users] = await db.execute(
      'SELECT id, name, email, role, username, mobile, is_active, is_blocked, is_verified FROM users WHERE id = ?',
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
    if (error.name === 'TokenExpiredError') {
      // Check if refresh token is provided
      const refreshToken = req.headers['x-refresh-token'];
      
      if (!refreshToken) {
        return res.status(401).json({ 
          error: 'Token expired', 
          code: 'TOKEN_EXPIRED',
          message: 'Please provide refresh token' 
        });
      }

      // Try to refresh the token
      try {
        const refreshDecoded = jwt.verify(refreshToken, process.env.JWT_SECRET);
        
        if (refreshDecoded.type !== 'refresh') {
          return res.status(401).json({ error: 'Invalid refresh token type' });
        }

        // Check if refresh token exists in database
        const crypto = require('crypto');
        const refreshTokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
        const [sessions] = await db.execute(
          'SELECT user_id, expires_at FROM user_sessions WHERE refresh_token = ? AND is_active = true',
          [refreshTokenHash]
        );

        if (sessions.length === 0) {
          return res.status(401).json({ error: 'Invalid refresh token' });
        }

        const session = sessions[0];

        // Check if refresh token is expired
        if (new Date() > new Date(session.expires_at)) {
          await db.execute(
            'UPDATE user_sessions SET is_active = false WHERE refresh_token = ?',
            [refreshTokenHash]
          );
          return res.status(401).json({ error: 'Refresh token expired' });
        }

        // Get user information
        const [users] = await db.execute(
          'SELECT id, name, email, role, username, mobile, is_active, is_blocked, is_verified FROM users WHERE id = ?',
          [session.user_id]
        );

        if (users.length === 0) {
          return res.status(401).json({ error: 'User not found' });
        }

        const user = users[0];

        if (!user.is_active || user.is_blocked) {
          return res.status(401).json({ error: 'Account is inactive or blocked' });
        }

        // Generate new access token
        const newAccessToken = jwt.sign(
          { userId: user.id, email: user.email, role: user.role, username: user.username },
          process.env.JWT_SECRET,
          { expiresIn: '15m' }
        );

        // Update session with new access token
        await db.execute(
          'UPDATE user_sessions SET session_token = ?, last_activity_at = CURRENT_TIMESTAMP WHERE refresh_token = ?',
          [crypto.createHash('sha256').update(newAccessToken).digest('hex'), refreshTokenHash]
        );

        // Set new token in response header
        res.setHeader('X-New-Access-Token', newAccessToken);
        res.setHeader('X-Token-Expires-In', '900'); // 15 minutes

        req.user = user;
        next();
      } catch (refreshError) {
        return res.status(401).json({ error: 'Invalid refresh token' });
      }
    } else {
      return res.status(403).json({ error: 'Invalid token' });
    }
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
  authenticateWithRefresh,
  requireAdmin,
  requireAuth,
  requireAdminWeb,
  redirectIfAuthenticated
};
