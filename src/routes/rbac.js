const express = require('express');
const { body, param, query } = require('express-validator');
const router = express.Router();
const RBACController = require('../controllers/rbacController');
const { hasPermission, hasModuleActionPermissionWeb, hasModuleActionPermissionWebWeb, hasModulePermission, addUserPermissions } = require('../middleware/rbac');

// ==================== DASHBOARD ====================

// Get RBAC dashboard stats
router.get('/dashboard',
    addUserPermissions,
    hasModuleActionPermissionWeb('dashboard', 'view'),
    RBACController.getDashboard
);

// ==================== ROLES ====================

// Get all roles
router.get('/roles', 
    addUserPermissions,
    hasModuleActionPermissionWeb('rbac', 'view'),
    [
        query('page').optional().isInt({ min: 1 }),
        query('limit').optional().isInt({ min: 1, max: 100 }),
        query('search').optional().isString().trim(),
        query('is_active').optional().isIn(['0', '1'])
    ],
    RBACController.getRoles
);

// Get role by ID
router.get('/roles/:id',
    addUserPermissions,
    hasModuleActionPermissionWeb('rbac', 'view'),
    [
        param('id').isInt({ min: 1 })
    ],
    RBACController.getRole
);

// Create new role
router.post('/roles',
    addUserPermissions,
    hasModuleActionPermissionWeb('rbac', 'create'),
    [
        body('name')
            .notEmpty()
            .withMessage('Role name is required')
            .isLength({ min: 2, max: 50 })
            .withMessage('Role name must be between 2 and 50 characters')
            .matches(/^[a-z][a-z0-9._-]*$/)
            .withMessage('Role name must start with a letter and contain only lowercase letters, numbers, dots, underscores, and hyphens'),
        body('display_name')
            .notEmpty()
            .withMessage('Display name is required')
            .isLength({ min: 2, max: 100 })
            .withMessage('Display name must be between 2 and 100 characters'),
        body('description')
            .optional()
            .isLength({ max: 500 })
            .withMessage('Description must not exceed 500 characters'),
        body('permissions')
            .optional()
            .isArray()
            .withMessage('Permissions must be an array'),
        body('permissions.*')
            .optional()
            .isInt({ min: 1 })
            .withMessage('Each permission must be a valid ID')
    ],
    RBACController.createRole
);

// Update role
router.put('/roles/:id',
    addUserPermissions,
    hasModuleActionPermissionWeb('rbac', 'update'),
    [
        param('id').isInt({ min: 1 }),
        body('name')
            .notEmpty()
            .withMessage('Role name is required')
            .isLength({ min: 2, max: 50 })
            .withMessage('Role name must be between 2 and 50 characters')
            .matches(/^[a-z][a-z0-9._-]*$/)
            .withMessage('Role name must start with a letter and contain only lowercase letters, numbers, dots, underscores, and hyphens'),
        body('display_name')
            .notEmpty()
            .withMessage('Display name is required')
            .isLength({ min: 2, max: 100 })
            .withMessage('Display name must be between 2 and 100 characters'),
        body('description')
            .optional()
            .isLength({ max: 500 })
            .withMessage('Description must not exceed 500 characters'),
        body('is_active')
            .optional()
            .isIn([0, 1, '0', '1'])
            .withMessage('is_active must be 0 or 1'),
        body('permissions')
            .optional()
            .isArray()
            .withMessage('Permissions must be an array'),
        body('permissions.*')
            .optional()
            .isInt({ min: 1 })
            .withMessage('Each permission must be a valid ID')
    ],
    RBACController.updateRole
);

// Delete role
router.delete('/roles/:id',
    addUserPermissions,
    hasModuleActionPermissionWeb('rbac', 'delete'),
    [
        param('id').isInt({ min: 1 })
    ],
    RBACController.deleteRole
);

// ==================== PERMISSIONS ====================

// Get all permissions
router.get('/permissions',
    addUserPermissions,
    hasModuleActionPermissionWeb('rbac', 'view'),
    RBACController.getPermissions
);

// Get permission by ID
router.get('/permissions/:id',
    addUserPermissions,
    hasModuleActionPermissionWeb('rbac', 'view'),
    [
        param('id').isInt({ min: 1 })
    ],
    RBACController.getPermission
);

