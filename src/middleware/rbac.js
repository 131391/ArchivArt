const UserRole = require('../models/UserRole');

/**
 * RBAC Middleware for permission checking
 */

// Check if user has specific permission (module.action format)
const hasPermission = (permissionName) => {
    return async (req, res, next) => {
        try {
            if (!req.session || !req.session.userId) {
                return res.status(401).json({
                    success: false,
                    message: 'Authentication required'
                });
            }

            // For now, allow admin users to access all RBAC endpoints
            // TODO: Implement proper permission checking once RBAC is fully working
            if (req.session.user && (req.session.user.role === 'admin' || req.session.user.role === 'super_admin')) {
                return next();
            }

            const hasAccess = await UserRole.hasPermission(req.session.userId, permissionName);
            
            if (!hasAccess) {
                return res.status(403).json({
                    success: false,
                    message: 'Insufficient permissions',
                    required: permissionName
                });
            }

            next();
        } catch (error) {
            console.error('Permission check error:', error);
            return res.status(500).json({
                success: false,
                message: 'Permission check failed'
            });
        }
    };
};

// Check if user has permission for a specific module and action (API version - returns JSON)
const hasModuleActionPermission = (moduleName, actionName) => {
    return async (req, res, next) => {
        try {
            if (!req.session || !req.session.userId) {
                return res.status(401).json({
                    success: false,
                    message: 'Authentication required'
                });
            }

            // For now, allow admin users to access all RBAC endpoints
            if (req.session.user && (req.session.user.role === 'admin' || req.session.user.role === 'super_admin')) {
                return next();
            }

            // Check if user has permission for this module.action
            const permissionName = `${moduleName}.${actionName}`;
            const hasAccess = await UserRole.hasPermission(req.session.userId, permissionName);
            
            if (!hasAccess) {
                return res.status(403).json({
                    success: false,
                    message: 'Insufficient permissions',
                    required: permissionName
                });
            }

            next();
        } catch (error) {
            console.error('Permission check error:', error);
            return res.status(500).json({
                success: false,
                message: 'Permission check failed'
            });
        }
    };
};

// Check if user has permission for a specific module and action (Web version - redirects to login)
const hasModuleActionPermissionWeb = (moduleName, actionName) => {
    return async (req, res, next) => {
        try {
            if (!req.session || !req.session.userId) {
                req.flash('error_msg', 'Authentication required');
                return res.redirect('/admin/login');
            }

            // For now, allow admin users to access all RBAC endpoints
            if (req.session.user && (req.session.user.role === 'admin' || req.session.user.role === 'super_admin')) {
                return next();
            }

            // Check if user has permission for this module.action
            const permissionName = `${moduleName}.${actionName}`;
            const hasAccess = await UserRole.hasPermission(req.session.userId, permissionName);
            
            if (!hasAccess) {
                req.flash('error_msg', `Insufficient permissions. Required: ${permissionName}`);
                return res.redirect('/admin/login');
            }

            next();
        } catch (error) {
            console.error('Permission check error:', error);
            req.flash('error_msg', 'Permission check failed');
            return res.redirect('/admin/login');
        }
    };
};

// Check if user has any permission in a module
const hasModulePermission = (module) => {
    return async (req, res, next) => {
        try {
            if (!req.session || !req.session.userId) {
                return res.status(401).json({
                    success: false,
                    message: 'Authentication required'
                });
            }

            const hasAccess = await UserRole.hasModulePermission(req.session.userId, module);
            
            if (!hasAccess) {
                return res.status(403).json({
                    success: false,
                    message: 'Insufficient permissions',
                    required: module
                });
            }

            next();
        } catch (error) {
            console.error('Module permission check error:', error);
            return res.status(500).json({
                success: false,
                message: 'Permission check failed'
            });
        }
    };
};

// Check if user has any of the specified permissions
const hasAnyPermission = (permissions) => {
    return async (req, res, next) => {
        try {
            if (!req.session || !req.session.userId) {
                return res.status(401).json({
                    success: false,
                    message: 'Authentication required'
                });
            }

            const userId = req.session.userId;
            let hasAccess = false;

            for (const permission of permissions) {
                if (await UserRole.hasPermission(userId, permission)) {
                    hasAccess = true;
                    break;
                }
            }
            
            if (!hasAccess) {
                return res.status(403).json({
                    success: false,
                    message: 'Insufficient permissions',
                    required: permissions
                });
            }

            next();
        } catch (error) {
            console.error('Any permission check error:', error);
            return res.status(500).json({
                success: false,
                message: 'Permission check failed'
            });
        }
    };
};

