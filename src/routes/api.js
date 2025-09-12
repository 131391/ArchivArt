const express = require('express');
const router = express.Router();
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { upload } = require('../config/multer');
const authController = require('../controllers/authController');
const mediaController = require('../controllers/mediaController');
const { body } = require('express-validator');

// Authentication routes
router.post('/auth/register', [
  body('name').notEmpty().withMessage('Name is required'),
  body('username').optional().isLength({ min: 3, max: 50 }).withMessage('Username must be between 3 and 50 characters'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('mobile').optional().matches(/^\+[1-9]\d{1,14}$/).withMessage('Mobile must be in international format (e.g., +1234567890)'),
  body('role').optional().isIn(['user']).withMessage('Invalid role - only user role allowed')
], authController.register);

router.post('/auth/login', [
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required')
], authController.login);

router.post('/auth/social-login', [
  body('provider').isIn(['google', 'facebook']).withMessage('Invalid provider'),
  body('providerId').notEmpty().withMessage('Provider ID is required'),
  body('name').notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('profilePicture').optional().isURL().withMessage('Profile picture must be a valid URL'),
  body('mobile').optional().matches(/^\+[1-9]\d{1,14}$/).withMessage('Mobile must be in international format (e.g., +1234567890)')
], authController.socialLogin);

// Refresh token endpoint
router.post('/auth/refresh', authController.refreshToken);

// Logout endpoint
router.post('/auth/logout', authController.logout);

router.get('/auth/profile', authenticateToken, authController.getProfile);
router.put('/auth/profile', [
  authenticateToken,
  body('name').notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email is required')
], authController.updateProfile);

// Media routes - Public API for mobile applications
// Match scanning image using OpenCV feature matching (accepts multipart image upload)
router.post('/media/match', upload.single('image'), mediaController.matchScanningImage);

// Get media by ID (public endpoint for mobile apps)
router.get('/media/:id', mediaController.getMedia);

// Get all active media (public endpoint for mobile apps)
router.get('/media', mediaController.getAllActiveMedia);

module.exports = router;
