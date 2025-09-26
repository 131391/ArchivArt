const express = require('express');
const router = express.Router();
const { body, param } = require('express-validator');
const { requireAuth, requireAdminWeb, redirectIfAuthenticated } = require('../middleware/auth');
const { loadSettings } = require('../middleware/settings');
const { addUserPermissions, hasModuleActionPermission, hasModuleActionPermissionWeb } = require('../middleware/rbac');
const authController = require('../controllers/authController');
const adminController = require('../controllers/adminController');
const mediaController = require('../controllers/mediaController');
const rbacController = require('../controllers/rbacController');
const { 
  authRateLimit, 
  strictRateLimit,
  validateInput, 
  commonValidations, 
  preventSQLInjection,
  ipWhitelist 
} = require('../middleware/security');
const { profileUpload } = require('../config/multer');

// Root admin route - redirect to dashboard
router.get('/', async (req, res) => {
  if (req.session.user) {
    // Check if user has dashboard permission before redirecting
    try {
      const UserRole = require('../models/UserRole');
      const hasDashboardPermission = await UserRole.hasPermission(req.session.user.id, 'dashboard.view');
      
      if (hasDashboardPermission) {
        res.redirect('/admin/dashboard');
      } else {
        // User is logged in but doesn't have dashboard permission
        // Clear the session and redirect to login
        req.session.destroy();
        res.redirect('/admin/login');
      }
    } catch (error) {
      console.error('Error checking dashboard permission:', error);
      // On error, clear session and redirect to login
      req.session.destroy();
      res.redirect('/admin/login');
    }
  } else {
    res.redirect('/admin/login');
  }
});

// Login routes
router.get('/login', redirectIfAuthenticated, loadSettings, (req, res) => {
  res.render('admin/login', { 
    title: 'Login',
    email: req.query.email || '',
    layout: false
  });
});

router.post('/login', [
  authRateLimit,
  preventSQLInjection,
  commonValidations.email,
  body('password').notEmpty().withMessage('Password is required'),
  validateInput
], authController.webLogin);

router.get('/logout', authController.webLogout);

// Dashboard
router.get('/dashboard', [
  requireAdminWeb,
  addUserPermissions,
  hasModuleActionPermissionWeb('dashboard', 'view'),
  loadSettings
], adminController.dashboard);

// User management routes with enhanced security
router.get('/users', [
  requireAdminWeb,
  addUserPermissions,
  hasModuleActionPermissionWeb('users', 'view'),
  loadSettings, 
  preventSQLInjection
], adminController.getUsers);

router.get('/users/data', [
  requireAdminWeb,
  addUserPermissions,
  hasModuleActionPermissionWeb('users', 'view'),
  preventSQLInjection
], adminController.getUsersData);

router.get('/users/:id', [
  requireAdminWeb, 
  preventSQLInjection,
  param('id').custom((value) => {
    if (!value || isNaN(value) || parseInt(value) < 1) {
      throw new Error('Valid user ID is required');
    }
    return true;
  }),
  validateInput
], adminController.getUser);

router.put('/users/:id', [
  requireAdminWeb, 
  preventSQLInjection,
  param('id').isInt({ min: 1 }).withMessage('Valid user ID is required'),
  commonValidations.name,
  commonValidations.email,
  validateInput
], adminController.updateUser);

router.post('/users/:id/block', [
  requireAdminWeb, 
  strictRateLimit,
  preventSQLInjection,
  param('id').isInt({ min: 1 }).withMessage('Valid user ID is required'),
  validateInput
], adminController.blockUser);

router.post('/users/:id/unblock', [
  requireAdminWeb, 
  strictRateLimit,
  preventSQLInjection,
  param('id').isInt({ min: 1 }).withMessage('Valid user ID is required'),
  validateInput
], adminController.unblockUser);

router.delete('/users/:id', [
  requireAdminWeb, 
  strictRateLimit,
  preventSQLInjection,
  param('id').isInt({ min: 1 }).withMessage('Valid user ID is required'),
  validateInput
], adminController.deleteUser);

