const db = require('../config/database');
const UserRole = require('../models/UserRole');
const Role = require('../models/Role');
const { checkPermission, checkModulePermission, getUserRoleName } = require('../middleware/rbac');
const TableUtils = require('../utils/tableUtils');
const S3Service = require('../services/s3Service');

class AdminController {
  // Dashboard
  async dashboard(req, res) {
    try {
      // Get statistics
      const [userStats] = await db.execute('SELECT COUNT(*) as total FROM users');
      const [mediaStats] = await db.execute('SELECT COUNT(*) as total FROM media');
      const [videoStats] = await db.execute('SELECT COUNT(*) as total FROM media WHERE media_type = ?', ['video']);
      const [audioStats] = await db.execute('SELECT COUNT(*) as total FROM media WHERE media_type = ?', ['audio']);

      // Get recent users (all users, not just regular users)
      const [recentUsers] = await db.execute(
        'SELECT u.id, u.name, u.email, u.created_at, r.display_name as role_name FROM users u LEFT JOIN user_roles ur ON u.id = ur.user_id AND ur.is_active = 1 LEFT JOIN roles r ON ur.role_id = r.id ORDER BY u.created_at DESC LIMIT 5'
      );

      // Get recent media
      const [recentMedia] = await db.execute(
        'SELECT id, title, media_type, scanning_image, created_at FROM media ORDER BY created_at DESC LIMIT 5'
      );

      const stats = {
        totalUsers: userStats[0].total,
        totalMedia: mediaStats[0].total,
        totalVideos: videoStats[0].total,
        totalAudio: audioStats[0].total
      };

      res.render('admin/dashboard', {
        title: 'Dashboard',
        stats,
        recentUsers,
        recentMedia
      });
    } catch (error) {
      console.error('Dashboard error:', error);
      req.flash('error_msg', 'Error loading dashboard');
      res.render('admin/dashboard', {
        title: 'Dashboard',
        stats: { totalUsers: 0, totalMedia: 0, totalVideos: 0, totalAudio: 0 },
        recentUsers: [],
        recentMedia: []
      });
    }
  }

