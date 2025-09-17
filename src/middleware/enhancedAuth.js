const jwt = require('jsonwebtoken');
const db = require('../config/database');
const crypto = require('crypto');

// Enhanced middleware to check if user is authenticated
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ 
      error: 'Access token required',
      timestamp: new Date().toISOString()
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Check if token is blacklisted
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const [blacklistedTokens] = await db.execute(
      'SELECT id FROM blacklisted_tokens WHERE token_hash = ?',
      [tokenHash]
    );
    
    if (blacklistedTokens.length > 0) {
      return res.status(401).json({ 
        error: 'Token has been revoked',
        timestamp: new Date().toISOString()
      });
    }
    
    // Get user from database
    const [users] = await db.execute(
      'SELECT id, name, email, role, username, mobile, is_active, is_blocked, is_verified, last_login_at FROM users WHERE id = ?',
      [decoded.userId]
    );

    if (users.length === 0) {
      return res.status(401).json({ 
        error: 'User not found',
        timestamp: new Date().toISOString()
      });
    }

    const user = users[0];

    if (!user.is_active || user.is_blocked) {
      return res.status(401).json({ 
        error: 'Account is inactive or blocked',
        timestamp: new Date().toISOString()
      });
    }

    // Check if user needs to re-authenticate (e.g., after password change)
    if (decoded.iat && user.last_login_at) {
      const tokenIssuedAt = new Date(decoded.iat * 1000);
      const lastLogin = new Date(user.last_login_at);
      
      if (tokenIssuedAt < lastLogin) {
        return res.status(401).json({ 
          error: 'Token invalidated due to recent login',
          code: 'TOKEN_INVALIDATED',
          timestamp: new Date().toISOString()
        });
      }
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        error: 'Token expired', 
        code: 'TOKEN_EXPIRED',
        message: 'Please refresh your token',
        timestamp: new Date().toISOString()
      });
    }
    
    console.error('Token verification error:', error);
    return res.status(403).json({ 
      error: 'Invalid token',
      timestamp: new Date().toISOString()
    });
  }
};

// Enhanced middleware to handle token refresh automatically
const authenticateWithRefresh = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ 
      error: 'Access token required',
      timestamp: new Date().toISOString()
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Check if token is blacklisted
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const [blacklistedTokens] = await db.execute(
      'SELECT id FROM blacklisted_tokens WHERE token_hash = ?',
      [tokenHash]
    );
    
    if (blacklistedTokens.length > 0) {
      return res.status(401).json({ 
        error: 'Token has been revoked',
        timestamp: new Date().toISOString()
      });
    }
    
    // Get user from database
    const [users] = await db.execute(
      'SELECT id, name, email, role, username, mobile, is_active, is_blocked, is_verified, last_login_at FROM users WHERE id = ?',
      [decoded.userId]
    );

    if (users.length === 0) {
      return res.status(401).json({ 
        error: 'User not found',
        timestamp: new Date().toISOString()
      });
    }

    const user = users[0];

    if (!user.is_active || user.is_blocked) {
      return res.status(401).json({ 
        error: 'Account is inactive or blocked',
        timestamp: new Date().toISOString()
      });
    }

    // Check if user needs to re-authenticate
    if (decoded.iat && user.last_login_at) {
      const tokenIssuedAt = new Date(decoded.iat * 1000);
      const lastLogin = new Date(user.last_login_at);
      
      if (tokenIssuedAt < lastLogin) {
        return res.status(401).json({ 
          error: 'Token invalidated due to recent login',
          code: 'TOKEN_INVALIDATED',
          timestamp: new Date().toISOString()
        });
      }
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
          message: 'Please provide refresh token',
          timestamp: new Date().toISOString()
        });
      }

      // Try to refresh the token
      try {
        const refreshDecoded = jwt.verify(refreshToken, process.env.JWT_SECRET);
        
        if (refreshDecoded.type !== 'refresh') {
          return res.status(401).json({ 
            error: 'Invalid refresh token type',
            timestamp: new Date().toISOString()
          });
        }

        // Check if refresh token exists in database
        const refreshTokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
        const [sessions] = await db.execute(
          'SELECT user_id, expires_at FROM user_sessions WHERE refresh_token = ? AND is_active = true',
          [refreshTokenHash]
        );

        if (sessions.length === 0) {
          return res.status(401).json({ 
            error: 'Invalid refresh token',
            timestamp: new Date().toISOString()
          });
        }

        const session = sessions[0];

        // Check if refresh token is expired
        if (new Date() > new Date(session.expires_at)) {
          await db.execute(
            'UPDATE user_sessions SET is_active = false WHERE refresh_token = ?',
            [refreshTokenHash]
          );
          return res.status(401).json({ 
            error: 'Refresh token expired',
            timestamp: new Date().toISOString()
          });
        }

        // Get user information
        const [users] = await db.execute(
          'SELECT id, name, email, role, username, mobile, is_active, is_blocked, is_verified, last_login_at FROM users WHERE id = ?',
          [session.user_id]
        );

        if (users.length === 0) {
          return res.status(401).json({ 
            error: 'User not found',
            timestamp: new Date().toISOString()
          });
        }

        const user = users[0];

        if (!user.is_active || user.is_blocked) {
          return res.status(401).json({ 
            error: 'Account is inactive or blocked',
            timestamp: new Date().toISOString()
          });
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
        console.error('Refresh token error:', refreshError);
        return res.status(401).json({ 
          error: 'Invalid refresh token',
          timestamp: new Date().toISOString()
        });
      }
    } else {
      console.error('Token verification error:', error);
      return res.status(403).json({ 
        error: 'Invalid token',
        timestamp: new Date().toISOString()
      });
    }
  }
};

