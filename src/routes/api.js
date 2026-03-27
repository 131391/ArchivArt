const express = require('express');
const router = express.Router();
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { mediaUpload, profileUpload, textOnlyParser, apiFileUpload } = require('../config/multer');
const authController = require('../controllers/authController');
const mediaController = require('../controllers/mediaController');
const uploadController = require('../controllers/uploadController');
const ocrProviderService = require('../services/ocrProviderService');
const db = require('../config/database');
const fs = require('fs');
const os = require('os');
const path = require('path');
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
  textOnlyParser, // Parse FormData fields without file uploads
  preventSQLInjection,
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters')
    .matches(/^[a-zA-Z0-9\s\-'\.]+$/)
    .withMessage('Name can only contain letters, numbers, spaces, hyphens, apostrophes, and periods'),
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

// OCR provider-aware test endpoint (uses selected provider from admin settings/runtime env)
router.post('/ocr/extract-auto', [
  apiRateLimit,
  preventSQLInjection,
  body('image_path').optional().isString().notEmpty().withMessage('image_path must be a non-empty string'),
  body('image_url').optional().isURL({ require_protocol: true }).withMessage('image_url must be a valid URL'),
  body('language').optional().isString(),
  body('preprocess').optional().isBoolean(),
  body('auto_rotate').optional().isBoolean(),
  body('improve_readability').optional().isBoolean(),
  body('post_process').optional().isBoolean(),
  validateInput
], async (req, res) => {
  let tempImagePath = null;
  try {
    const { image_path, image_url, language, preprocess, auto_rotate, improve_readability, post_process } = req.body;
    const options = {};
    let imagePathToProcess = image_path;

    if (!image_path && !image_url) {
      return res.status(400).json({
        success: false,
        error: 'Either image_path or image_url is required'
      });
    }

    if (image_url) {
      const response = await fetch(image_url);
      if (!response.ok) {
        return res.status(400).json({
          success: false,
          error: `Unable to download image_url (status: ${response.status})`
        });
      }

      const contentType = (response.headers.get('content-type') || '').toLowerCase();
      if (!contentType.startsWith('image/')) {
        return res.status(400).json({
          success: false,
          error: 'image_url must point to an image resource'
        });
      }

      const tempFileName = `ocr-url-${Date.now()}-${Math.random().toString(36).slice(2)}.img`;
      tempImagePath = path.join(os.tmpdir(), tempFileName);
      const buffer = Buffer.from(await response.arrayBuffer());
      fs.writeFileSync(tempImagePath, buffer);
      imagePathToProcess = tempImagePath;
    }

    // Sync runtime provider config from persisted settings for reliable API behavior.
    try {
      const [rows] = await db.execute(
        'SELECT ocr_provider, ocr_fallback_provider FROM settings ORDER BY id ASC LIMIT 1'
      );
      if (rows.length) {
        process.env.OCR_PROVIDER = (rows[0].ocr_provider || process.env.OCR_PROVIDER || 'tesseract').trim().toLowerCase();
        process.env.OCR_FALLBACK_PROVIDER = (rows[0].ocr_fallback_provider || '').trim().toLowerCase();
      }
    } catch (settingsError) {
      // Non-fatal: continue with current runtime values.
    }

    if (language !== undefined) options.language = language;
    if (preprocess !== undefined) options.preprocess = preprocess;
    if (auto_rotate !== undefined) options.auto_rotate = auto_rotate;
    if (improve_readability !== undefined) options.improve_readability = improve_readability;
    if (post_process !== undefined) options.post_process = post_process;

    const result = await ocrProviderService.extractText(imagePathToProcess, options);
    const providerConfig = ocrProviderService.getConfig();

    return res.status(result?.success ? 200 : 400).json({
      success: Boolean(result?.success),
      provider: result?.provider || providerConfig.provider,
      provider_config: providerConfig,
      text: result?.text || '',
      confidence: result?.confidence || 0,
      language: result?.language || (language || null),
      word_count: result?.wordCount || 0,
      character_count: result?.characterCount || 0,
      processing_time: result?.processingTime || null,
      error: result?.error || null,
      fallback_error: result?.fallbackError || null
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message || 'OCR extraction failed'
    });
  } finally {
    if (tempImagePath && fs.existsSync(tempImagePath)) {
      try {
        fs.unlinkSync(tempImagePath);
      } catch (_) {
        // Non-fatal temp file cleanup failure.
      }
    }
  }
});

// File upload endpoint - upload image or video to S3 and get URL
router.post('/upload', [
  uploadRateLimit,
  apiFileUpload,
  validateSingleFileUpload,
  preventSQLInjection
], uploadController.uploadFile);

module.exports = router;
