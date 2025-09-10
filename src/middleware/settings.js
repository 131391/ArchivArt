const db = require('../config/database');

// Middleware to load settings and make them available to all admin pages
const loadSettings = async (req, res, next) => {
  try {
    const [settings] = await db.execute('SELECT * FROM settings LIMIT 1');
    req.settings = settings.length > 0 ? settings[0] : {
      site_name: 'ArchivArt',
      site_tagline: 'Your Digital Archive Solution',
      primary_color: '#4f46e5',
      logo_path: null
    };
    
    // Make settings available to all views
    res.locals.settings = req.settings;
    next();
  } catch (error) {
    console.error('Error loading settings:', error);
    // Use default settings if database error
    req.settings = {
      site_name: 'ArchivArt',
      site_tagline: 'Your Digital Archive Solution',
      primary_color: '#4f46e5',
      logo_path: null
    };
    res.locals.settings = req.settings;
    next();
  }
};

module.exports = { loadSettings };