// Enhanced middleware to check if user is admin
const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ 
      error: 'Admin access required',
      timestamp: new Date().toISOString()
    });
  }
  next();
};

// Enhanced middleware for web routes (session-based)
const requireAuth = (req, res, next) => {
  if (!req.session.user) {
    req.flash('error_msg', 'Please log in to access this page');
    return res.redirect('/admin/login');
  }
  
  // Check if user is still active
  if (!req.session.user.is_active || req.session.user.is_blocked) {
    req.session.destroy();
    req.flash('error_msg', 'Your account has been deactivated');
    return res.redirect('/admin/login');
  }
  
  next();
};

// Enhanced middleware for admin web routes
const requireAdminWeb = (req, res, next) => {
  if (!req.session.user || req.session.user.role !== 'admin') {
    req.flash('error_msg', 'Admin access required');
    return res.redirect('/admin/login');
  }
  
  // Check if user is still active
  if (!req.session.user.is_active || req.session.user.is_blocked) {
    req.session.destroy();
    req.flash('error_msg', 'Your account has been deactivated');
    return res.redirect('/admin/login');
  }
  
  next();
};

// Enhanced middleware to check if user is already logged in (for login page)
const redirectIfAuthenticated = (req, res, next) => {
  if (req.session.user) {
    return res.redirect('/admin/dashboard');
  }
  next();
};

// Middleware to log security events
const logSecurityEvent = (event, req, additionalData = {}) => {
  const logData = {
    event,
    timestamp: new Date().toISOString(),
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.get('User-Agent'),
    userId: req.user?.id || req.session?.user?.id,
    ...additionalData
  };
  
  console.warn('Security Event:', logData);
  
  // In production, you might want to send this to a security monitoring service
  // or store it in a dedicated security logs table
};

// Middleware to detect suspicious activity
const detectSuspiciousActivity = (req, res, next) => {
  const suspiciousPatterns = [
    /script/i,
    /javascript/i,
    /vbscript/i,
    /onload/i,
    /onerror/i,
    /<script/i,
    /<\/script/i,
    /union.*select/i,
    /drop.*table/i,
    /insert.*into/i,
    /delete.*from/i,
    /update.*set/i
  ];
  
  const checkForSuspiciousContent = (obj) => {
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'string') {
        for (const pattern of suspiciousPatterns) {
          if (pattern.test(value)) {
            logSecurityEvent('SUSPICIOUS_INPUT_DETECTED', req, {
              field: key,
              value: value.substring(0, 100), // Truncate for logging
              pattern: pattern.toString()
            });
            return true;
          }
        }
      } else if (typeof value === 'object' && value !== null) {
        if (checkForSuspiciousContent(value)) {
          return true;
        }
      }
    }
    return false;
  };
  
  if (checkForSuspiciousContent(req.body) || checkForSuspiciousContent(req.query)) {
    return res.status(400).json({ 
      error: 'Suspicious input detected',
      timestamp: new Date().toISOString()
    });
  }
  
  next();
};

module.exports = {
  authenticateToken,
  authenticateWithRefresh,
  requireAdmin,
  requireAuth,
  requireAdminWeb,
  redirectIfAuthenticated,
  logSecurityEvent,
  detectSuspiciousActivity
};
