const express = require('express');
const router = express.Router();
const MediaController = require('../controllers/mediaController');
const { requireAdminWeb, requireAdmin } = require('../middleware/auth');
const { addUserPermissions, hasModuleActionPermission, hasModuleActionPermissionWeb } = require('../middleware/rbac');
const { combinedUpload, textOnlyParser } = require('../config/multer');
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
  addUserPermissions,
  hasModuleActionPermissionWeb('media', 'view'),
  preventSQLInjection
], MediaController.getMediaList);

// Media data for AJAX
router.get('/data', [
  requireAdminWeb,
  addUserPermissions,
  hasModuleActionPermissionWeb('media', 'view'),
  preventSQLInjection
], MediaController.getMediaData);

// Upload form page
router.get('/upload', [
  requireAdminWeb,
  addUserPermissions,
  hasModuleActionPermissionWeb('media', 'upload'),
  preventSQLInjection
], MediaController.showUploadForm);

// Upload media
router.post('/upload', [
  requireAdminWeb,
  addUserPermissions,
  hasModuleActionPermissionWeb('media', 'upload'),
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
  addUserPermissions,
  hasModuleActionPermissionWeb('media', 'view'),
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
  addUserPermissions,
  hasModuleActionPermissionWeb('media', 'edit'),
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

// Update media text fields only (title and description) - no file uploads
router.put('/:id/text', [
  requireAdminWeb,
  addUserPermissions,
  hasModuleActionPermissionWeb('media', 'edit'),
  strictRateLimit,
  textOnlyParser, // Parse form data but reject any files
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
], MediaController.updateMediaText);

// Update media (rejects file uploads - use /:id/text for text-only updates)
router.put('/:id', [
  requireAdminWeb,
  addUserPermissions,
  hasModuleActionPermissionWeb('media', 'edit'),
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
  },
  commonValidations.title,
  commonValidations.description,
  validateInput
], MediaController.updateMedia);

// Toggle media status
router.patch('/:id/toggle', [
  requireAdminWeb,
  addUserPermissions,
  hasModuleActionPermissionWeb('media', 'edit'),
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
  addUserPermissions,
  hasModuleActionPermissionWeb('media', 'delete'),
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