// Create new permission
router.post('/permissions',
    addUserPermissions,
    hasModuleActionPermissionWeb('rbac', 'create'),
    [
        body('name')
            .notEmpty()
            .withMessage('Permission name is required')
            .isLength({ min: 2, max: 100 })
            .withMessage('Permission name must be between 2 and 100 characters')
            .matches(/^[a-z][a-z0-9._-]*$/)
            .withMessage('Permission name must start with a letter and contain only lowercase letters, numbers, dots, underscores, and hyphens'),
        body('display_name')
            .notEmpty()
            .withMessage('Display name is required')
            .isLength({ min: 2, max: 100 })
            .withMessage('Display name must be between 2 and 100 characters'),
        body('description')
            .optional()
            .isLength({ max: 500 })
            .withMessage('Description must not exceed 500 characters'),
        body('module')
            .notEmpty()
            .withMessage('Module is required')
            .isLength({ min: 2, max: 50 })
            .withMessage('Module must be between 2 and 50 characters')
    ],
    RBACController.createPermission
);

// Update permission
router.put('/permissions/:id',
    addUserPermissions,
    hasModuleActionPermissionWeb('rbac', 'update'),
    [
        param('id').isInt({ min: 1 }),
        body('name')
            .notEmpty()
            .withMessage('Permission name is required')
            .isLength({ min: 2, max: 100 })
            .withMessage('Permission name must be between 2 and 100 characters')
            .matches(/^[a-z][a-z0-9._-]*$/)
            .withMessage('Permission name must start with a letter and contain only lowercase letters, numbers, dots, underscores, and hyphens'),
        body('display_name')
            .notEmpty()
            .withMessage('Display name is required')
            .isLength({ min: 2, max: 100 })
            .withMessage('Display name must be between 2 and 100 characters'),
        body('description')
            .optional()
            .isLength({ max: 500 })
            .withMessage('Description must not exceed 500 characters'),
        body('module')
            .notEmpty()
            .withMessage('Module is required')
            .isLength({ min: 2, max: 50 })
            .withMessage('Module must be between 2 and 50 characters'),
        body('is_active')
            .optional()
            .isIn([0, 1, '0', '1'])
            .withMessage('is_active must be 0 or 1')
    ],
    RBACController.updatePermission
);

// Delete permission
router.delete('/permissions/:id',
    addUserPermissions,
    hasModuleActionPermissionWeb('rbac', 'delete'),
    [
        param('id').isInt({ min: 1 })
    ],
    RBACController.deletePermission
);

// Get all modules (for permissions system)
router.get('/modules-list',
    addUserPermissions,
    hasModuleActionPermissionWeb('rbac', 'view'),
    RBACController.getModules
);

// ==================== MODULE ACTIONS MANAGEMENT ====================

// Get module action by ID
router.get('/module-actions/:id',
    addUserPermissions,
    hasModuleActionPermissionWeb('rbac', 'view'),
    RBACController.getModuleActionById
);

// Create module action
router.post('/module-actions',
    addUserPermissions,
    hasModuleActionPermissionWeb('rbac', 'create'),
    RBACController.createModuleAction
);

// Update module action
router.put('/module-actions/:id',
    addUserPermissions,
    hasModuleActionPermissionWeb('rbac', 'update'),
    RBACController.updateModuleAction
);

// Delete module action
router.delete('/module-actions/:id',
    addUserPermissions,
    hasModuleActionPermissionWeb('rbac', 'delete'),
    RBACController.deleteModuleAction
);

// Restore/Activate module action
router.patch('/module-actions/:id/restore',
    addUserPermissions,
    hasModuleActionPermissionWeb('rbac', 'update'),
    RBACController.restoreModuleAction
);

// Get all module actions
router.get('/module-actions',
    addUserPermissions,
    hasModuleActionPermissionWeb('rbac', 'view'),
    RBACController.getModuleActions
);

// Check for duplicate permission
router.get('/permissions/check-duplicate',
    addUserPermissions,
    hasModuleActionPermissionWeb('rbac', 'view'),
    RBACController.checkDuplicatePermission
);

// ==================== MODULE MANAGEMENT ====================

// Get all modules
router.get('/modules',
    addUserPermissions,
    hasModuleActionPermissionWeb('rbac', 'view'),
    RBACController.getModules
);

