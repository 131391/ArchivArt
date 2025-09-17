const express = require('express');
const router = express.Router();
const MediaController = require('../controllers/mediaController');
const { requireAdminWeb, requireAdmin } = require('../middleware/auth');
const { scanningImageUpload } = require('../config/multer');
const { 
  uploadRateLimit, 
  strictRateLimit,
  validateInput, 
  commonValidations, 
  validateFileUpload,
  preventSQLInjection 
} = require('../middleware/security');
const { body } = require('express-validator');

// Media list page
router.get('/', [
  requireAdminWeb, 
  preventSQLInjection
], MediaController.getMediaList);

// Media data for AJAX
router.get('/data', [
  requireAdminWeb, 
  preventSQLInjection
], MediaController.getMediaData);

// Upload form page
router.get('/upload', [
  requireAdminWeb, 
  preventSQLInjection
], MediaController.showUploadForm);

// Upload media
router.post('/upload', [
  requireAdminWeb, 
  uploadRateLimit,
  scanningImageUpload,
  validateFileUpload,
  preventSQLInjection,
  commonValidations.title,
  commonValidations.description,
  validateInput
], MediaController.uploadMedia);

// Media view page
router.get('/view/:id', [
  requireAdminWeb, 
  preventSQLInjection,
  body('id').isInt({ min: 1 }).withMessage('Valid media ID is required'),
  validateInput
], MediaController.getMediaView);

// Media edit page
router.get('/edit/:id', [
  requireAdminWeb, 
  preventSQLInjection,
  body('id').isInt({ min: 1 }).withMessage('Valid media ID is required'),
  validateInput
], MediaController.showEditForm);

// Get single media (API)
router.get('/:id', [
  requireAdminWeb, 
  preventSQLInjection,
  body('id').isInt({ min: 1 }).withMessage('Valid media ID is required'),
  validateInput
], MediaController.getMedia);

// Update media
router.put('/:id', [
  requireAdminWeb, 
  strictRateLimit,
  scanningImageUpload,
  validateFileUpload,
  preventSQLInjection,
  body('id').isInt({ min: 1 }).withMessage('Valid media ID is required'),
  commonValidations.title,
  commonValidations.description,
  validateInput
], MediaController.updateMedia);

// Toggle media status
router.patch('/:id/toggle', [
  requireAdminWeb, 
  strictRateLimit,
  preventSQLInjection,
  body('id').isInt({ min: 1 }).withMessage('Valid media ID is required'),
  validateInput
], MediaController.toggleMediaStatus);

// Delete media
router.delete('/:id', [
  requireAdminWeb, 
  strictRateLimit,
  preventSQLInjection,
  body('id').isInt({ min: 1 }).withMessage('Valid media ID is required'),
  validateInput
], MediaController.deleteMedia);

module.exports = router;
