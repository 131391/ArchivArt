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

// Registration page
router.get('/register', loadSettings, (req, res) => {
  res.render('admin/register', { 
    title: 'Register - ArchivArt',
    layout: false
  });
});

module.exports = router;
