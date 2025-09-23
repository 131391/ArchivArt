const express = require('express');
const router = express.Router();
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { mediaUpload, profileUpload } = require('../config/multer');
const authController = require('../controllers/authController');
const mediaController = require('../controllers/mediaController');
const { body } = require('express-validator');
const { 
  authRateLimit, 
  apiRateLimit,
  uploadRateLimit, 
  strictRateLimit,
  validateInput, 
  commonValidations, 
  validateFileUpload,
  validateSingleFileUpload,
  preventSQLInjection 
} = require('../middleware/security');

// Authentication routes with enhanced security
router.post('/auth/register', [
  authRateLimit,
  preventSQLInjection,
  commonValidations.name,
  commonValidations.username,
  commonValidations.email,
  commonValidations.password,
  commonValidations.mobile,
  body('role').optional().isIn(['user']).withMessage('Invalid role - only user role allowed'),
  validateInput
], authController.register);

router.post('/auth/login', [
  authRateLimit,
  preventSQLInjection,
  commonValidations.email,
  body('password').notEmpty().withMessage('Password is required'),
  validateInput
], authController.login);

router.post('/auth/social-login', [
  authRateLimit,
  preventSQLInjection,
  body('provider').isIn(['google', 'facebook']).withMessage('Invalid provider'),
  body('providerId').notEmpty().withMessage('Provider ID is required'),
  commonValidations.name,
  commonValidations.email,
  body('profilePicture').optional().isURL().withMessage('Profile picture must be a valid URL'),
  commonValidations.mobile,
  validateInput
], authController.socialLogin);

// Refresh token endpoint
router.post('/auth/refresh', [
  strictRateLimit,
  preventSQLInjection
], authController.refreshToken);

// Logout endpoint
router.post('/auth/logout', [
  strictRateLimit,
  preventSQLInjection
], authController.logout);

// Username availability check endpoint
router.get('/auth/check-username', [
  apiRateLimit,
  preventSQLInjection
], authController.checkUsernameAvailability);


router.get('/auth/profile', [
  authenticateToken,
  preventSQLInjection
], authController.getProfile);

router.put('/auth/profile', [
  authenticateToken,
  preventSQLInjection,
  commonValidations.name,
  body('profile_picture').optional().isString().withMessage('Profile picture must be a valid base64 string'),
  body('mobile').optional().isMobilePhone().withMessage('Invalid mobile number format'),
  validateInput
], authController.updateProfile);

// Media routes - Public API for mobile applications
// Match scanning image using OpenCV feature matching (accepts multipart image upload)
router.post('/media/match', [
  uploadRateLimit,
  mediaUpload.single('image'),
  validateSingleFileUpload,
  preventSQLInjection
], mediaController.matchScanningImage);

// Get media by ID (public endpoint for mobile apps)
router.get('/media/:id', [
  preventSQLInjection,
  body('id').isInt({ min: 1 }).withMessage('Valid media ID is required'),
  validateInput
], mediaController.getMedia);

// Get all active media (public endpoint for mobile apps)
router.get('/media', [
  preventSQLInjection
], mediaController.getAllActiveMedia);

module.exports = router;
