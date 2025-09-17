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


module.exports = router;
