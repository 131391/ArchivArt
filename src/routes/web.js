const express = require('express');
const router = express.Router();
const { loadSettings } = require('../middleware/settings');

// Home page
router.get('/', loadSettings, (req, res) => {
  res.render('index', { 
    title: 'ArchivArt - AR Media Platform',
    message: 'Welcome to ArchivArt'
  });
});

// API documentation
router.get('/api-docs', loadSettings, (req, res) => {
  res.render('api-docs', { 
    title: 'API Documentation',
    endpoints: [
      {
        method: 'POST',
        path: '/api/auth/register',
        description: 'Register a new user',
        headers: { 'Content-Type': 'application/json' },
        body: { name: 'string', email: 'string', password: 'string', role: 'string (optional: user|admin)' }
      },
      {
        method: 'POST',
        path: '/api/auth/login',
        description: 'Login user',
        headers: { 'Content-Type': 'application/json' },
        body: { email: 'string', password: 'string' }
      },
      {
        method: 'POST',
        path: '/api/auth/social-login',
        description: 'Social login (Google/Facebook)',
        headers: { 'Content-Type': 'application/json' },
        body: { provider: 'google|facebook', providerId: 'string', name: 'string', email: 'string' }
      },
      {
        method: 'GET',
        path: '/api/auth/profile',
        description: 'Get authenticated user profile',
        headers: { Authorization: 'Bearer <token>' }
      },
      {
        method: 'PUT',
        path: '/api/auth/profile',
        description: 'Update authenticated user profile',
        headers: { Authorization: 'Bearer <token>', 'Content-Type': 'application/json' },
        body: { name: 'string', email: 'string' }
      },
      {
        method: 'POST',
        path: '/api/media/match',
        description: 'Match a scanning image against stored media using perceptual hash (pHash). Supports multipart upload or JSON hash.',
        headers: { 'Content-Type': 'multipart/form-data' },
        body: { image: 'file (required if no hash)', threshold: 'number (optional, default 5)' }
      },
      {
        method: 'POST',
        path: '/api/media/match',
        description: 'Alternate request: Send a precomputed pHash instead of an image file.',
        headers: { 'Content-Type': 'application/json' },
        body: { hash: 'string (hex pHash)', threshold: 'number (optional, default 5)' }
      }
    ]
  });
});

module.exports = router;
