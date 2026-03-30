const express = require('express');
const router = express.Router();
const OcrController = require('../controllers/ocrController');
const { requireAdminWeb } = require('../middleware/auth');
const { addUserPermissions, hasModuleActionPermissionWeb } = require('../middleware/rbac');
const { preventSQLInjection } = require('../middleware/security');

router.get('/', [
    requireAdminWeb,
    addUserPermissions,
    hasModuleActionPermissionWeb('media', 'view'),
    preventSQLInjection
], OcrController.getOcrList);

router.get('/:id', [
    requireAdminWeb,
    addUserPermissions,
    hasModuleActionPermissionWeb('media', 'view'),
    preventSQLInjection
], OcrController.getOcrDetail);

router.post('/provider-config', [
    requireAdminWeb,
    addUserPermissions,
    hasModuleActionPermissionWeb('media', 'edit'),
    preventSQLInjection
], OcrController.updateProviderConfig);

module.exports = router;
