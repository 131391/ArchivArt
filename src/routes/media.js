const express = require('express');
const router = express.Router();
const MediaController = require('../controllers/mediaController');
const { requireAdminWeb, requireAdmin } = require('../middleware/auth');
const { combinedUpload } = require('../config/multer');
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
  combinedUpload,
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
  (req, res, next) => {
    // Validate ID parameter
    const id = parseInt(req.params.id);
    if (!id || id < 1 || !Number.isInteger(id)) {
      return res.status(400).json({
        success: false,
        message: 'Valid media ID is required'
      });
    }
    next();
  }
], MediaController.getMediaView);

// Media edit page
router.get('/edit/:id', [
  requireAdminWeb, 
  preventSQLInjection,
  (req, res, next) => {
    // Validate ID parameter
    const id = parseInt(req.params.id);
    if (!id || id < 1 || !Number.isInteger(id)) {
      return res.status(400).json({
        success: false,
        message: 'Valid media ID is required'
      });
    }
    next();
  }
], MediaController.showEditForm);

// Get single media (API)
router.get('/:id', [
  requireAdminWeb, 
  preventSQLInjection,
  (req, res, next) => {
    // Validate ID parameter
    const id = parseInt(req.params.id);
    if (!id || id < 1 || !Number.isInteger(id)) {
      return res.status(400).json({
        success: false,
        message: 'Valid media ID is required'
      });
    }
    next();
  }
], MediaController.getMedia);

// Update media
router.put('/:id', [
  requireAdminWeb, 
  strictRateLimit,
  scanningImageUpload,
  validateFileUpload,
  preventSQLInjection,
  (req, res, next) => {
    // Validate ID parameter
    const id = parseInt(req.params.id);
    if (!id || id < 1 || !Number.isInteger(id)) {
      return res.status(400).json({
        success: false,
        message: 'Valid media ID is required'
      });
    }
    next();
  },
  commonValidations.title,
  commonValidations.description,
  validateInput
], MediaController.updateMedia);

// Toggle media status
router.patch('/:id/toggle', [
  requireAdminWeb, 
  strictRateLimit,
  preventSQLInjection,
  (req, res, next) => {
    // Validate ID parameter
    const id = parseInt(req.params.id);
    if (!id || id < 1 || !Number.isInteger(id)) {
      return res.status(400).json({
        success: false,
        message: 'Valid media ID is required'
      });
    }
    next();
  }
], MediaController.toggleMediaStatus);

// Delete media
router.delete('/:id', [
  requireAdminWeb, 
  strictRateLimit,
  preventSQLInjection,
  (req, res, next) => {
    // Validate ID parameter
    const id = parseInt(req.params.id);
    if (!id || id < 1 || !Number.isInteger(id)) {
      return res.status(400).json({
        success: false,
        message: 'Valid media ID is required'
      });
    }
    next();
  }
], MediaController.deleteMedia);

module.exports = router;