// Check if user has all of the specified permissions
const hasAllPermissions = (permissions) => {
    return async (req, res, next) => {
        try {
            if (!req.session || !req.session.userId) {
                return res.status(401).json({
                    success: false,
                    message: 'Authentication required'
                });
            }

            const userId = req.session.userId;
            let hasAccess = true;

            for (const permission of permissions) {
                if (!(await UserRole.hasPermission(userId, permission))) {
                    hasAccess = false;
                    break;
                }
            }
            
            if (!hasAccess) {
                return res.status(403).json({
                    success: false,
                    message: 'Insufficient permissions',
                    required: permissions
                });
            }

            next();
        } catch (error) {
            console.error('All permissions check error:', error);
            return res.status(500).json({
                success: false,
                message: 'Permission check failed'
            });
        }
    };
};

// Middleware to add user permissions to request object
const addUserPermissions = async (req, res, next) => {
    try {
        if (req.session && req.session.userId) {
            // Check if user has admin role - try multiple ways to get role info
            const userRole = req.session.user?.role || req.session.role || 'admin'; // Default to admin for now
            
            // For admin users, bypass permission loading to avoid timeouts
            if (userRole === 'admin' || userRole === 'super_admin') {
                req.userPermissions = []; // Empty array for admin users
                req.userPrimaryRole = { name: 'admin', display_name: 'Administrator' };
                
                // Create a helper function for permission checking (always true for admin)
                req.hasPermission = async (permissionName) => {
                    return true;
                };
                
                // Create a helper function for module permission checking (always true for admin)
                req.hasModulePermission = async (module) => {
                    return true;
                };
            } else {
                // For non-admin users, try to load permissions with timeout
                try {
                    const permissions = await Promise.race([
                        UserRole.getUserPermissions(req.session.userId),
                        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000))
                    ]);
                    
                    const primaryRole = await Promise.race([
                        UserRole.getUserPrimaryRole(req.session.userId),
                        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000))
                    ]);
                    
                    req.userPermissions = permissions;
                    req.userPrimaryRole = primaryRole;
                    
                    // Create a helper function for permission checking
                    req.hasPermission = async (permissionName) => {
                        return permissions.some(p => p.name === permissionName);
                    };
                    
                    // Create a helper function for module permission checking
                    req.hasModulePermission = async (module) => {
                        return permissions.some(p => p.module === module);
                    };
                } catch (timeoutError) {
                    console.warn('Permission loading timeout, using empty permissions');
                    req.userPermissions = [];
                    req.userPrimaryRole = null;
                    
                    req.hasPermission = async (permissionName) => {
                        return false;
                    };
                    
                    req.hasModulePermission = async (module) => {
                        return false;
                    };
                }
            }
        }
        next();
    } catch (error) {
        console.error('Add user permissions error:', error);
        // Set default values on error
        req.userPermissions = [];
        req.userPrimaryRole = null;
        req.hasPermission = async (permissionName) => false;
        req.hasModulePermission = async (module) => false;
        next(); // Continue even if permission loading fails
    }
};

// Helper function to check permissions in EJS templates
const checkPermission = (userPermissions, permissionName) => {
    if (!userPermissions || !Array.isArray(userPermissions)) {
        return false;
    }
    return userPermissions.some(p => p.name === permissionName);
};

// Helper function to check module permissions in EJS templates
const checkModulePermission = (userPermissions, module) => {
    if (!userPermissions || !Array.isArray(userPermissions)) {
        return false;
    }
    return userPermissions.some(p => p.module === module);
};

// Helper function to get user's primary role name
const getUserRoleName = (userPrimaryRole) => {
    return userPrimaryRole ? userPrimaryRole.display_name : 'No Role';
};

module.exports = {
    hasPermission,
    hasModuleActionPermission,
    hasModuleActionPermissionWeb,
    hasModulePermission,
    hasAnyPermission,
    hasAllPermissions,
    addUserPermissions,
    checkPermission,
    checkModulePermission,
    getUserRoleName
};
