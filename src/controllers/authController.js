const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const db = require('../config/database');
const crypto = require('crypto');
const SecurityService = require('../services/securityService');
const { securityUtils } = require('../config/security');

// Standalone function for generating username suggestions
async function generateUsernameSuggestions(baseUsername) {
  console.log('Starting suggestion generation for:', baseUsername);
  const suggestions = [];
  const maxSuggestions = 5;

  try {
    // Strategy 1: Add numbers
    for (let i = 1; i <= 99 && suggestions.length < maxSuggestions; i++) {
      const suggestion = `${baseUsername}${i}`;
      if (suggestion.length <= 50) {
        try {
          const [existing] = await db.execute(
            'SELECT id FROM users WHERE username = ?',
            [suggestion]
          );
          if (existing.length === 0) {
            suggestions.push(suggestion);
            console.log('Added suggestion:', suggestion);
          }
        } catch (dbError) {
          console.error('Database error in suggestion generation:', dbError);
          throw dbError;
        }
      }
    }
  } catch (error) {
    console.error('Error in strategy 1:', error);
    throw error;
  }

  // Strategy 2: Add random numbers
  if (suggestions.length < maxSuggestions) {
    for (let i = 0; i < 20 && suggestions.length < maxSuggestions; i++) {
      const randomNum = Math.floor(Math.random() * 1000) + 100;
      const suggestion = `${baseUsername}${randomNum}`;
      if (suggestion.length <= 50) {
        const [existing] = await db.execute(
          'SELECT id FROM users WHERE username = ?',
          [suggestion]
        );
        if (existing.length === 0 && !suggestions.includes(suggestion)) {
          suggestions.push(suggestion);
        }
      }
    }
  }

  // Strategy 3: Add common suffixes
  const suffixes = ['_user', '_official', '_real', '_new', '_pro'];
  for (const suffix of suffixes) {
    if (suggestions.length >= maxSuggestions) break;
    
    const suggestion = `${baseUsername}${suffix}`;
    if (suggestion.length <= 50) {
      const [existing] = await db.execute(
        'SELECT id FROM users WHERE username = ?',
        [suggestion]
      );
      if (existing.length === 0 && !suggestions.includes(suggestion)) {
        suggestions.push(suggestion);
      }
    }
  }

  // Strategy 4: Add year
  const currentYear = new Date().getFullYear();
  const suggestion = `${baseUsername}${currentYear}`;
  if (suggestion.length <= 50 && suggestions.length < maxSuggestions) {
    const [existing] = await db.execute(
      'SELECT id FROM users WHERE username = ?',
      [suggestion]
    );
    if (existing.length === 0 && !suggestions.includes(suggestion)) {
      suggestions.push(suggestion);
    }
  }

  return suggestions.slice(0, maxSuggestions);
}

