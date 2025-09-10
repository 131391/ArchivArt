const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { requireAuth, requireAdminWeb, redirectIfAuthenticated } = require('../middleware/auth');
const { loadSettings } = require('../middleware/settings');
const authController = require('../controllers/authController');
const adminController = require('../controllers/adminController');
const mediaController = require('../controllers/mediaController');

// Root admin route - redirect to dashboard
router.get('/', (req, res) => {
  if (req.session.user) {
    res.redirect('/admin/dashboard');
  } else {
    res.redirect('/admin/login');
  }
});

// Login routes
router.get('/login', redirectIfAuthenticated, loadSettings, (req, res) => {
  res.render('admin/login', { 
    title: 'Login',
    email: req.query.email || '',
    layout: false
  });
});

router.post('/login', [
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required')
], authController.webLogin);

router.get('/logout', authController.webLogout);

// Dashboard
router.get('/dashboard', requireAdminWeb, loadSettings, adminController.dashboard);

// User management routes
router.get('/users', requireAdminWeb, loadSettings, adminController.getUsers);
router.get('/users/data', requireAdminWeb, adminController.getUsersData);
router.get('/users/:id', requireAdminWeb, adminController.getUser);
router.put('/users/:id', requireAdminWeb, adminController.updateUser);
router.post('/users/:id/block', requireAdminWeb, adminController.blockUser);
router.post('/users/:id/unblock', requireAdminWeb, adminController.unblockUser);
router.delete('/users/:id', requireAdminWeb, adminController.deleteUser);

// Media management routes
router.use('/media', require('./media'));

// Settings
router.get('/settings', requireAdminWeb, loadSettings, adminController.settings);
router.post('/settings', requireAdminWeb, adminController.updateSettings);


// Profile
router.get('/profile', requireAuth, loadSettings, adminController.profile);
router.post('/profile', requireAuth, adminController.updateProfile);

module.exports = router;