  // Get users data for AJAX requests
  async getUsersData(req, res) {
    try {
      console.log('getUsersData called with query params:', req.query);
      
      const page = parseInt(req.query.page) || 1;
      const limit = 10;
      const offset = (page - 1) * limit;
      const search = req.query.search || '';
      const status = req.query.status || req.query.statusFilter || '';
      const role = req.query.role || req.query.roleFilter || '';
      const sort = req.query.sort || 'created_at';
      const order = req.query.order || 'desc';
      
      console.log('Processed params - page:', page, 'search:', search, 'status:', status, 'role:', role, 'sort:', sort, 'order:', order);

      // Build query with RBAC joins
      let query = `
        SELECT DISTINCT u.id, u.name, u.email, u.is_active, u.is_blocked, u.created_at, u.updated_at,
               r.id as role_id, r.name as role, r.display_name as role_display_name
        FROM users u
        LEFT JOIN user_roles ur ON u.id = ur.user_id AND ur.is_active = 1
        LEFT JOIN roles r ON ur.role_id = r.id
      `;
      
      let countQuery = `
        SELECT COUNT(DISTINCT u.id) as total 
        FROM users u
        LEFT JOIN user_roles ur ON u.id = ur.user_id AND ur.is_active = 1
        LEFT JOIN roles r ON ur.role_id = r.id
      `;
      
      let whereConditions = [];
      let queryParams = [];
      let countParams = [];

      // Search condition
      if (search) {
        whereConditions.push('(u.name LIKE ? OR u.email LIKE ?)');
        queryParams.push(`%${search}%`, `%${search}%`);
        countParams.push(`%${search}%`, `%${search}%`);
      }

      // Status filter
      if (status) {
        if (status === 'active') {
          whereConditions.push('u.is_active = 1 AND u.is_blocked = 0');
        } else if (status === 'blocked') {
          whereConditions.push('u.is_blocked = 1');
        } else if (status === 'inactive') {
          whereConditions.push('u.is_active = 0 AND u.is_blocked = 0');
        }
      }

      // Role filter - now using role ID
      if (role) {
        whereConditions.push('r.id = ?');
        queryParams.push(role);
        countParams.push(role);
      }

      // Build WHERE clause
      if (whereConditions.length > 0) {
        const whereClause = ' WHERE ' + whereConditions.join(' AND ');
        query += whereClause;
        countQuery += whereClause;
      }

      // Add sorting
      const validSortColumns = ['name', 'email', 'role', 'created_at', 'updated_at', 'status'];
      const sortColumn = validSortColumns.includes(sort) ? sort : 'created_at';
      const sortOrder = order.toLowerCase() === 'asc' ? 'ASC' : 'DESC';
      
      // Handle status sorting specially since it's a virtual column
      if (sortColumn === 'status') {
        query += ` ORDER BY u.is_active ${sortOrder}, u.is_blocked ${sortOrder === 'ASC' ? 'DESC' : 'ASC'}`;
      } else if (sortColumn === 'role') {
        query += ` ORDER BY r.display_name ${sortOrder}`;
      } else {
        query += ` ORDER BY u.${sortColumn} ${sortOrder}`;
      }

      // Add pagination
      query += ` LIMIT ${limit} OFFSET ${offset}`;

      const [users] = await db.execute(query, queryParams);
      const [countResult] = await db.execute(countQuery, countParams);
      const totalUsers = countResult[0].total;
      const totalPages = Math.ceil(totalUsers / limit);

      console.log('Users data query result:', users);
      console.log('Total users:', totalUsers, 'Total pages:', totalPages);

      res.json({
        success: true,
        data: users,
        pagination: {
          currentPage: page,
          totalPages: totalPages,
          totalItems: totalUsers,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      });
    } catch (error) {
      console.error('Error getting users data:', error);
      res.status(500).json({
        success: false,
        message: 'Error loading users data'
      });
    }
  }

  // Get users page
  async getUsers(req, res) {
    try {
      console.log('getUsers called with query params:', req.query);
      
      const page = parseInt(req.query.page) || 1;
      const limit = 10;
      const offset = (page - 1) * limit;
      const search = req.query.search || '';
      const status = req.query.status || req.query.statusFilter || '';
      const role = req.query.role || req.query.roleFilter || '';
      
      console.log('Processed params - page:', page, 'limit:', limit, 'search:', search, 'status:', status, 'role:', role);

      // Build query with RBAC joins
      let query = `
        SELECT DISTINCT u.id, u.name, u.email, u.is_active, u.is_blocked, u.created_at, u.updated_at,
               r.id as role_id, r.name as role, r.display_name as role_display_name
        FROM users u
        LEFT JOIN user_roles ur ON u.id = ur.user_id AND ur.is_active = 1
        LEFT JOIN roles r ON ur.role_id = r.id
      `;
      
      let countQuery = `
        SELECT COUNT(DISTINCT u.id) as total 
        FROM users u
        LEFT JOIN user_roles ur ON u.id = ur.user_id AND ur.is_active = 1
        LEFT JOIN roles r ON ur.role_id = r.id
      `;
      
      let whereConditions = [];
      let queryParams = [];
      let countParams = [];

      // Search condition
      if (search) {
        whereConditions.push('(u.name LIKE ? OR u.email LIKE ?)');
        queryParams.push(`%${search}%`, `%${search}%`);
        countParams.push(`%${search}%`, `%${search}%`);
      }

      // Status filter
      if (status) {
        if (status === 'active') {
          whereConditions.push('u.is_active = 1 AND u.is_blocked = 0');
        } else if (status === 'blocked') {
          whereConditions.push('u.is_blocked = 1');
        } else if (status === 'inactive') {
          whereConditions.push('u.is_active = 0 AND u.is_blocked = 0');
        }
      }

      // Role filter - now using role ID
      if (role) {
        whereConditions.push('r.id = ?');
        queryParams.push(role);
        countParams.push(role);
      }

      // Build WHERE clause
      if (whereConditions.length > 0) {
        const whereClause = ' WHERE ' + whereConditions.join(' AND ');
        query += whereClause;
        countQuery += whereClause;
      }

      // Add sorting and pagination
      query += ` ORDER BY u.created_at DESC LIMIT ${limit} OFFSET ${offset}`;

      const [users] = await db.execute(query, queryParams);
      const [countResult] = await db.execute(countQuery, countParams);
      const totalUsers = countResult[0].total;
      const totalPages = Math.ceil(totalUsers / limit);

      console.log('Users query result:', users);
      console.log('Total users:', totalUsers, 'Total pages:', totalPages);

      // Get all roles for filter dropdown
      const roles = await Role.findAll({ is_active: 1 });
      console.log('Available roles:', roles);

      // Generate pagination HTML
      const pagination = AdminController.generatePagination(page, totalPages, totalUsers, limit);

      res.render('admin/users', {
        title: 'User Management',
        data: users,
        roles: roles,
        pagination: pagination,
        search: search,
        filters: { roleFilter: role, statusFilter: status }
      });
    } catch (error) {
      console.error('Error getting users:', error);
      req.flash('error_msg', 'Error loading users');
      res.render('admin/users', {
        title: 'User Management',
        data: [],
        roles: [],
        pagination: '',
        search: '',
        filters: { roleFilter: '' }
      });
    }
  }

  // Generate pagination HTML
  static generatePagination(currentPage, totalPages, totalItems, limit) {
    if (totalPages <= 1) return '';

    let pagination = '<div class="flex items-center justify-between px-4 py-3 bg-white border-t border-gray-200 sm:px-6">';
    pagination += '<div class="flex items-center justify-between flex-1 sm:justify-between">';
    
    // Previous button
    if (currentPage > 1) {
      pagination += `<button onclick="goToPage(${currentPage - 1})" class="relative inline-flex items-center px-4 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50">Previous</button>`;
    } else {
      pagination += '<span class="relative inline-flex items-center px-4 py-2 text-sm font-medium text-gray-300 bg-white border border-gray-300 rounded-md cursor-not-allowed">Previous</span>';
    }

    // Page numbers
    pagination += '<div class="hidden sm:flex-1 sm:flex sm:items-center sm:justify-center">';
    pagination += '<div class="flex items-center space-x-1">';
    
    for (let i = Math.max(1, currentPage - 2); i <= Math.min(totalPages, currentPage + 2); i++) {
      if (i === currentPage) {
        pagination += `<span class="relative inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md">${i}</span>`;
      } else {
        pagination += `<button onclick="goToPage(${i})" class="relative inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">${i}</button>`;
      }
    }
    
    pagination += '</div>';
    pagination += '</div>';

    // Next button
    if (currentPage < totalPages) {
      pagination += `<button onclick="goToPage(${currentPage + 1})" class="relative inline-flex items-center px-4 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50">Next</button>`;
    } else {
      pagination += '<span class="relative inline-flex items-center px-4 py-2 text-sm font-medium text-gray-300 bg-white border border-gray-300 rounded-md cursor-not-allowed">Next</span>';
    }

    pagination += '</div>';
    pagination += '</div>';

    return pagination;
  }

  // Update user
  async updateUser(req, res) {
    try {
      const { id } = req.params;
      const { name, email, role_id, status } = req.body;

      // Validate required fields
      if (!name || !email) {
        return res.status(400).json({
          success: false,
          message: 'Name and email are required'
        });
      }

      // Check if email already exists for another user
      const [existingUsers] = await db.execute(
        'SELECT id FROM users WHERE email = ? AND id != ?',
        [email, id]
      );

      if (existingUsers.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Email already exists'
        });
      }

      // Update user basic information
      const [result] = await db.execute(
        'UPDATE users SET name = ?, email = ?, updated_at = NOW() WHERE id = ?',
        [name, email, id]
      );

      if (result.affectedRows === 0) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Update user role if provided
      if (role_id) {
        await UserRole.updateUserPrimaryRole(id, role_id);
      }

      // Update user status
      if (status) {
        let isActive = 1;
        let isBlocked = 0;

        if (status === 'inactive') {
          isActive = 0;
        } else if (status === 'blocked') {
          isBlocked = 1;
        }

        await db.execute(
          'UPDATE users SET is_active = ?, is_blocked = ? WHERE id = ?',
          [isActive, isBlocked, id]
        );
      }

      res.json({
        success: true,
        message: 'User updated successfully'
      });
    } catch (error) {
      console.error('Error updating user:', error);
      res.status(500).json({
        success: false,
        message: 'Error updating user'
      });
    }
  }

  // Delete user
  async deleteUser(req, res) {
    try {
      const { id } = req.params;

      const [result] = await db.execute('DELETE FROM users WHERE id = ?', [id]);

      if (result.affectedRows === 0) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      res.json({
        success: true,
        message: 'User deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting user:', error);
      res.status(500).json({
        success: false,
        message: 'Error deleting user'
      });
    }
  }

  // Block/Unblock user
  async toggleUserStatus(req, res) {
    try {
      const { id } = req.params;
      const { action } = req.body;

      let isBlocked = action === 'block' ? 1 : 0;

      const [result] = await db.execute(
        'UPDATE users SET is_blocked = ?, updated_at = NOW() WHERE id = ?',
        [isBlocked, id]
      );

      if (result.affectedRows === 0) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      res.json({
        success: true,
        message: `User ${action}ed successfully`
      });
    } catch (error) {
      console.error('Error toggling user status:', error);
      res.status(500).json({
        success: false,
        message: 'Error updating user status'
      });
    }
  }

  // Get user by ID
  async getUser(req, res) {
    try {
      const { id } = req.params;
      
      const query = `
        SELECT u.id, u.name, u.email, u.is_active, u.is_blocked, u.created_at, u.updated_at,
               r.id as role_id, r.name as role, r.display_name as role_display_name
        FROM users u
        LEFT JOIN user_roles ur ON u.id = ur.user_id AND ur.is_active = 1
        LEFT JOIN roles r ON ur.role_id = r.id
        WHERE u.id = ?
      `;
      
      const [users] = await db.execute(query, [id]);
      
      if (users.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }
      
      res.json({
        success: true,
        data: users[0]
      });
    } catch (error) {
      console.error('Error getting user:', error);
      res.status(500).json({
        success: false,
        message: 'Error loading user'
      });
    }
  }

  // Block user
  async blockUser(req, res) {
    try {
      console.log('blockUser called with params:', req.params);
      console.log('blockUser request body:', req.body);
      
      const { id } = req.params;
      
      const [result] = await db.execute(
        'UPDATE users SET is_blocked = 1, updated_at = NOW() WHERE id = ?',
        [id]
      );
      
      console.log('Block user query result:', result);
      
      if (result.affectedRows === 0) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }
      
      res.json({
        success: true,
        message: 'User blocked successfully'
      });
    } catch (error) {
      console.error('Error blocking user:', error);
      res.status(500).json({
        success: false,
        message: 'Error blocking user'
      });
    }
  }

  // Unblock user
  async unblockUser(req, res) {
    try {
      console.log('unblockUser called with params:', req.params);
      console.log('unblockUser request body:', req.body);
      
      const { id } = req.params;
      
      const [result] = await db.execute(
        'UPDATE users SET is_blocked = 0, updated_at = NOW() WHERE id = ?',
        [id]
      );
      
      console.log('Unblock user query result:', result);
      
      if (result.affectedRows === 0) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }
      
      res.json({
        success: true,
        message: 'User unblocked successfully'
      });
    } catch (error) {
      console.error('Error unblocking user:', error);
      res.status(500).json({
        success: false,
        message: 'Error unblocking user'
      });
    }
  }

  // Settings
  async settings(req, res) {
    try {
      res.render('admin/settings', {
        title: 'Settings'
      });
    } catch (error) {
      console.error('Error loading settings:', error);
      req.flash('error_msg', 'Error loading settings');
      res.render('admin/settings', {
        title: 'Settings'
      });
    }
  }

  // Update settings
  async updateSettings(req, res) {
    try {
      const settingsType = req.headers['x-settings-type'] || 'general';
      const { logoUpload } = require('../config/multer');
      
      console.log('Settings update request - Type:', settingsType);
      console.log('Settings update request - Headers:', req.headers);
      console.log('Settings update request - Body:', req.body);
      console.log('Settings update request - Files:', req.files);
      console.log('Settings update request - File:', req.file);
      
      // Handle different settings types
      if (settingsType === 'brand') {
        // Handle brand settings with potential logo upload
        logoUpload(req, res, async (err) => {
          if (err) {
            console.error('Upload error:', err);
            return res.status(400).json({
              success: false,
              message: err.message
            });
          }
          
          try {
            const { site_name, site_tagline, primary_color } = req.body;
            let logoPath = null;
            
            console.log('Brand settings update - req.file:', req.file);
            console.log('Brand settings update - req.body:', req.body);
            
            // Handle logo upload to S3
            if (req.file) {
              console.log('Logo file received:', {
                originalname: req.file.originalname,
                mimetype: req.file.mimetype,
                size: req.file.size,
                buffer: req.file.buffer ? 'Buffer exists' : 'No buffer',
                fieldname: req.file.fieldname
              });
              
              // Upload logo to S3
              console.log('Calling S3Service.uploadFile...');
              const uploadResult = await S3Service.uploadFile(req.file, 'logos');
              
              if (uploadResult.success) {
                logoPath = uploadResult.url;
                console.log('Logo uploaded to S3 successfully:', logoPath);
                
                // Delete old logo from S3 if exists
                const [oldSettings] = await db.execute('SELECT logo_path FROM settings LIMIT 1');
                if (oldSettings.length > 0 && oldSettings[0].logo_path) {
                  const deleteResult = await S3Service.deleteFile(oldSettings[0].logo_path);
                  if (deleteResult.success) {
                    console.log('Old logo deleted from S3:', oldSettings[0].logo_path);
                  } else {
                    console.log('Failed to delete old logo from S3:', deleteResult.error);
                  }
                }
              } else {
                console.error('Failed to upload logo to S3:', uploadResult.error);
                return res.status(500).json({
                  success: false,
                  message: 'Failed to upload logo to cloud storage'
                });
              }
            } else {
              console.log('No logo file uploaded');
            }
            
            // Update or insert settings
            const [existingSettings] = await db.execute('SELECT id FROM settings LIMIT 1');
            
            console.log('Database update - existingSettings:', existingSettings.length);
            console.log('Database update - logoPath:', logoPath);
            console.log('Database update - site_name:', site_name);
            console.log('Database update - site_tagline:', site_tagline);
            console.log('Database update - primary_color:', primary_color);
            
            if (existingSettings.length > 0) {
              // Update existing settings
              const updateFields = ['site_name = ?', 'site_tagline = ?', 'primary_color = ?'];
              const updateValues = [site_name, site_tagline, primary_color];
              
              if (logoPath) {
                updateFields.push('logo_path = ?');
                updateValues.push(logoPath);
                console.log('Adding logo_path to update:', logoPath);
              }
              
              updateValues.push(existingSettings[0].id);
              
              console.log('Update query:', `UPDATE settings SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`);
              console.log('Update values:', updateValues);
              
              await db.execute(
                `UPDATE settings SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
                updateValues
              );
              
              console.log('Settings updated successfully');
            } else {
              // Insert new settings
              console.log('Inserting new settings with logoPath:', logoPath);
              await db.execute(
                'INSERT INTO settings (site_name, site_tagline, primary_color, logo_path, created_at, updated_at) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)',
                [site_name, site_tagline, primary_color, logoPath]
              );
              
              console.log('Settings inserted successfully');
            }
            
            res.json({
              success: true,
              message: 'Brand settings saved successfully'
            });
          } catch (error) {
            console.error('Brand settings error:', error);
            res.status(500).json({
              success: false,
              message: 'Error saving brand settings'
            });
          }
        });
      } else {
        // Handle other settings types (system, aws, security, email)
        const settingsData = req.body;
        
        // Update or insert settings based on type
        const [existingSettings] = await db.execute('SELECT id FROM settings LIMIT 1');
        
        if (existingSettings.length > 0) {
          // Update existing settings
          const updateFields = [];
          const updateValues = [];
          
          Object.keys(settingsData).forEach(key => {
            updateFields.push(`${key} = ?`);
            updateValues.push(settingsData[key]);
          });
          
          updateValues.push(existingSettings[0].id);
          
          await db.execute(
            `UPDATE settings SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
            updateValues
          );
        } else {
          // Insert new settings
          const fields = Object.keys(settingsData);
          const values = Object.values(settingsData);
          const placeholders = fields.map(() => '?').join(', ');
          
          await db.execute(
            `INSERT INTO settings (${fields.join(', ')}, created_at, updated_at) VALUES (${placeholders}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
            values
          );
        }
        
        res.json({
          success: true,
          message: `${settingsType.charAt(0).toUpperCase() + settingsType.slice(1)} settings saved successfully`
        });
      }
    } catch (error) {
      console.error('Error updating settings:', error);
      req.flash('error_msg', 'Error updating settings');
      res.redirect('/admin/settings');
    }
  }

  // Profile
  async profile(req, res) {
    try {
      res.render('admin/profile', {
        title: 'Profile'
      });
    } catch (error) {
      console.error('Error loading profile:', error);
      req.flash('error_msg', 'Error loading profile');
      res.render('admin/profile', {
        title: 'Profile'
      });
    }
  }

  // Update profile
  async updateProfile(req, res) {
    try {
      // TODO: Implement profile update
      req.flash('success_msg', 'Profile updated successfully');
      res.redirect('/admin/profile');
    } catch (error) {
      console.error('Error updating profile:', error);
      req.flash('error_msg', 'Error updating profile');
      res.redirect('/admin/profile');
    }
  }

  // Run RBAC migration
  async runRBACMigration(req, res) {
    try {
      const { runMigration } = require('../../database/run_rbac_migration');
      await runMigration();
      
      res.json({
        success: true,
        message: 'RBAC migration completed successfully'
      });
    } catch (error) {
      console.error('RBAC migration error:', error);
      res.status(500).json({
        success: false,
        message: 'RBAC migration failed',
        error: error.message
      });
    }
  }
}

module.exports = new AdminController();
