const Role = require('../models/Role');
const Permission = require('../models/Permission');
const UserRole = require('../models/UserRole');
const { validationResult } = require('express-validator');

class RBACController {
    // ==================== DASHBOARD ====================
    
    // Get RBAC dashboard data
    async getDashboard(req, res) {
        try {
            const db = require('../config/database');
            
            // Get counts with timeout protection
            const [rolesCount] = await Promise.race([
                db.execute('SELECT COUNT(*) as count FROM roles'),
                new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000))
            ]);
            
            const [permissionsCount] = await Promise.race([
                db.execute('SELECT COUNT(*) as count FROM permissions'),
                new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000))
            ]);
            
            const [userRolesCount] = await Promise.race([
                db.execute('SELECT COUNT(*) as count FROM user_roles WHERE is_active = 1'),
                new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000))
            ]);
            
            const [rolePermissionsCount] = await Promise.race([
                db.execute('SELECT COUNT(*) as count FROM role_permissions'),
                new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000))
            ]);
            
            res.json({
                success: true,
                data: {
                    totalRoles: rolesCount[0].count,
                    totalPermissions: permissionsCount[0].count,
                    totalUserRoles: userRolesCount[0].count,
                    totalRolePermissions: rolePermissionsCount[0].count
                }
            });
        } catch (error) {
            console.error('Error getting RBAC dashboard data:', error);
            res.status(500).json({
                success: false,
                message: 'Error loading dashboard data'
            });
        }
    }
    
    // ==================== ROLES ====================
    
    // Get all roles
    async getRoles(req, res) {
        try {
            const { page = 1, limit = 10, search = '', is_active = null } = req.query;
            const offset = (page - 1) * limit;
            
            const roles = await Role.findAll({
                search: search,
                is_active: is_active !== null ? parseInt(is_active) : null,
                limit: parseInt(limit),
                offset: parseInt(offset)
            });
            
            // Get total count with search and status filters
            let countQuery = 'SELECT COUNT(*) as total FROM roles r';
            const countParams = [];
            const whereConditions = [];
            
            // Search condition
            if (search && search.trim()) {
                whereConditions.push('(r.name LIKE ? OR r.display_name LIKE ? OR r.description LIKE ?)');
                const searchTerm = `%${search.trim()}%`;
                countParams.push(searchTerm, searchTerm, searchTerm);
            }
            
            // Status filter
            if (is_active !== null) {
                whereConditions.push('r.is_active = ?');
                countParams.push(parseInt(is_active));
            }
            
            // Build WHERE clause for count
            if (whereConditions.length > 0) {
                countQuery += ' WHERE ' + whereConditions.join(' AND ');
            }
            
            const db = require('../config/database');
            const [countResult] = await db.execute(countQuery, countParams);
            const total = countResult[0].total;
            
            res.json({
                success: true,
                data: roles,
                userPermissions: req.userPermissions || [],
                pagination: {
                    currentPage: parseInt(page),
                    totalPages: Math.ceil(total / limit),
                    totalItems: total,
                    hasNext: page * limit < total,
                    hasPrev: page > 1
                }
            });
        } catch (error) {
            console.error('Error getting roles:', error);
            res.status(500).json({
                success: false,
                message: 'Error loading roles'
            });
        }
    }
    
    // Get role by ID
    async getRole(req, res) {
        try {
            const { id } = req.params;
            const role = await Role.findById(id);
            
            if (!role) {
                return res.status(404).json({
                    success: false,
                    message: 'Role not found'
                });
            }
            
            // Get role permissions
            const permissions = await role.getPermissions();
            
            res.json({
                success: true,
                data: {
                    ...role,
                    permissions
                }
            });
        } catch (error) {
            console.error('Error getting role:', error);
            res.status(500).json({
                success: false,
                message: 'Error loading role'
            });
        }
    }
    
    // Create new role
    async createRole(req, res) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    message: 'Validation failed',
                    errors: errors.array()
                });
            }
            
            const { name, display_name, description, permissions = [] } = req.body;
            
            // Check if role name already exists
            const existingRole = await Role.findByName(name);
            if (existingRole) {
                return res.status(400).json({
                    success: false,
                    message: 'Role name already exists'
                });
            }
            
            // Create role
            const roleId = await Role.create({
                name,
                display_name,
                description
            });
            
            // Add permissions to role
            for (const permissionId of permissions) {
                await Role.addPermission(roleId, permissionId);
            }
            
            res.status(201).json({
                success: true,
                message: 'Role created successfully',
                data: { id: roleId }
            });
        } catch (error) {
            console.error('Error creating role:', error);
            res.status(500).json({
                success: false,
                message: 'Error creating role'
            });
        }
    }
    
    // Update role
    async updateRole(req, res) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    message: 'Validation failed',
                    errors: errors.array()
                });
            }
            
            const { id } = req.params;
            const { name, display_name, description, is_active, permissions = [] } = req.body;
            
            // Check if role exists
            const existingRole = await Role.findById(id);
            if (!existingRole) {
                return res.status(404).json({
                    success: false,
                    message: 'Role not found'
                });
            }
            
            // Check if role name already exists (excluding current role)
            const roleWithSameName = await Role.findByName(name);
            if (roleWithSameName && roleWithSameName.id != id) {
                return res.status(400).json({
                    success: false,
                    message: 'Role name already exists'
                });
            }
            
            // Update role
            await Role.update(id, {
                name,
                display_name,
                description,
                is_active
            });
            
            // Update permissions
            const currentPermissions = await existingRole.getPermissions();
            const currentPermissionIds = currentPermissions.map(p => p.id);
            
            // Remove permissions that are no longer assigned
            for (const permissionId of currentPermissionIds) {
                if (!permissions.includes(permissionId)) {
                    await Role.removePermission(id, permissionId);
                }
            }
            
            // Add new permissions
            for (const permissionId of permissions) {
                if (!currentPermissionIds.includes(permissionId)) {
                    await Role.addPermission(id, permissionId);
                }
            }
            
            res.json({
                success: true,
                message: 'Role updated successfully'
            });
        } catch (error) {
            console.error('Error updating role:', error);
            res.status(500).json({
                success: false,
                message: 'Error updating role'
            });
        }
    }
    
    // Delete role
    async deleteRole(req, res) {
        try {
            const { id } = req.params;
            const db = require('../config/database');
            
            // Check if role exists
            const role = await Role.findById(id);
            if (!role) {
                return res.status(404).json({
                    success: false,
                    message: 'Role not found'
                });
            }
            
            // Check if role is system role (prevent deletion of system roles)
            if (role.is_system_role) {
                return res.status(400).json({
                    success: false,
                    message: 'Cannot delete system roles'
                });
            }
            
            // Use cascade deletion stored procedure
            await db.execute('CALL DeleteRoleWithCascade(?)', [id]);
            
            res.json({
                success: true,
                message: 'Role and all related data deleted successfully'
            });
        } catch (error) {
            console.error('Error deleting role:', error);
            res.status(500).json({
                success: false,
                message: 'Error deleting role'
            });
        }
    }
    
    // ==================== PERMISSIONS ====================
    
    // Get all permissions
    async getPermissions(req, res) {
        try {
            const { 
                module = null, 
                is_active = null,
                page = 1,
                limit = 1000,  // Use high default for role management
                search = '',
                sort = 'created_at',
                order = 'desc'
            } = req.query;
            
            // Ensure limit is properly parsed
            const parsedLimit = parseInt(limit) || 1000;
            const parsedPage = parseInt(page) || 1;
            
            const offset = (parsedPage - 1) * parsedLimit;
            
            const permissions = await Permission.findAll({
                module,
                is_active: is_active !== null ? parseInt(is_active) : null,
                search,
                sort,
                order,
                limit: parsedLimit,
                offset
            });
            
            // Get total count for pagination
            const totalPermissions = await Permission.getTotalCount({
                module,
                is_active: is_active !== null ? parseInt(is_active) : null,
                search
            });
            
            const totalPages = Math.ceil(totalPermissions / parsedLimit);
            
            res.json({
                success: true,
                data: permissions,
                userPermissions: req.userPermissions || [],
                pagination: {
                    currentPage: parsedPage,
                    totalPages: totalPages,
                    totalItems: totalPermissions,
                    hasNext: parsedPage < totalPages,
                    hasPrev: parsedPage > 1
                }
            });
        } catch (error) {
            console.error('Error getting permissions:', error);
            res.status(500).json({
                success: false,
                message: 'Error loading permissions'
            });
        }
    }
    
    // Get permission by ID
    async getPermission(req, res) {
        try {
            const { id } = req.params;
            const permission = await Permission.findById(id);
            
            if (!permission) {
                return res.status(404).json({
                    success: false,
                    message: 'Permission not found'
                });
            }
            
            // Get roles that have this permission
            const roles = await permission.getRoles();
            
            res.json({
                success: true,
                data: {
                    ...permission,
                    roles
                }
            });
        } catch (error) {
            console.error('Error getting permission:', error);
            res.status(500).json({
                success: false,
                message: 'Error loading permission'
            });
        }
    }
    
    // Create new permission
    async createPermission(req, res) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    message: 'Validation failed',
                    errors: errors.array()
                });
            }
            
            const { name, display_name, description, module, action, resource } = req.body;
            
            // Check if permission name already exists
            const existingPermission = await Permission.findByName(name);
            if (existingPermission) {
                return res.status(400).json({
                    success: false,
                    message: 'Permission name already exists'
                });
            }
            
            // Get module and action IDs
            let module_id = null;
            let action_id = null;
            
            if (module) {
                const Module = require('../models/Module');
                const moduleRecord = await Module.findByName(module);
                if (moduleRecord) {
                    module_id = moduleRecord.id;
                }
            }
            
            if (action) {
                const ModuleAction = require('../models/ModuleAction');
                const actionRecord = await ModuleAction.findByName(action);
                if (actionRecord) {
                    action_id = actionRecord.id;
                }
            }
            
            // Create permission
            const permissionId = await Permission.create({
                name,
                display_name,
                description,
                module_id,
                action_id,
                resource
            });
            
            res.status(201).json({
                success: true,
                message: 'Permission created successfully',
                data: { id: permissionId }
            });
        } catch (error) {
            console.error('Error creating permission:', error);
            res.status(500).json({
                success: false,
                message: 'Error creating permission'
            });
        }
    }
    
    // Update permission
    async updatePermission(req, res) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    message: 'Validation failed',
                    errors: errors.array()
                });
            }
            
            const { id } = req.params;
            const { name, display_name, description, module, action, resource, is_active } = req.body;
            
            // Check if permission exists
            const existingPermission = await Permission.findById(id);
            if (!existingPermission) {
                return res.status(404).json({
                    success: false,
                    message: 'Permission not found'
                });
            }
            
            // Check if permission name already exists (excluding current permission)
            const permissionWithSameName = await Permission.findByName(name);
            if (permissionWithSameName && permissionWithSameName.id != id) {
                return res.status(400).json({
                    success: false,
                    message: 'Permission name already exists'
                });
            }
            
            // Get module and action IDs
            let module_id = null;
            let action_id = null;
            
            if (module) {
                const Module = require('../models/Module');
                const moduleRecord = await Module.findByName(module);
                if (moduleRecord) {
                    module_id = moduleRecord.id;
                }
            }
            
            if (action) {
                const ModuleAction = require('../models/ModuleAction');
                const actionRecord = await ModuleAction.findByName(action);
                if (actionRecord) {
                    action_id = actionRecord.id;
                }
            }
            
            // Update permission
            await Permission.update(id, {
                name,
                display_name,
                description,
                module_id,
                action_id,
                resource,
                is_active
            });
            
            res.json({
                success: true,
                message: 'Permission updated successfully'
            });
        } catch (error) {
            console.error('Error updating permission:', error);
            res.status(500).json({
                success: false,
                message: 'Error updating permission'
            });
        }
    }
    
    // Delete permission
    async deletePermission(req, res) {
        try {
            const { id } = req.params;
            const db = require('../config/database');
            
            // Check if permission exists
            const permission = await Permission.findById(id);
            if (!permission) {
                return res.status(404).json({
                    success: false,
                    message: 'Permission not found'
                });
            }
            
            // Use cascade deletion stored procedure
            await db.execute('CALL DeletePermissionWithCascade(?)', [id]);
            
            res.json({
                success: true,
                message: 'Permission and all related data deleted successfully'
            });
        } catch (error) {
            console.error('Error deleting permission:', error);
            res.status(500).json({
                success: false,
                message: 'Error deleting permission'
            });
        }
    }
    
    // Get all modules
    async getModules(req, res) {
        try {
            const Module = require('../models/Module');
            const modules = await Module.findAll();
            
            res.json({
                success: true,
                data: modules
            });
        } catch (error) {
            console.error('Error getting modules:', error);
            res.status(500).json({
                success: false,
                message: 'Error loading modules'
            });
        }
    }

    async getModuleActions(req, res) {
        try {
            const ModuleAction = require('../models/ModuleAction');
            const actions = await ModuleAction.findAll();
            
            res.json({
                success: true,
                data: actions
            });
        } catch (error) {
            console.error('Error getting module actions:', error);
            res.status(500).json({
                success: false,
                message: 'Error loading module actions'
            });
        }
    }

    async checkDuplicatePermission(req, res) {
        try {
            const { name, exclude } = req.query;
            
            if (!name) {
                return res.status(400).json({
                    success: false,
                    message: 'Permission name is required'
                });
            }
            
            const existingPermission = await Permission.findByName(name);
            
            // If exclude is provided, check if the existing permission is different from the excluded one
            if (exclude && existingPermission && existingPermission.id == exclude) {
                return res.json({
                    success: true,
                    exists: false
                });
            }
            
            res.json({
                success: true,
                exists: !!existingPermission
            });
        } catch (error) {
            console.error('Error checking duplicate permission:', error);
            res.status(500).json({
                success: false,
                message: 'Error checking duplicate permission'
            });
        }
    }
    
    // ==================== USER ROLES ====================
    
    // Get user roles
    async getUserRoles(req, res) {
        try {
            const { userId } = req.params;
            const roles = await UserRole.getUserRoles(userId);
            const primaryRole = await UserRole.getUserPrimaryRole(userId);
            
            res.json({
                success: true,
                data: {
                    roles,
                    primaryRole
                }
            });
        } catch (error) {
            console.error('Error getting user roles:', error);
            res.status(500).json({
                success: false,
                message: 'Error loading user roles'
            });
        }
    }
    
    // Assign role to user
    async assignUserRole(req, res) {
        try {
            const { userId, roleId } = req.body;
            
            await UserRole.assignRole(userId, roleId);
            
            res.json({
                success: true,
                message: 'Role assigned successfully'
            });
        } catch (error) {
            console.error('Error assigning role:', error);
            res.status(500).json({
                success: false,
                message: 'Error assigning role'
            });
        }
    }
    
    // Remove role from user
    async removeUserRole(req, res) {
        try {
            const { userId, roleId } = req.body;
            
            await UserRole.removeRole(userId, roleId);
            
            res.json({
                success: true,
                message: 'Role removed successfully'
            });
        } catch (error) {
            console.error('Error removing role:', error);
            res.status(500).json({
                success: false,
                message: 'Error removing role'
            });
        }
    }
    
    // Update user's primary role
    async updateUserPrimaryRole(req, res) {
        try {
            const { userId, roleId } = req.body;
            
            await UserRole.updateUserPrimaryRole(userId, roleId);
            
            res.json({
                success: true,
                message: 'User role updated successfully'
            });
        } catch (error) {
            console.error('Error updating user role:', error);
            res.status(500).json({
                success: false,
                message: 'Error updating user role'
            });
        }
    }
    
    // Get role statistics
    async getRoleStats(req, res) {
        try {
            const stats = await UserRole.getRoleStats();
            
            res.json({
                success: true,
                data: stats
            });
        } catch (error) {
            console.error('Error getting role stats:', error);
            res.status(500).json({
                success: false,
                message: 'Error loading role statistics'
            });
        }
    }

    // Get role permissions
    async getRolePermissions(req, res) {
        try {
            const { id } = req.params;
            
            const rolePermissions = await Role.getRolePermissions(id);
            
            res.json({
                success: true,
                data: rolePermissions
            });
        } catch (error) {
            console.error('Get role permissions error:', error);
            res.status(500).json({
                success: false,
                message: 'Error fetching role permissions',
                error: error.message
            });
        }
    }

    // Update role permissions
    async updateRolePermissions(req, res) {
        try {
            const { id } = req.params;
            const { permission_ids } = req.body;
            
            const result = await Role.updateRolePermissions(id, permission_ids);
            
            res.json({
                success: true,
                message: 'Role permissions updated successfully',
                data: result
            });
        } catch (error) {
            console.error('Update role permissions error:', error);
            res.status(500).json({
                success: false,
                message: 'Error updating role permissions',
                error: error.message
            });
        }
    }
    
    // ==================== MODULE MANAGEMENT ====================
    
    // Get all modules
    async getModules(req, res) {
        try {
            const Module = require('../models/Module');
            const db = require('../config/database');
            
            // Get modules with both action and permission counts
            const query = `
                SELECT m.*, 
                       COUNT(DISTINCT ma.id) as action_count,
                       COUNT(DISTINCT p.id) as permission_count
                FROM modules m
                LEFT JOIN module_actions ma ON m.id = ma.module_id AND ma.is_active = 1
                LEFT JOIN permissions p ON m.id = p.module_id AND p.is_active = 1
                WHERE m.is_active = 1
                GROUP BY m.id
                ORDER BY m.order_index ASC, m.display_name ASC
            `;
            
            const [rows] = await db.execute(query);
            const modules = rows.map(row => ({
                id: row.id,
                name: row.name,
                display_name: row.display_name,
                description: row.description,
                icon: row.icon,
                route: row.route,
                order_index: row.order_index,
                is_active: row.is_active,
                action_count: row.action_count,
                permission_count: row.permission_count,
                created_at: row.created_at,
                updated_at: row.updated_at
            }));
            
            res.json({
                success: true,
                data: modules,
                userPermissions: req.userPermissions || []
            });
        } catch (error) {
            console.error('Error getting modules:', error);
            res.status(500).json({
                success: false,
                message: 'Error loading modules'
            });
        }
    }
    
    // Get module by ID
    async getModuleById(req, res) {
        try {
            const { id } = req.params;
            const Module = require('../models/Module');
            const module = await Module.findById(id);
            
            if (!module) {
                return res.status(404).json({
                    success: false,
                    message: 'Module not found'
                });
            }
            
            res.json({
                success: true,
                data: module
            });
        } catch (error) {
            console.error('Error getting module:', error);
            res.status(500).json({
                success: false,
                message: 'Error loading module'
            });
        }
    }
    
    // Create module
    async createModule(req, res) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    message: 'Validation failed',
                    errors: errors.array()
                });
            }
            
            const { name, display_name, description, icon, route, order_index, is_active } = req.body;
            const Module = require('../models/Module');
            
            // Check if module name already exists
            const existingModuleByName = await Module.findByName(name);
            if (existingModuleByName) {
                return res.status(400).json({
                    success: false,
                    message: 'Module name already exists'
                });
            }
            
            // Check if module display name already exists
            const existingModuleByDisplayName = await Module.findByDisplayName(display_name);
            if (existingModuleByDisplayName) {
                return res.status(400).json({
                    success: false,
                    message: 'Module display name already exists'
                });
            }
            
            // Check if module route already exists (if route provided)
            if (route) {
                const existingModuleByRoute = await Module.findByRoute(route);
                if (existingModuleByRoute) {
                    return res.status(400).json({
                        success: false,
                        message: 'Module route already exists'
                    });
                }
            }
            
            // Check if module order_index already exists (if order_index provided)
            if (order_index !== undefined && order_index !== null) {
                const existingModuleByOrder = await Module.findByOrderIndex(order_index);
                if (existingModuleByOrder) {
                    return res.status(400).json({
                        success: false,
                        message: 'Module order index already exists'
                    });
                }
            }
            
            // Create module
            const moduleId = await Module.create({
                name,
                display_name,
                description,
                icon,
                route,
                order_index: order_index || 0,
                is_active: is_active !== undefined ? is_active : 1
            });
            
            res.status(201).json({
                success: true,
                message: 'Module created successfully',
                data: { id: moduleId }
            });
        } catch (error) {
            console.error('Error creating module:', error);
            res.status(500).json({
                success: false,
                message: 'Error creating module'
            });
        }
    }
    
    // Update module
    async updateModule(req, res) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    message: 'Validation failed',
                    errors: errors.array()
                });
            }
            
            const { id } = req.params;
            const { name, display_name, description, icon, route, order_index, is_active } = req.body;
            const Module = require('../models/Module');
            
            // Check if module exists
            const existingModule = await Module.findById(id);
            if (!existingModule) {
                return res.status(404).json({
                    success: false,
                    message: 'Module not found'
                });
            }
            
            // Check if module name already exists (excluding current module)
            if (name) {
                const moduleWithSameName = await Module.findByName(name);
                if (moduleWithSameName && moduleWithSameName.id != id) {
                    return res.status(400).json({
                        success: false,
                        message: 'Module name already exists'
                    });
                }
            }
            
            // Check if module display name already exists (excluding current module)
            if (display_name) {
                const moduleWithSameDisplayName = await Module.findByDisplayName(display_name);
                if (moduleWithSameDisplayName && moduleWithSameDisplayName.id != id) {
                    return res.status(400).json({
                        success: false,
                        message: 'Module display name already exists'
                    });
                }
            }
            
            // Check if module route already exists (excluding current module)
            if (route) {
                const moduleWithSameRoute = await Module.findByRoute(route);
                if (moduleWithSameRoute && moduleWithSameRoute.id != id) {
                    return res.status(400).json({
                        success: false,
                        message: 'Module route already exists'
                    });
                }
            }
            
            // Check if module order_index already exists (excluding current module)
            if (order_index !== undefined && order_index !== null) {
                const moduleWithSameOrder = await Module.findByOrderIndex(order_index);
                if (moduleWithSameOrder && moduleWithSameOrder.id != id) {
                    return res.status(400).json({
                        success: false,
                        message: 'Module order index already exists'
                    });
                }
            }
            
            // Update module
            await Module.update(id, {
                name,
                display_name,
                description,
                icon,
                route,
                order_index,
                is_active
            });
            
            res.json({
                success: true,
                message: 'Module updated successfully'
            });
        } catch (error) {
            console.error('Error updating module:', error);
            res.status(500).json({
                success: false,
                message: 'Error updating module'
            });
        }
    }
    
    // Delete module
    // Get module deletion impact
    async getModuleDeletionImpact(req, res) {
        try {
            const { id } = req.params;
            const Module = require('../models/Module');
            
            // Check if module exists
            const existingModule = await Module.findById(id);
            if (!existingModule) {
                return res.status(404).json({
                    success: false,
                    message: 'Module not found'
                });
            }
            
            // Check if module is system module (prevent deletion of core modules)
            if (existingModule.is_system_module) {
                return res.status(400).json({
                    success: false,
                    message: 'Cannot delete system modules',
                    isSystemModule: true
                });
            }
            
            // Get related data count
            const relatedData = await Module.getRelatedDataCount(id);
            
            res.json({
                success: true,
                module: {
                    id: existingModule.id,
                    name: existingModule.name,
                    display_name: existingModule.display_name
                },
                relatedData: relatedData,
                willDeleteData: relatedData.actions > 0 || relatedData.permissions > 0 || relatedData.rolePermissions > 0
            });
        } catch (error) {
            console.error('Error getting module deletion impact:', error);
            res.status(500).json({
                success: false,
                message: 'Error getting module deletion impact'
            });
        }
    }

    async deleteModule(req, res) {
        try {
            const { id } = req.params;
            const Module = require('../models/Module');
            
            // Check if module exists
            const existingModule = await Module.findById(id);
            if (!existingModule) {
                return res.status(404).json({
                    success: false,
                    message: 'Module not found'
                });
            }
            
            // Check if module is system module (prevent deletion of core modules)
            if (existingModule.is_system_module) {
                return res.status(400).json({
                    success: false,
                    message: 'Cannot delete system modules'
                });
            }
            
            // Get related data count to inform user what will be deleted
            const relatedData = await Module.getRelatedDataCount(id);
            
            // Delete module with cascade (delete all related data)
            await Module.deleteWithCascade(id);
            
            // Build deletion summary message
            let deletionSummary = `Module "${existingModule.display_name}" deleted successfully.`;
            if (relatedData.actions > 0 || relatedData.permissions > 0 || relatedData.rolePermissions > 0) {
                deletionSummary += ' Also deleted:';
                if (relatedData.actions > 0) deletionSummary += ` ${relatedData.actions} module action(s),`;
                if (relatedData.permissions > 0) deletionSummary += ` ${relatedData.permissions} permission(s),`;
                if (relatedData.rolePermissions > 0) deletionSummary += ` ${relatedData.rolePermissions} role permission assignment(s),`;
                deletionSummary = deletionSummary.slice(0, -1) + '.'; // Remove last comma
            }
            
            res.json({
                success: true,
                message: deletionSummary,
                deletedData: relatedData
            });
        } catch (error) {
            console.error('Error deleting module:', error);
            res.status(500).json({
                success: false,
                message: 'Error deleting module'
            });
        }
    }
    
    // ==================== MODULE ACTIONS MANAGEMENT ====================
    
    // Get module action by ID
    async getModuleActionById(req, res) {
        try {
            const { id } = req.params;
            const ModuleAction = require('../models/ModuleAction');
            
            const action = await ModuleAction.findByIdAny(id);
            if (!action) {
                return res.status(404).json({
                    success: false,
                    message: 'Module action not found'
                });
            }
            
            res.json({
                success: true,
                data: action
            });
        } catch (error) {
            console.error('Error getting module action:', error);
            res.status(500).json({
                success: false,
                message: 'Error loading module action'
            });
        }
    }
    
    // Create module action
    async createModuleAction(req, res) {
        try {
            const { module_id, name, display_name, description } = req.body;
            
            // Validate required fields
            if (!module_id || !name || !display_name) {
                return res.status(400).json({
                    success: false,
                    message: 'Module ID, name, and display name are required'
                });
            }
            
            const ModuleAction = require('../models/ModuleAction');
            
            // Check if action with same name already exists for this module
            const existingAction = await ModuleAction.findByNameAndModule(name, module_id);
            if (existingAction) {
                return res.status(400).json({
                    success: false,
                    message: 'Action with this name already exists for this module'
                });
            }
            
            // Create module action
            const actionId = await ModuleAction.create({
                module_id,
                name,
                display_name,
                description
            });
            
            res.json({
                success: true,
                message: 'Module action created successfully',
                data: { id: actionId }
            });
        } catch (error) {
            console.error('Error creating module action:', error);
            res.status(500).json({
                success: false,
                message: 'Error creating module action'
            });
        }
    }
    
    // Update module action
    async updateModuleAction(req, res) {
        try {
            const { id } = req.params;
            const { name, display_name, description, is_active } = req.body;
            const ModuleAction = require('../models/ModuleAction');
            
            // Check if action exists (including inactive)
            const existingAction = await ModuleAction.findByIdAny(id);
            if (!existingAction) {
                return res.status(404).json({
                    success: false,
                    message: 'Module action not found'
                });
            }
            
            // Check if action name already exists for this module (excluding current action)
            if (name) {
                const actionWithSameName = await ModuleAction.findByNameAndModule(name, existingAction.module_id);
                if (actionWithSameName && actionWithSameName.id != id) {
                    return res.status(400).json({
                        success: false,
                        message: 'Action name already exists for this module'
                    });
                }
            }
            
            // Update module action
            await ModuleAction.update(id, {
                name,
                display_name,
                description,
                is_active
            });
            
            res.json({
                success: true,
                message: 'Module action updated successfully'
            });
        } catch (error) {
            console.error('Error updating module action:', error);
            res.status(500).json({
                success: false,
                message: 'Error updating module action'
            });
        }
    }
    
    // Delete module action
    async deleteModuleAction(req, res) {
        try {
            const { id } = req.params;
            const ModuleAction = require('../models/ModuleAction');
            const db = require('../config/database');
            
            // Check if action exists (including inactive)
            const existingAction = await ModuleAction.findByIdAny(id);
            if (!existingAction) {
                return res.status(404).json({
                    success: false,
                    message: 'Module action not found'
                });
            }
            
            // Use cascade deletion stored procedure
            await db.execute('CALL DeleteModuleActionWithCascade(?)', [id]);
            
            res.json({
                success: true,
                message: 'Module action and all related data deleted successfully'
            });
        } catch (error) {
            console.error('Error deleting module action:', error);
            res.status(500).json({
                success: false,
                message: 'Error deleting module action'
            });
        }
    }
    
    // Restore/Activate module action
    async restoreModuleAction(req, res) {
        try {
            const { id } = req.params;
            const ModuleAction = require('../models/ModuleAction');
            
            // Check if action exists (including inactive)
            const existingAction = await ModuleAction.findByIdAny(id);
            if (!existingAction) {
                return res.status(404).json({
                    success: false,
                    message: 'Module action not found'
                });
            }
            
            // Restore module action (set is_active to 1)
            await ModuleAction.update(id, {
                name: existingAction.name,
                display_name: existingAction.display_name,
                description: existingAction.description,
                route: existingAction.route,
                is_active: 1
            });
            
            res.json({
                success: true,
                message: 'Module action restored successfully'
            });
        } catch (error) {
            console.error('Error restoring module action:', error);
            res.status(500).json({
                success: false,
                message: 'Error restoring module action'
            });
        }
    }
}

module.exports = new RBACController();