class AuthController {
  // Register new user
  async register(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const { name, username, email, password, mobile, role = 'user' } = req.body;

      // Ensure only user role can be created through API registration
      if (role !== 'user') {
        return res.status(400).json({ error: 'Invalid role - only user role allowed' });
      }

      // Check if user already exists by email
      const [existingUsersByEmail] = await db.execute(
        'SELECT id FROM users WHERE email = ?',
        [email]
      );

      if (existingUsersByEmail.length > 0) {
        return res.status(400).json({ error: 'User already exists with this email' });
      }

      // Check if username is taken (if provided)
      if (username) {
        const [existingUsersByUsername] = await db.execute(
          'SELECT id FROM users WHERE username = ?',
          [username]
        );

        if (existingUsersByUsername.length > 0) {
          return res.status(400).json({ error: 'Username is already taken' });
        }
      }

      // Check if mobile is taken (if provided)
      if (mobile) {
        const [existingUsersByMobile] = await db.execute(
          'SELECT id FROM users WHERE mobile = ?',
          [mobile]
        );

        if (existingUsersByMobile.length > 0) {
          return res.status(400).json({ error: 'Mobile number is already registered' });
        }
      }

      // Validate password strength
      const passwordValidation = securityUtils.validatePasswordStrength(password);
      if (!passwordValidation.isValid) {
        return res.status(400).json({
          error: 'Password does not meet security requirements',
          details: passwordValidation.errors
        });
      }

      // Hash password with higher salt rounds for better security
      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      // Generate unique username if not provided
      let finalUsername = username;
      if (!finalUsername) {
        const baseUsername = name.toLowerCase().replace(/[^a-z0-9]/g, '');
        let counter = 1;
        finalUsername = baseUsername;
        
        while (true) {
          const [existingUsername] = await db.execute(
            'SELECT id FROM users WHERE username = ?',
            [finalUsername]
          );
          
          if (existingUsername.length === 0) {
            break;
          }
          
          finalUsername = `${baseUsername}${counter}`;
          counter++;
        }
      }

      // Insert new user
      const [result] = await db.execute(
        'INSERT INTO users (name, username, email, password, mobile, role, auth_provider, is_verified) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [name, finalUsername, email, hashedPassword, mobile, role, 'local', false]
      );

      // Log security event
      await SecurityService.logSecurityEvent('user_registered', req, {
        userId: result.insertId,
        email,
        username: finalUsername
      });

      // Generate JWT access token (short-lived)
      const accessToken = jwt.sign(
        { userId: result.insertId, email, role, username: finalUsername },
        process.env.JWT_SECRET,
        { expiresIn: '15m' } // Short-lived access token
      );

      // Generate refresh token (long-lived)
      const refreshToken = jwt.sign(
        { userId: result.insertId, type: 'refresh' },
        process.env.JWT_SECRET,
        { expiresIn: '30d' } // Long-lived refresh token
      );

      // Store refresh token in database
      const refreshTokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
      await db.execute(
        'INSERT INTO user_sessions (user_id, session_token, refresh_token, expires_at, is_active) VALUES (?, ?, ?, DATE_ADD(NOW(), INTERVAL 30 DAY), true)',
        [result.insertId, crypto.createHash('sha256').update(accessToken).digest('hex'), refreshTokenHash]
      );

      res.status(201).json({
        message: 'User registered successfully',
        accessToken,
        refreshToken,
        expiresIn: 900, // 15 minutes in seconds
        user: {
          id: result.insertId,
          name,
          username: finalUsername,
          email,
          mobile,
          role,
          is_verified: false
        }
      });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Login user
  async login(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const { email, password } = req.body;
      const clientIP = securityUtils.getClientIP(req);

      // Check if IP is blocked
      const isIPBlocked = await SecurityService.isIPBlocked(clientIP);
      if (isIPBlocked) {
        await SecurityService.logSecurityEvent('blocked_ip_login_attempt', req, { email, ip: clientIP });
        return res.status(403).json({ 
          error: 'Access denied - IP address is blocked',
          timestamp: new Date().toISOString()
        });
      }

      // Check if email is blocked
      const isEmailBlocked = await SecurityService.isEmailBlocked(email);
      if (isEmailBlocked) {
        await SecurityService.logSecurityEvent('blocked_email_login_attempt', req, { email, ip: clientIP });
        return res.status(403).json({ 
          error: 'Access denied - Email address is blocked',
          timestamp: new Date().toISOString()
        });
      }

      // Find user by email
      const [users] = await db.execute(
        'SELECT id, name, email, password, role, is_active, is_blocked FROM users WHERE email = ?',
        [email]
      );

      if (users.length === 0) {
        await SecurityService.recordFailedLogin(email, req);
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const user = users[0];

      // Check if account is active
      if (!user.is_active || user.is_blocked) {
        await SecurityService.recordFailedLogin(email, req);
        return res.status(401).json({ error: 'Account is inactive or blocked' });
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        await SecurityService.recordFailedLogin(email, req);
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Clear failed login attempts on successful login
      await SecurityService.clearFailedLogins(email, clientIP);

      // Generate JWT access token (short-lived)
      const accessToken = jwt.sign(
        { userId: user.id, email: user.email, role: user.role, username: user.username },
        process.env.JWT_SECRET,
        { expiresIn: '15m' } // Short-lived access token
      );

      // Generate refresh token (long-lived)
      const refreshToken = jwt.sign(
        { userId: user.id, type: 'refresh' },
        process.env.JWT_SECRET,
        { expiresIn: '30d' } // Long-lived refresh token
      );

      // Store refresh token in database
      const refreshTokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
      await db.execute(
        'INSERT INTO user_sessions (user_id, session_token, refresh_token, expires_at, is_active, last_activity_at, ip_address, user_agent) VALUES (?, ?, ?, DATE_ADD(NOW(), INTERVAL 30 DAY), true, CURRENT_TIMESTAMP, ?, ?)',
        [user.id, crypto.createHash('sha256').update(accessToken).digest('hex'), refreshTokenHash, clientIP, req.get('User-Agent')]
      );

      // Update user login tracking
      await db.execute(
        'UPDATE users SET last_login_at = CURRENT_TIMESTAMP, login_count = login_count + 1, last_activity_at = CURRENT_TIMESTAMP WHERE id = ?',
        [user.id]
      );

      // Log successful login
      await SecurityService.logSecurityEvent('successful_login', req, {
        userId: user.id,
        email: user.email,
        ip: clientIP
      });

      res.json({
        message: 'Login successful',
        accessToken,
        refreshToken,
        expiresIn: 900, // 15 minutes in seconds
        user: {
          id: user.id,
          name: user.name,
          username: user.username,
          email: user.email,
          mobile: user.mobile,
          role: user.role,
          is_verified: user.is_verified
        }
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Web login (session-based)
  async webLogin(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        req.flash('error_msg', 'Please check your input');
        return res.render('admin/login', { 
          title: 'Login',
          email: req.body.email,
          error_msg: req.flash('error_msg'),
          layout: false
        });
      }

      const { email, password } = req.body;

      // Find user by email
      const [users] = await db.execute(
        'SELECT id, name, email, password, role, is_active, is_blocked FROM users WHERE email = ?',
        [email]
      );

      if (users.length === 0) {
        req.flash('error_msg', 'Invalid credentials');
        return res.render('admin/login', { 
          title: 'Login',
          email: req.body.email,
          error_msg: req.flash('error_msg'),
          layout: false
        });
      }

      const user = users[0];

      // Check if account is active
      if (!user.is_active || user.is_blocked) {
        req.flash('error_msg', 'Account is inactive or blocked');
        return res.render('admin/login', { 
          title: 'Login',
          email: req.body.email,
          error_msg: req.flash('error_msg'),
          layout: false
        });
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        req.flash('error_msg', 'Invalid credentials');
        return res.render('admin/login', { 
          title: 'Login',
          email: req.body.email,
          error_msg: req.flash('error_msg'),
          layout: false
        });
      }

      // Check if user has admin role
      if (user.role !== 'admin') {
        req.flash('error_msg', 'Access denied. Admin privileges required.');
        return res.render('admin/login', { 
          title: 'Login',
          email: req.body.email,
          error_msg: req.flash('error_msg'),
          layout: false
        });
      }

      // Set session
      req.session.user = {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        is_active: user.is_active,
        is_blocked: user.is_blocked
      };

      // Set login success flash message
      req.flash('success_msg', 'Login successful! Welcome to ArchivArt Admin Panel');
      res.redirect('/admin/dashboard');
    } catch (error) {
      console.error('Web login error:', error);
      req.flash('error_msg', 'Internal server error');
      res.render('admin/login', { 
        title: 'Login',
        email: req.body.email,
        error_msg: req.flash('error_msg'),
        layout: false
      });
    }
  }

  // Social login (Google/Facebook)
  async socialLogin(req, res) {
    try {
      const { provider, providerId, name, email, profilePicture, mobile } = req.body;

      // Check if user exists with this provider
      const [existingUsers] = await db.execute(
        'SELECT id, name, username, email, mobile, role, is_active, is_blocked, is_verified FROM users WHERE provider_id = ? AND auth_provider = ?',
        [providerId, provider]
      );

      let user;

      if (existingUsers.length > 0) {
        user = existingUsers[0];
        
        // Update last login
        await db.execute(
          'UPDATE users SET last_login_at = CURRENT_TIMESTAMP, login_count = login_count + 1 WHERE id = ?',
          [user.id]
        );
      } else {
        // Check if user exists with same email
        const [emailUsers] = await db.execute(
          'SELECT id, username FROM users WHERE email = ?',
          [email]
        );

        if (emailUsers.length > 0) {
          // Update existing user with provider info
          const existingUser = emailUsers[0];
          const providerData = {
            profilePicture,
            providerId,
            connectedAt: new Date().toISOString()
          };

          await db.execute(
            'UPDATE users SET auth_provider = ?, provider_id = ?, provider_data = ?, profile_picture = ?, last_login_at = CURRENT_TIMESTAMP, login_count = login_count + 1 WHERE email = ?',
            [provider, providerId, JSON.stringify(providerData), profilePicture, email]
          );

          const [updatedUsers] = await db.execute(
            'SELECT id, name, username, email, mobile, role, is_active, is_blocked, is_verified FROM users WHERE email = ?',
            [email]
          );
          user = updatedUsers[0];
        } else {
          // Create new user with Google auth
          const baseUsername = name.toLowerCase().replace(/[^a-z0-9]/g, '');
          let finalUsername = baseUsername;
          let counter = 1;
          
          // Generate unique username
          while (true) {
            const [existingUsername] = await db.execute(
              'SELECT id FROM users WHERE username = ?',
              [finalUsername]
            );
            
            if (existingUsername.length === 0) {
              break;
            }
            
            finalUsername = `${baseUsername}${counter}`;
            counter++;
          }

          const providerData = {
            profilePicture,
            providerId,
            connectedAt: new Date().toISOString()
          };

          const [result] = await db.execute(
            'INSERT INTO users (name, username, email, mobile, auth_provider, provider_id, provider_data, profile_picture, role, is_verified, last_login_at, login_count) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, 1)',
            [name, finalUsername, email, mobile, provider, providerId, JSON.stringify(providerData), profilePicture, 'user', true]
          );

          user = {
            id: result.insertId,
            name,
            username: finalUsername,
            email,
            mobile,
            role: 'user',
            is_active: true,
            is_blocked: false,
            is_verified: true
          };
        }
      }

      // Check if account is active
      if (!user.is_active || user.is_blocked) {
        return res.status(401).json({ error: 'Account is inactive or blocked' });
      }

      // Generate JWT access token (short-lived)
      const accessToken = jwt.sign(
        { userId: user.id, email: user.email, role: user.role, username: user.username },
        process.env.JWT_SECRET,
        { expiresIn: '15m' } // Short-lived access token
      );

      // Generate refresh token (long-lived)
      const refreshToken = jwt.sign(
        { userId: user.id, type: 'refresh' },
        process.env.JWT_SECRET,
        { expiresIn: '30d' } // Long-lived refresh token
      );

      // Store refresh token in database
      const refreshTokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
      await db.execute(
        'INSERT INTO user_sessions (user_id, session_token, refresh_token, expires_at, is_active, last_activity_at) VALUES (?, ?, ?, DATE_ADD(NOW(), INTERVAL 30 DAY), true, CURRENT_TIMESTAMP)',
        [user.id, crypto.createHash('sha256').update(accessToken).digest('hex'), refreshTokenHash]
      );

      res.json({
        message: 'Social login successful',
        accessToken,
        refreshToken,
        expiresIn: 900, // 15 minutes in seconds
        user: {
          id: user.id,
          name: user.name,
          username: user.username,
          email: user.email,
          mobile: user.mobile,
          role: user.role,
          is_verified: user.is_verified,
          profile_picture: user.profile_picture
        }
      });
    } catch (error) {
      console.error('Social login error:', error);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Refresh token endpoint
  async refreshToken(req, res) {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        return res.status(401).json({ error: 'Refresh token required' });
      }

      // Verify refresh token
      const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);
      
      if (decoded.type !== 'refresh') {
        return res.status(401).json({ error: 'Invalid token type' });
      }

      // Check if refresh token exists in database
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
        // Mark session as inactive
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

      res.json({
        message: 'Token refreshed successfully',
        accessToken: newAccessToken,
        expiresIn: 900, // 15 minutes in seconds
        user: {
          id: user.id,
          name: user.name,
          username: user.username,
          email: user.email,
          mobile: user.mobile,
          role: user.role,
          is_verified: user.is_verified
        }
      });
    } catch (error) {
      console.error('Refresh token error:', error);
      res.status(401).json({ error: 'Invalid refresh token' });
    }
  }

  // Logout (API)
  async logout(req, res) {
    try {
      const { refreshToken } = req.body;

      if (refreshToken) {
        // Invalidate refresh token
        const refreshTokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
        await db.execute(
          'UPDATE user_sessions SET is_active = false WHERE refresh_token = ?',
          [refreshTokenHash]
        );
      }

      res.json({ message: 'Logout successful' });
    } catch (error) {
      console.error('Logout error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Logout (web)
  async webLogout(req, res) {
    req.session.destroy((err) => {
      if (err) {
        console.error('Logout error:', err);
        req.flash('error_msg', 'Error logging out');
        return res.redirect('/admin/dashboard');
      }
      res.redirect('/admin/login');
    });
  }

  // Get current user profile
  async getProfile(req, res) {
    try {
      const [users] = await db.execute(
        'SELECT id, name, email, role, created_at FROM users WHERE id = ?',
        [req.user.id]
      );

      if (users.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }

      res.json({ user: users[0] });
    } catch (error) {
      console.error('Get profile error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Update user profile
  async updateProfile(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const { name, email } = req.body;
      const userId = req.user.id;

      // Check if email is already taken by another user
      const [existingUsers] = await db.execute(
        'SELECT id FROM users WHERE email = ? AND id != ?',
        [email, userId]
      );

      if (existingUsers.length > 0) {
        return res.status(400).json({ error: 'Email already taken' });
      }

      // Update user
      await db.execute(
        'UPDATE users SET name = ?, email = ? WHERE id = ?',
        [name, email, userId]
      );

      res.json({ message: 'Profile updated successfully' });
    } catch (error) {
      console.error('Update profile error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Check username availability and suggest alternatives
  async checkUsernameAvailability(req, res) {
    try {
      const { username } = req.query;

      if (!username) {
        return res.status(400).json({ 
          error: 'Username is required',
          available: false 
        });
      }

      // Validate username format
      const usernameRegex = /^[a-zA-Z0-9_]{3,50}$/;
      if (!usernameRegex.test(username)) {
        return res.status(400).json({
          error: 'Username must be 3-50 characters long and contain only letters, numbers, and underscores',
          available: false,
          suggestions: []
        });
      }

      // Check if username exists
      const [existingUsers] = await db.execute(
        'SELECT id FROM users WHERE username = ?',
        [username]
      );

      const isAvailable = existingUsers.length === 0;

      // Generate suggestions if username is taken
      let suggestions = [];
      if (!isAvailable) {
        try {
          console.log('Generating suggestions for username:', username);
          suggestions = await generateUsernameSuggestions(username);
          console.log('Generated suggestions:', suggestions);
        } catch (suggestionError) {
          console.error('Error generating suggestions:', suggestionError);
          console.error('Suggestion error stack:', suggestionError.stack);
          // Continue without suggestions if generation fails
          suggestions = [];
        }
      }

      res.json({
        username: username,
        available: isAvailable,
        suggestions: suggestions,
        message: isAvailable ? 'Username is available' : 'Username is already taken'
      });

    } catch (error) {
      console.error('Username availability check error:', error);
      res.status(500).json({ 
        error: 'Internal server error',
        available: false 
      });
    }
  }

  // Generate username suggestions
  async generateUsernameSuggestions(baseUsername) {
    console.log('Starting suggestion generation for:', baseUsername);
    const suggestions = [];
    const maxSuggestions = 5;

    try {
      // Strategy 1: Add numbers
      for (let i = 1; i <= 99 && suggestions.length < maxSuggestions; i++) {
        const suggestion = `${baseUsername}${i}`;
        if (suggestion.length <= 50) {
          try {
            const [existing] = await db.execute(
              'SELECT id FROM users WHERE username = ?',
              [suggestion]
            );
            if (existing.length === 0) {
              suggestions.push(suggestion);
              console.log('Added suggestion:', suggestion);
            }
          } catch (dbError) {
            console.error('Database error in suggestion generation:', dbError);
            throw dbError;
          }
        }
      }
    } catch (error) {
      console.error('Error in strategy 1:', error);
      throw error;
    }

    // Strategy 2: Add random numbers
    if (suggestions.length < maxSuggestions) {
      for (let i = 0; i < 20 && suggestions.length < maxSuggestions; i++) {
        const randomNum = Math.floor(Math.random() * 1000) + 100;
        const suggestion = `${baseUsername}${randomNum}`;
        if (suggestion.length <= 50) {
          const [existing] = await db.execute(
            'SELECT id FROM users WHERE username = ?',
            [suggestion]
          );
          if (existing.length === 0 && !suggestions.includes(suggestion)) {
            suggestions.push(suggestion);
          }
        }
      }
    }

    // Strategy 3: Add common suffixes
    const suffixes = ['_user', '_official', '_real', '_new', '_pro'];
    for (const suffix of suffixes) {
      if (suggestions.length >= maxSuggestions) break;
      
      const suggestion = `${baseUsername}${suffix}`;
      if (suggestion.length <= 50) {
        const [existing] = await db.execute(
          'SELECT id FROM users WHERE username = ?',
          [suggestion]
        );
        if (existing.length === 0 && !suggestions.includes(suggestion)) {
          suggestions.push(suggestion);
        }
      }
    }

    // Strategy 4: Add year
    const currentYear = new Date().getFullYear();
    const suggestion = `${baseUsername}${currentYear}`;
    if (suggestion.length <= 50 && suggestions.length < maxSuggestions) {
      const [existing] = await db.execute(
        'SELECT id FROM users WHERE username = ?',
        [suggestion]
      );
      if (existing.length === 0 && !suggestions.includes(suggestion)) {
        suggestions.push(suggestion);
      }
    }

    return suggestions.slice(0, maxSuggestions);
  }

}

module.exports = new AuthController();