// Media management routes
router.use('/media', require('./media'));

// Settings
router.get('/settings', [
  requireAdminWeb,
  addUserPermissions,
  hasModuleActionPermissionWeb('settings', 'view'),
  loadSettings, 
  preventSQLInjection
], adminController.settings);

router.post('/settings', [
  requireAdminWeb,
  addUserPermissions,
  hasModuleActionPermissionWeb('settings', 'update'),
  strictRateLimit,
  preventSQLInjection,
  validateInput
], adminController.updateSettings);

// Profile
router.get('/profile', [
  requireAdminWeb,
  addUserPermissions,
  loadSettings, 
  preventSQLInjection
], adminController.profile);

router.post('/profile', [
  requireAdminWeb, 
  preventSQLInjection,
  commonValidations.name,
  commonValidations.email,
  validateInput
], adminController.updateProfile);

// Profile picture upload route
router.post('/profile/picture', [
  requireAdminWeb,
  addUserPermissions,
  preventSQLInjection,
  profileUpload
], adminController.updateProfilePicture);

// Change password route
router.post('/change-password', [
  requireAdminWeb,
  preventSQLInjection,
  body('current_password').notEmpty().withMessage('Current password is required'),
  body('new_password').isLength({ min: 8 }).withMessage('New password must be at least 8 characters'),
  body('confirm_password').custom((value, { req }) => {
    if (value !== req.body.new_password) {
      throw new Error('Password confirmation does not match new password');
    }
    return true;
  }),
  validateInput
], adminController.changePassword);

// Security Dashboard
router.get('/security', [
  requireAdminWeb, 
  loadSettings, 
  preventSQLInjection
], (req, res) => {
  res.render('admin/security', { 
    title: 'Security Dashboard',
    layout: false
  });
});

// Security API routes
router.get('/api/security/stats', [
  requireAdminWeb, 
  preventSQLInjection
], async (req, res) => {
  try {
    const SecurityService = require('../services/securityService');
    const stats = await SecurityService.getSecurityStats(7);
    const report = await SecurityService.generateSecurityReport(1);
    
    // Process stats for charts
    const chartData = {
      dates: [],
      securityEvents: [],
      failedLogins: []
    };
    
    // Group stats by date
    const statsByDate = {};
    stats.forEach(stat => {
      if (!statsByDate[stat.date]) {
        statsByDate[stat.date] = { securityEvents: 0, failedLogins: 0 };
      }
      if (stat.metric === 'security_events') {
        statsByDate[stat.date].securityEvents = stat.count;
      } else if (stat.metric === 'failed_logins') {
        statsByDate[stat.date].failedLogins = stat.count;
      }
    });
    
    // Convert to arrays for charts
    Object.keys(statsByDate).sort().forEach(date => {
      chartData.dates.push(new Date(date).toLocaleDateString());
      chartData.securityEvents.push(statsByDate[date].securityEvents);
      chartData.failedLogins.push(statsByDate[date].failedLogins);
    });
    
    res.json({
      failedLogins24h: report.find(r => r.metric === 'Total Failed Logins')?.value || 0,
      securityEvents24h: report.find(r => r.metric === 'Total Security Events')?.value || 0,
      blockedIPs: report.find(r => r.metric === 'Blocked IPs')?.value || 0,
      activeSessions: report.find(r => r.metric === 'Active Sessions')?.value || 0,
      chartData
    });
  } catch (error) {
    console.error('Error getting security stats:', error);
    res.status(500).json({ error: 'Failed to get security stats' });
  }
});

router.get('/api/security/events', [
  requireAdminWeb, 
  preventSQLInjection
], async (req, res) => {
  try {
    const SecurityService = require('../services/securityService');
    const events = await SecurityService.getRecentSecurityEvents(50);
    res.json(events);
  } catch (error) {
    console.error('Error getting security events:', error);
    res.status(500).json({ error: 'Failed to get security events' });
  }
});

