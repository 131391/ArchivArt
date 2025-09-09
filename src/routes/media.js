const express = require('express');
const router = express.Router();
const MediaController = require('../controllers/mediaController');
const { requireAdminWeb, requireAdmin } = require('../middleware/auth');

// Media list page
router.get('/', requireAdminWeb, MediaController.getMediaList);

// Media data for AJAX
router.get('/data', requireAdminWeb, MediaController.getMediaData);

// Upload form page
router.get('/upload', requireAdminWeb, MediaController.showUploadForm);

// Upload media
router.post('/upload', requireAdminWeb, MediaController.uploadMedia);

// Media view page
router.get('/view/:id', requireAdminWeb, MediaController.getMediaView);

// Get single media (API)
router.get('/:id', requireAdminWeb, MediaController.getMedia);

// Update media
router.put('/:id', requireAdminWeb, MediaController.updateMedia);

// Toggle media status
router.patch('/:id/toggle', requireAdminWeb, MediaController.toggleMediaStatus);

// Delete media
router.delete('/:id', requireAdminWeb, MediaController.deleteMedia);

module.exports = router;
