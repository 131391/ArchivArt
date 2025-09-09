const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const db = require('../config/database');
const crypto = require('crypto');

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

      const { name, email, password, role = 'user' } = req.body;

      // Check if user already exists
      const [existingUsers] = await db.execute(
        'SELECT id FROM users WHERE email = ?',
        [email]
      );

      if (existingUsers.length > 0) {
        return res.status(400).json({ error: 'User already exists with this email' });
      }

      // Hash password
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      // Insert new user
      const [result] = await db.execute(
        'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
        [name, email, hashedPassword, role]
      );

      // Generate JWT token
      const token = jwt.sign(
        { userId: result.insertId, email, role },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );

      res.status(201).json({
        message: 'User registered successfully',
        token,
        user: {
          id: result.insertId,
          name,
          email,
          role
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

      // Find user by email
      const [users] = await db.execute(
        'SELECT id, name, email, password, role, is_active, is_blocked FROM users WHERE email = ?',
        [email]
      );

      if (users.length === 0) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const user = users[0];

      // Check if account is active
      if (!user.is_active || user.is_blocked) {
        return res.status(401).json({ error: 'Account is inactive or blocked' });
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Generate JWT token
      const token = jwt.sign(
        { userId: user.id, email: user.email, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );

      res.json({
        message: 'Login successful',
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role
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
          layout: false
        });
      }

      // Set session
      req.session.user = {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      };

      req.flash('success_msg', 'Login successful');
      res.redirect('/admin/dashboard');
    } catch (error) {
      console.error('Web login error:', error);
      req.flash('error_msg', 'Internal server error');
      res.render('admin/login', { 
        title: 'Login',
        email: req.body.email,
        layout: false
      });
    }
  }

  // Social login (Google/Facebook)
  async socialLogin(req, res) {
    try {
      const { provider, providerId, name, email } = req.body;

      // Check if user exists with this provider
      const [existingUsers] = await db.execute(
        'SELECT id, name, email, role, is_active, is_blocked FROM users WHERE provider_id = ? AND auth_provider = ?',
        [providerId, provider]
      );

      let user;

      if (existingUsers.length > 0) {
        user = existingUsers[0];
      } else {
        // Check if user exists with same email
        const [emailUsers] = await db.execute(
          'SELECT id FROM users WHERE email = ?',
          [email]
        );

        if (emailUsers.length > 0) {
          // Update existing user with provider info
          await db.execute(
            'UPDATE users SET auth_provider = ?, provider_id = ? WHERE email = ?',
            [provider, providerId, email]
          );

          const [updatedUsers] = await db.execute(
            'SELECT id, name, email, role, is_active, is_blocked FROM users WHERE email = ?',
            [email]
          );
          user = updatedUsers[0];
        } else {
          // Create new user
          const [result] = await db.execute(
            'INSERT INTO users (name, email, auth_provider, provider_id, role) VALUES (?, ?, ?, ?, ?)',
            [name, email, provider, providerId, 'user']
          );

          user = {
            id: result.insertId,
            name,
            email,
            role: 'user',
            is_active: true,
            is_blocked: false
          };
        }
      }

      // Check if account is active
      if (!user.is_active || user.is_blocked) {
        return res.status(401).json({ error: 'Account is inactive or blocked' });
      }

      // Generate JWT token
      const token = jwt.sign(
        { userId: user.id, email: user.email, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );

      res.json({
        message: 'Social login successful',
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role
        }
      });
    } catch (error) {
      console.error('Social login error:', error);
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
}

module.exports = new AuthController();
