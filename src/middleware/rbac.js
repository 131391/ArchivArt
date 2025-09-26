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
                // Check if this is a web request (HTML) or API request (JSON)
                const isWebRequest = req.accepts('html') && !req.accepts('json');
                
                if (isWebRequest) {
                    req.flash('error_msg', 'Please log in to access this page');
                    return res.redirect('/admin/login');
                }
                
                return res.status(401).json({
                    success: false,
                    message: 'Authentication required'
                });
            }

            // Check if user has permission for this module.action
            const permissionName = `${moduleName}.${actionName}`;
            const hasAccess = await UserRole.hasPermission(req.session.userId, permissionName);
            
            if (!hasAccess) {
                // Check if this is a web request (HTML) or API request (JSON)
                const isWebRequest = req.accepts('html') && !req.accepts('json');
                
                if (isWebRequest) {
                    req.flash('error_msg', 'You do not have permission to access this page');
                    return res.redirect('/admin/login');
                }
                
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

            // Check if user has permission for this module.action
            const permissionName = `${moduleName}.${actionName}`;
            const hasAccess = await UserRole.hasPermission(req.session.userId, permissionName);
            
            if (!hasAccess) {
                req.flash('error_msg', `Access denied. You don't have permission to access ${moduleName}. Required permission: ${permissionName}`);
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
            // Update session user data with fresh profile picture data
            if (req.session.user && req.session.user.id) {
                try {
                    const db = require('../config/database');
                    const [userData] = await db.execute(
                        'SELECT profile_picture FROM users WHERE id = ?',
                        [req.session.user.id]
                    );
                    if (userData.length > 0) {
                        req.session.user.profile_picture = userData[0].profile_picture;
                    }
                } catch (error) {
                    console.warn('Could not update session user profile picture:', error);
                }
            }
            
            // Get user's primary role from RBAC system
            let primaryRole = null;
            let isAdmin = false;
            
            try {
                primaryRole = await Promise.race([
                    UserRole.getUserPrimaryRole(req.session.userId),
                    new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000))
                ]);
                isAdmin = primaryRole && (primaryRole.name === 'admin' || primaryRole.name === 'super_admin');
            } catch (error) {
                console.warn('Could not load RBAC role, defaulting to non-admin');
            }
            
            // For admin users, load permissions for sidebar display
            if (isAdmin) {
                try {
                    // For admin users, don't use timeout to avoid permission loading issues
                    const permissions = await UserRole.getUserPermissions(req.session.userId);
                    const primaryRole = await UserRole.getUserPrimaryRole(req.session.userId);
                    
                    req.userPermissions = permissions;
                    req.userPrimaryRole = primaryRole;
                    
                    // Create a helper function for permission checking (always true for admin)
                    req.hasPermission = async (permissionName) => {
                        return true;
                    };
                    
                    // Create a helper function for module permission checking (always true for admin)
                    req.hasModulePermission = async (module) => {
                        return true;
                    };
                } catch (timeoutError) {
                    console.warn('Permission loading timeout for admin, using all permissions');
                    // For admin users, provide all common permissions for sidebar display
                    req.userPermissions = [
                        { name: 'dashboard.view', module: 'dashboard' },
                        { name: 'users.view', module: 'users' },
                        { name: 'users.create', module: 'users' },
                        { name: 'users.update', module: 'users' },
                        { name: 'users.delete', module: 'users' },
                        { name: 'users.block', module: 'users' },
                        { name: 'media.view', module: 'media' },
                        { name: 'media.create', module: 'media' },
                        { name: 'media.update', module: 'media' },
                        { name: 'media.delete', module: 'media' },
                        { name: 'media.upload', module: 'media' },
                        { name: 'rbac.view', module: 'rbac' },
                        { name: 'rbac.roles.view', module: 'rbac' },
                        { name: 'rbac.roles.create', module: 'rbac' },
                        { name: 'rbac.roles.update', module: 'rbac' },
                        { name: 'rbac.roles.delete', module: 'rbac' },
                        { name: 'rbac.permissions.view', module: 'rbac' },
                        { name: 'rbac.permissions.create', module: 'rbac' },
                        { name: 'rbac.permissions.update', module: 'rbac' },
                        { name: 'rbac.permissions.delete', module: 'rbac' },
                        { name: 'rbac.modules.view', module: 'rbac' },
                        { name: 'rbac.modules.create', module: 'rbac' },
                        { name: 'rbac.modules.update', module: 'rbac' },
                        { name: 'rbac.modules.delete', module: 'rbac' },
                        { name: 'rbac.actions.view', module: 'rbac' },
                        { name: 'rbac.actions.create', module: 'rbac' },
                        { name: 'rbac.actions.update', module: 'rbac' },
                        { name: 'rbac.actions.delete', module: 'rbac' },
                        { name: 'rbac.assign_roles', module: 'rbac' },
                        { name: 'settings.view', module: 'settings' },
                        { name: 'settings.update', module: 'settings' },
                        { name: 'security.view', module: 'security' },
                        { name: 'security.logs.view', module: 'security' },
                        { name: 'security.sessions.view', module: 'security' },
                        { name: 'security.sessions.revoke', module: 'security' }
                    ];
                    req.userPrimaryRole = { name: 'admin', display_name: 'Administrator' };
                    
                    req.hasPermission = async (permissionName) => {
                        return true;
                    };
                    
                    req.hasModulePermission = async (module) => {
                        return true;
                    };
                }
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
