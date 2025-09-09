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
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('role').optional().isIn(['user', 'admin']).withMessage('Invalid role')
], authController.register);

router.post('/auth/login', [
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required')
], authController.login);

router.post('/auth/social-login', [
  body('provider').isIn(['google', 'facebook']).withMessage('Invalid provider'),
  body('providerId').notEmpty().withMessage('Provider ID is required'),
  body('name').notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email is required')
], authController.socialLogin);

router.get('/auth/profile', authenticateToken, authController.getProfile);
router.put('/auth/profile', [
  authenticateToken,
  body('name').notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email is required')
], authController.updateProfile);

// Media routes - handled by admin routes
// Public: match scanning image by pHash (accepts multipart image or JSON with {hash})
router.post('/media/match', upload.single('image'), mediaController.matchScanningImage);

module.exports = router;