// Get module by ID
router.get('/modules/:id',
    addUserPermissions,
    hasModuleActionPermissionWeb('rbac', 'view'),
    [
        param('id').isInt({ min: 1 }).withMessage('Module ID must be a positive integer')
    ],
    RBACController.getModuleById
);

// Create module
router.post('/modules',
    addUserPermissions,
    hasModuleActionPermissionWeb('rbac', 'create'),
    [
        body('name').notEmpty().withMessage('Module name is required'),
        body('display_name').notEmpty().withMessage('Display name is required'),
        body('description').optional(),
        body('icon').optional(),
        body('route').optional(),
        body('order_index').optional().isInt({ min: 0 }),
        body('is_active').optional().isBoolean()
    ],
    RBACController.createModule
);

// Update module
router.put('/modules/:id',
    addUserPermissions,
    hasModuleActionPermissionWeb('rbac', 'update'),
    [
        param('id').isInt({ min: 1 }).withMessage('Module ID must be a positive integer'),
        body('name').optional().notEmpty(),
        body('display_name').optional().notEmpty(),
        body('description').optional(),
        body('icon').optional(),
        body('route').optional(),
        body('order_index').optional().isInt({ min: 0 }),
        body('is_active').optional().isBoolean()
    ],
    RBACController.updateModule
);

// Get module deletion impact (related data count)
router.get('/modules/:id/deletion-impact',
    addUserPermissions,
    hasModuleActionPermissionWeb('rbac', 'view'),
    [
        param('id').isInt({ min: 1 }).withMessage('Module ID must be a positive integer')
    ],
    RBACController.getModuleDeletionImpact
);

// Delete module
router.delete('/modules/:id',
    addUserPermissions,
    hasModuleActionPermissionWeb('rbac', 'delete'),
    [
        param('id').isInt({ min: 1 }).withMessage('Module ID must be a positive integer')
    ],
    RBACController.deleteModule
);

// ==================== ROLE PERMISSIONS ====================

// Get role permissions
router.get('/roles/:id/permissions',
    addUserPermissions,
    hasModuleActionPermissionWeb('rbac', 'view'),
    [
        param('id').isInt({ min: 1 })
    ],
    RBACController.getRolePermissions
);

// Update role permissions
router.put('/roles/:id/permissions',
    addUserPermissions,
    hasModuleActionPermissionWeb('rbac', 'update'),
    [
        param('id').isInt({ min: 1 }),
        body('permission_ids').isArray().withMessage('Permission IDs must be an array')
    ],
    RBACController.updateRolePermissions
);

// ==================== USER ROLES ====================

// Get user roles
router.get('/users/:userId/roles',
    addUserPermissions,
    hasModuleActionPermissionWeb('users', 'view'),
    [
        param('userId').isInt({ min: 1 })
    ],
    RBACController.getUserRoles
);

// Assign role to user
router.post('/users/roles',
    addUserPermissions,
    hasModuleActionPermissionWeb('users', 'update'),
    [
        body('userId')
            .isInt({ min: 1 })
            .withMessage('User ID is required and must be a positive integer'),
        body('roleId')
            .isInt({ min: 1 })
            .withMessage('Role ID is required and must be a positive integer')
    ],
    RBACController.assignUserRole
);

// Remove role from user
router.delete('/users/roles',
    addUserPermissions,
    hasModuleActionPermissionWeb('users', 'update'),
    [
        body('userId')
            .isInt({ min: 1 })
            .withMessage('User ID is required and must be a positive integer'),
        body('roleId')
            .isInt({ min: 1 })
            .withMessage('Role ID is required and must be a positive integer')
    ],
    RBACController.removeUserRole
);

// Update user's primary role
router.put('/users/primary-role',
    addUserPermissions,
    hasModuleActionPermissionWeb('users', 'update'),
    [
        body('userId')
            .isInt({ min: 1 })
            .withMessage('User ID is required and must be a positive integer'),
        body('roleId')
            .isInt({ min: 1 })
            .withMessage('Role ID is required and must be a positive integer')
    ],
    RBACController.updateUserPrimaryRole
);

// Get role statistics
router.get('/stats',
    addUserPermissions,
    hasModuleActionPermissionWeb('rbac', 'view'),
    RBACController.getRoleStats
);

module.exports = router;