router.get('/api/security/blocked-ips', [
  requireAdminWeb, 
  preventSQLInjection
], async (req, res) => {
  try {
    const SecurityService = require('../services/securityService');
    const blockedIPs = await SecurityService.getBlockedIPs();
    res.json(blockedIPs);
  } catch (error) {
    console.error('Error getting blocked IPs:', error);
    res.status(500).json({ error: 'Failed to get blocked IPs' });
  }
});

router.post('/api/security/unblock-ip', [
  requireAdminWeb, 
  strictRateLimit,
  preventSQLInjection,
  body('ip').isIP().withMessage('Valid IP address is required'),
  validateInput
], async (req, res) => {
  try {
    const SecurityService = require('../services/securityService');
    const { ip } = req.body;
    
    await SecurityService.unblockIP(ip);
    
    // Log security event
    await SecurityService.logSecurityEvent('ip_unblocked', req, { ip });
    
    res.json({ message: 'IP address unblocked successfully' });
  } catch (error) {
    console.error('Error unblocking IP:', error);
    res.status(500).json({ error: 'Failed to unblock IP address' });
  }
});

router.get('/api/security/export-report', [
  requireAdminWeb, 
  preventSQLInjection
], async (req, res) => {
  try {
    const SecurityService = require('../services/securityService');
    const report = await SecurityService.generateSecurityReport(30);
    
    // For now, return JSON. In production, you might want to generate a PDF
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="security-report-${new Date().toISOString().split('T')[0]}.json"`);
    res.json(report);
  } catch (error) {
    console.error('Error exporting security report:', error);
    res.status(500).json({ error: 'Failed to export security report' });
  }
});

// RBAC Management Routes
router.get('/rbac', [
  requireAdminWeb,
  addUserPermissions,
  hasModuleActionPermissionWeb('rbac', 'view'),
  loadSettings
], (req, res) => {
  res.render('admin/rbac/dashboard', {
    title: 'RBAC Management',
    userPermissions: req.userPermissions,
    userPrimaryRole: req.userPrimaryRole
  });
});


// RBAC Roles data endpoint for AJAX requests
router.get('/rbac/roles/data', addUserPermissions, hasModuleActionPermissionWeb('rbac', 'view'), async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const offset = (page - 1) * limit;
    const search = req.query.search || '';
    const status = req.query.status || req.query.statusFilter || '';
    const sort = req.query.sort || 'display_name';
    const order = req.query.order || 'asc';
    
    const Role = require('../models/Role');
    
    // Use the Role model with search and sorting functionality
    const roles = await Role.findAll({
      search: search,
      is_active: status === 'active' ? 1 : status === 'inactive' ? 0 : null,
      sort: sort,
      order: order,
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
    if (status === 'active') {
      whereConditions.push('r.is_active = 1');
    } else if (status === 'inactive') {
      whereConditions.push('r.is_active = 0');
    }
    
    // Build WHERE clause for count
    if (whereConditions.length > 0) {
      countQuery += ' WHERE ' + whereConditions.join(' AND ');
    }
    
    const db = require('../config/database');
    const [countResult] = await db.execute(countQuery, countParams);
    const totalRoles = countResult[0].total;
    const totalPages = Math.ceil(totalRoles / limit);
    
    res.json({
      success: true,
      data: roles,
      pagination: {
        currentPage: page,
        totalPages: totalPages,
        totalItems: totalRoles,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('Error getting roles data:', error);
    res.status(500).json({
      success: false,
      message: 'Error loading roles data'
    });
  }
});

router.get('/rbac/roles', addUserPermissions, hasModuleActionPermissionWeb('rbac', 'view'), async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const offset = (page - 1) * limit;
    const search = req.query.search || '';
    const status = req.query.status || 'all';
    
    const Role = require('../models/Role');
    
    // Use the Role model with search functionality (same as AJAX endpoint)
    const roles = await Role.findAll({
      search: search,
      is_active: status === 'active' ? 1 : status === 'inactive' ? 0 : null,
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
    if (status === 'active') {
      whereConditions.push('r.is_active = 1');
    } else if (status === 'inactive') {
      whereConditions.push('r.is_active = 0');
    }
    
    // Build WHERE clause
    if (whereConditions.length > 0) {
      countQuery += ' WHERE ' + whereConditions.join(' AND ');
    }
    
    const db = require('../config/database');
    const [countResult] = await db.execute(countQuery, countParams);
    const totalRoles = countResult[0].total;
    const totalPages = Math.ceil(totalRoles / limit);
    
    // Calculate pagination info
    const startItem = offset + 1;
    const endItem = Math.min(offset + limit, totalRoles);
    const startPage = Math.max(1, page - 2);
    const endPage = Math.min(totalPages, page + 2);
    
    res.render('admin/rbac/roles', {
      title: 'Roles Management',
      data: roles,
      userPermissions: req.userPermissions || [],
      userPrimaryRole: req.userPrimaryRole || { name: 'admin', display_name: 'Administrator' },
      pagination: {
        currentPage: page,
        totalPages: totalPages,
        totalItems: totalRoles,
        hasNext: page < totalPages,
        hasPrev: page > 1,
        startItem: startItem,
        endItem: endItem,
        startPage: startPage,
        endPage: endPage
      },
      search: search,
      filters: {
        statusFilter: status
      }
    });
  } catch (error) {
    console.error('Error loading roles page:', error);
    res.render('admin/rbac/roles', {
      title: 'Roles Management',
      data: [],
      userPermissions: [],
      userPrimaryRole: { name: 'admin', display_name: 'Administrator' },
      pagination: { currentPage: 1, totalPages: 1, totalItems: 0, hasNext: false, hasPrev: false },
      search: '',
      filters: {}
    });
  }
});

// RBAC Permissions data endpoint for AJAX requests
router.get('/rbac/permissions/data', addUserPermissions, hasModuleActionPermissionWeb('rbac', 'view'), async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const offset = (page - 1) * limit;
    const search = req.query.search || '';
    const module = req.query.module || req.query.moduleFilter || '';
    const sort = req.query.sort || 'display_name';
    const order = req.query.order || 'asc';
    const Permission = require('../models/Permission');
    
    // Use the Permission model with search and sorting functionality
    const permissions = await Permission.findAll({
      search: search,
      module: module !== 'all' ? module : null,
      sort: sort,
      order: order,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
    
    // Get total count with search and module filters
    const totalPermissions = await Permission.getTotalCount({
      search: search,
      module: module !== 'all' ? module : null
    });
    
    const totalPages = Math.ceil(totalPermissions / limit);

    res.json({
      success: true,
      data: permissions,
      pagination: {
        currentPage: page,
        totalPages: totalPages,
        totalItems: totalPermissions,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('Error getting permissions data:', error);
    res.status(500).json({
      success: false,
      message: 'Error loading permissions data'
    });
  }
});

router.get('/rbac/permissions', addUserPermissions, hasModuleActionPermissionWeb('rbac', 'view'), async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const offset = (page - 1) * limit;
    const search = req.query.search || '';
    const module = req.query.module || 'all';
    
    const db = require('../config/database');
    
    // Build query with search and module filters
    let query = `
      SELECT p.*, m.display_name as module_display_name, ma.display_name as action_display_name
      FROM permissions p
      LEFT JOIN modules m ON p.module_id = m.id
      LEFT JOIN module_actions ma ON p.action_id = ma.id
    `;
    let countQuery = 'SELECT COUNT(*) as total FROM permissions p';
    let whereConditions = [];
    let queryParams = [];
    let countParams = [];
    
    // Search condition
    if (search) {
      whereConditions.push('(p.name LIKE ? OR p.display_name LIKE ? OR p.description LIKE ?)');
      queryParams.push(`%${search}%`, `%${search}%`, `%${search}%`);
      countParams.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    
    // Module filter
    if (module !== 'all') {
      whereConditions.push('p.module_id = ?');
      queryParams.push(module);
      countParams.push(module);
    }
    
    // Build WHERE clause
    if (whereConditions.length > 0) {
      const whereClause = ' WHERE ' + whereConditions.join(' AND ');
      query += whereClause;
      countQuery += whereClause;
    }
    
    // Add sorting and pagination
    query += ` ORDER BY p.created_at DESC LIMIT ${limit} OFFSET ${offset}`;
    
    const [permissions] = await db.execute(query, queryParams);
    const [countResult] = await db.execute(countQuery, countParams);
    const totalPermissions = countResult[0].total;
    const totalPages = Math.ceil(totalPermissions / limit);
    
    // Calculate pagination info
    const startItem = offset + 1;
    const endItem = Math.min(offset + limit, totalPermissions);
    const startPage = Math.max(1, page - 2);
    const endPage = Math.min(totalPages, page + 2);
    
    // Get modules for filter dropdown
    const Module = require('../models/Module');
    const modules = await Module.findAll();
    
    res.render('admin/rbac/permissions', {
      title: 'Permissions Management',
      data: permissions,
      modules: modules,
      userPermissions: req.userPermissions || [],
      userPrimaryRole: req.userPrimaryRole || { name: 'admin', display_name: 'Administrator' },
      pagination: {
        currentPage: page,
        totalPages: totalPages,
        totalItems: totalPermissions,
        hasNext: page < totalPages,
        hasPrev: page > 1,
        startItem: startItem,
        endItem: endItem,
        startPage: startPage,
        endPage: endPage
      },
      search: search,
      filters: {
        moduleFilter: module
      }
    });
  } catch (error) {
    console.error('Error loading permissions page:', error);
    res.render('admin/rbac/permissions', {
      title: 'Permissions Management',
      data: [],
      userPermissions: [],
      userPrimaryRole: { name: 'admin', display_name: 'Administrator' },
      pagination: { currentPage: 1, totalPages: 1, totalItems: 0, hasNext: false, hasPrev: false },
      search: '',
      filters: {}
    });
  }
});

router.get('/rbac/roles/:id/permissions', addUserPermissions, hasModuleActionPermissionWeb('rbac', 'view'), (req, res) => {
  res.render('admin/rbac/role-permissions', {
    title: 'Role Permissions',
    userPermissions: req.userPermissions,
    userPrimaryRole: req.userPrimaryRole
  });
});

// RBAC API Routes
router.use('/api/rbac', addUserPermissions, require('./rbac'));

// RBAC Migration (temporary endpoint)
router.post('/api/rbac/migrate', [
  requireAdminWeb,
  addUserPermissions
], adminController.runRBACMigration);

// ==================== MODULE MANAGEMENT ====================

// RBAC Modules data endpoint for AJAX requests
router.get('/rbac/modules/data', addUserPermissions, hasModuleActionPermissionWeb('rbac.modules', 'view'), async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const offset = (page - 1) * limit;
    const search = req.query.search || '';
    const sort = req.query.sort || 'order_index';
    const order = req.query.order || 'asc';
    const Module = require('../models/Module');
    
    // Use the Module model with search and sorting functionality
    const modules = await Module.findAll({
      search: search,
      sort: sort,
      order: order,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
    
    // Get total count with search filters
    const db = require('../config/database');
    let countQuery = 'SELECT COUNT(*) as total FROM modules m WHERE m.is_active = 1';
    const countParams = [];
    
    // Search condition
    if (search && search.trim()) {
      countQuery += ' AND (m.name LIKE ? OR m.display_name LIKE ? OR m.description LIKE ?)';
      const searchTerm = `%${search.trim()}%`;
      countParams.push(searchTerm, searchTerm, searchTerm);
    }
    
    const [countResult] = await db.execute(countQuery, countParams);
    const totalModules = countResult[0].total;
    const totalPages = Math.ceil(totalModules / limit);
    
    
    res.json({
      success: true,
      data: modules,
      pagination: {
        currentPage: page,
        totalPages: totalPages,
        totalItems: totalModules,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error loading modules data'
    });
  }
});

// Module management page
router.get('/rbac/modules', addUserPermissions, hasModuleActionPermissionWeb('rbac.modules', 'view'), async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const offset = (page - 1) * limit;
    const search = req.query.search || '';
    
    const db = require('../config/database');
    
    // Build base query with counts
    let baseQuery = `
        SELECT m.*, 
               COUNT(DISTINCT ma.id) as action_count,
               COUNT(DISTINCT p.id) as permission_count
        FROM modules m
        LEFT JOIN module_actions ma ON m.id = ma.module_id AND ma.is_active = 1
        LEFT JOIN permissions p ON m.id = p.module_id AND p.is_active = 1
        WHERE m.is_active = 1
    `;
    
    let countQuery = 'SELECT COUNT(*) as total FROM modules m WHERE m.is_active = 1';
    let whereConditions = [];
    let queryParams = [];
    let countParams = [];
    
    // Search condition
    if (search) {
      whereConditions.push('(m.name LIKE ? OR m.display_name LIKE ? OR m.description LIKE ?)');
      queryParams.push(`%${search}%`, `%${search}%`, `%${search}%`);
      countParams.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    
    // Build WHERE clause
    if (whereConditions.length > 0) {
      const whereClause = ' AND ' + whereConditions.join(' AND ');
      baseQuery += whereClause;
      countQuery += whereClause;
    }
    
    // Add GROUP BY and ORDER BY for main query
    baseQuery += ` GROUP BY m.id ORDER BY m.order_index ASC, m.display_name ASC LIMIT ${limit} OFFSET ${offset}`;
    
    const [rows] = await db.execute(baseQuery, queryParams);
    const [countResult] = await db.execute(countQuery, countParams);
    const totalModules = countResult[0].total;
    const totalPages = Math.ceil(totalModules / limit);
    
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
    
    // Calculate pagination info
    const startItem = offset + 1;
    const endItem = Math.min(offset + limit, totalModules);
    const startPage = Math.max(1, page - 2);
    const endPage = Math.min(totalPages, page + 2);
    
    res.render('admin/rbac/modules', {
      title: 'Module Management',
      data: modules,
      userPermissions: req.userPermissions || [],
      userPrimaryRole: req.userPrimaryRole || { name: 'admin', display_name: 'Administrator' },
      pagination: {
        currentPage: page,
        totalPages: totalPages,
        totalItems: totalModules,
        hasNext: page < totalPages,
        hasPrev: page > 1,
        startItem: startItem,
        endItem: endItem,
        startPage: startPage,
        endPage: endPage
      },
      search: search,
      filters: {}
    });
  } catch (error) {
    console.error('Error loading modules page:', error);
    res.render('admin/rbac/modules', {
      title: 'Module Management',
      data: [],
      userPermissions: [],
      userPrimaryRole: { name: 'admin', display_name: 'Administrator' },
      pagination: { currentPage: 1, totalPages: 1, totalItems: 0, hasNext: false, hasPrev: false },
      search: '',
      filters: {}
    });
  }
});

// Module actions management page
router.get('/rbac/modules/:id/actions', addUserPermissions, hasModuleActionPermissionWeb('rbac.modules', 'view'), async (req, res) => {
  try {
    const { id } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const offset = (page - 1) * limit;
    const search = req.query.search || '';
    
    const Module = require('../models/Module');
    const db = require('../config/database');
    
    // Get module details
    const module = await Module.findById(id);
    if (!module) {
      return res.status(404).render('error', {
        title: 'Module Not Found',
        message: 'The requested module was not found.'
      });
    }
    
    // Build query for module actions with search (show all actions, active and inactive)
    let query = 'SELECT * FROM module_actions WHERE module_id = ?';
    let countQuery = 'SELECT COUNT(*) as total FROM module_actions WHERE module_id = ?';
    let queryParams = [id];
    let countParams = [id];
    
    // Search condition
    if (search) {
      query += ' AND (name LIKE ? OR display_name LIKE ? OR description LIKE ?)';
      countQuery += ' AND (name LIKE ? OR display_name LIKE ? OR description LIKE ?)';
      queryParams.push(`%${search}%`, `%${search}%`, `%${search}%`);
      countParams.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    
    // Add sorting and pagination
    query += ` ORDER BY name ASC LIMIT ${limit} OFFSET ${offset}`;
    
    const [actions] = await db.execute(query, queryParams);
    const [countResult] = await db.execute(countQuery, countParams);
    const totalActions = countResult[0].total;
    const totalPages = Math.ceil(totalActions / limit);
    
    // Calculate pagination info
    const startItem = offset + 1;
    const endItem = Math.min(offset + limit, totalActions);
    const startPage = Math.max(1, page - 2);
    const endPage = Math.min(totalPages, page + 2);
    
    res.render('admin/rbac/module-actions', {
      title: `Module Actions - ${module.display_name}`,
      module: module,
      data: actions,
      userPermissions: req.userPermissions || [],
      userPrimaryRole: req.userPrimaryRole || { name: 'admin', display_name: 'Administrator' },
      pagination: {
        currentPage: page,
        totalPages: totalPages,
        totalItems: totalActions,
        hasNext: page < totalPages,
        hasPrev: page > 1,
        startItem: startItem,
        endItem: endItem,
        startPage: startPage,
        endPage: endPage
      },
      search: search,
      filters: {}
    });
  } catch (error) {
    console.error('Error loading module actions page:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'An error occurred while loading the module actions page.'
    });
  }
});

// AJAX endpoint for module actions data
router.get('/rbac/modules/:id/actions/data', addUserPermissions, hasModuleActionPermissionWeb('rbac.modules', 'view'), async (req, res) => {
  try {
    const { id } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const search = req.query.search || '';
    const sort = req.query.sort || 'name';
    const order = req.query.order || 'asc';
    
    const db = require('../config/database');
    
    // Build query for module actions with search
    let query = 'SELECT * FROM module_actions WHERE module_id = ?';
    let countQuery = 'SELECT COUNT(*) as total FROM module_actions WHERE module_id = ?';
    let queryParams = [id];
    let countParams = [id];
    
    // Search condition
    if (search) {
      query += ' AND (name LIKE ? OR display_name LIKE ? OR description LIKE ?)';
      countQuery += ' AND (name LIKE ? OR display_name LIKE ? OR description LIKE ?)';
      queryParams.push(`%${search}%`, `%${search}%`, `%${search}%`);
      countParams.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    
    // Add sorting and pagination
    const validSortColumns = ['id', 'name', 'display_name', 'description', 'is_active'];
    const sortColumn = validSortColumns.includes(sort) ? sort : 'name';
    const sortOrder = order.toLowerCase() === 'desc' ? 'DESC' : 'ASC';
    query += ` ORDER BY ${sortColumn} ${sortOrder} LIMIT ${limit} OFFSET ${offset}`;
    
    const [actions] = await db.execute(query, queryParams);
    const [countResult] = await db.execute(countQuery, countParams);
    const totalActions = countResult[0].total;
    const totalPages = Math.ceil(totalActions / limit);
    
    // Calculate pagination info
    const startItem = offset + 1;
    const endItem = Math.min(offset + limit, totalActions);
    
    res.json({
      success: true,
      data: actions,
      pagination: {
        currentPage: page,
        totalPages: totalPages,
        totalItems: totalActions,
        itemsPerPage: limit,
        startItem: startItem,
        endItem: endItem,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('Error fetching module actions data:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching module actions data'
    });
  }
});

module.exports = router;
