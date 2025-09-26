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
        recentMedia,
        userPermissions: req.userPermissions || [],
        userPrimaryRole: req.userPrimaryRole || null
      });
    } catch (error) {
      console.error('Dashboard error:', error);
      req.flash('error_msg', 'Error loading dashboard');
      res.render('admin/dashboard', {
        title: 'Dashboard',
        stats: { totalUsers: 0, totalMedia: 0, totalVideos: 0, totalAudio: 0 },
        recentUsers: [],
        recentMedia: [],
        userPermissions: req.userPermissions || [],
        userPrimaryRole: req.userPrimaryRole || null
      });
    }
  }

  // Get users data for AJAX requests
  async getUsersData(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = 10;
      const offset = (page - 1) * limit;
      const search = req.query.search || '';
      const status = req.query.status || req.query.statusFilter || '';
      const role = req.query.role || req.query.roleFilter || '';
      const sort = req.query.sort || 'created_at';
      const order = req.query.order || 'desc';

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
      const page = parseInt(req.query.page) || 1;
      const limit = 10;
      const offset = (page - 1) * limit;
      const search = req.query.search || '';
      const status = req.query.status || req.query.statusFilter || '';
      const role = req.query.role || req.query.roleFilter || '';
      
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

      // Get all roles for filter dropdown
      const roles = await Role.findAll({ is_active: 1 });

      // Generate pagination HTML
      const pagination = AdminController.generatePagination(page, totalPages, totalUsers, limit);

      res.render('admin/users', {
        title: 'User Management',
        data: users,
        roles: roles,
        pagination: pagination,
        search: search,
        filters: { roleFilter: role, statusFilter: status },
        userPermissions: req.userPermissions || [],
        userPrimaryRole: req.userPrimaryRole || null
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
        filters: { roleFilter: '' },
        userPermissions: req.userPermissions || [],
        userPrimaryRole: req.userPrimaryRole || null
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

      // Check if user exists
      const [userCheck] = await db.execute('SELECT id FROM users WHERE id = ?', [id]);
      if (userCheck.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Use cascade deletion stored procedure
      await db.execute('CALL DeleteUserWithCascade(?)', [id]);

      res.json({
        success: true,
        message: 'User and all related data deleted successfully'
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
      const { id } = req.params;
      
      const [result] = await db.execute(
        'UPDATE users SET is_blocked = 1, updated_at = NOW() WHERE id = ?',
        [id]
      );
      
      
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
      
      const { id } = req.params;
      
      const [result] = await db.execute(
        'UPDATE users SET is_blocked = 0, updated_at = NOW() WHERE id = ?',
        [id]
      );
      
      
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
        title: 'Settings',
        userPermissions: req.userPermissions || [],
        userPrimaryRole: req.userPrimaryRole || null
      });
    } catch (error) {
      console.error('Error loading settings:', error);
      req.flash('error_msg', 'Error loading settings');
      res.render('admin/settings', {
        title: 'Settings',
        userPermissions: req.userPermissions || [],
        userPrimaryRole: req.userPrimaryRole || null
      });
    }
  }

  // Update settings
  async updateSettings(req, res) {
    try {
      const settingsType = req.headers['x-settings-type'] || 'general';
      const { logoUpload } = require('../config/multer');
      
      
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
            
            
            // Handle logo upload to S3
            if (req.file) {
              
              
              // Upload logo to S3
              const uploadResult = await S3Service.uploadFile(req.file, 'logos');
              
              if (uploadResult.success) {
                logoPath = uploadResult.url;
                // Delete old logo from S3 if exists
                const [oldSettings] = await db.execute('SELECT logo_path FROM settings LIMIT 1');
                if (oldSettings.length > 0 && oldSettings[0].logo_path) {
                  const deleteResult = await S3Service.deleteFile(oldSettings[0].logo_path);
                }
              } else {
                console.error('Failed to upload logo to S3:', uploadResult.error);
                return res.status(500).json({
                  success: false,
                  message: 'Failed to upload logo to cloud storage'
                });
              }
            }
            
            // Update or insert settings
            const [existingSettings] = await db.execute('SELECT id FROM settings LIMIT 1');
            
            
            
            if (existingSettings.length > 0) {
              // Update existing settings
              const updateFields = ['site_name = ?', 'site_tagline = ?', 'primary_color = ?'];
              const updateValues = [site_name, site_tagline, primary_color];
              
              if (logoPath) {
                updateFields.push('logo_path = ?');
                updateValues.push(logoPath);
                
              }
              
              updateValues.push(existingSettings[0].id);
              
              
              
              await db.execute(
                `UPDATE settings SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
                updateValues
              );
              
              
            } else {
              // Insert new settings
              
              await db.execute(
                'INSERT INTO settings (site_name, site_tagline, primary_color, logo_path, created_at, updated_at) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)',
                [site_name, site_tagline, primary_color, logoPath]
              );
              
              
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
      // Get user data from session
      const user = req.session.user;
      
      // Get user's complete data from database including profile_picture
      let userWithCompleteData = user;
      if (user && user.id) {
        const [userData] = await db.execute(
          'SELECT created_at, profile_picture FROM users WHERE id = ?',
          [user.id]
        );
        if (userData.length > 0) {
          userWithCompleteData = { 
            ...user, 
            created_at: userData[0].created_at,
            profile_picture: userData[0].profile_picture
          };
        }
      }
      
      res.render('admin/profile', {
        title: 'Profile',
        user: userWithCompleteData,
        userPermissions: req.userPermissions || [],
        userPrimaryRole: req.userPrimaryRole || null
      });
    } catch (error) {
      console.error('Error loading profile:', error);
      req.flash('error_msg', 'Error loading profile');
      res.render('admin/profile', {
        title: 'Profile',
        user: req.session.user,
        userPermissions: req.userPermissions || [],
        userPrimaryRole: req.userPrimaryRole || null
      });
    }
  }

  // Update profile
  async updateProfile(req, res) {
    try {
      const userId = req.session.user.id;
      const { name, email, mobile } = req.body;

      

      // Check if email is being changed and if it already exists
      if (email) {
        const [existingUser] = await db.execute(
          'SELECT id FROM users WHERE email = ? AND id != ?',
          [email, userId]
        );
        
        if (existingUser.length > 0) {
          req.flash('error_msg', 'Email already exists');
          return res.redirect('/admin/profile');
        }
      }

      // Build update query dynamically
      const updateFields = [];
      const updateValues = [];

      if (name) {
        updateFields.push('name = ?');
        updateValues.push(name);
      }
      
      if (email) {
        updateFields.push('email = ?');
        updateValues.push(email);
      }
      
      if (mobile !== undefined) {
        updateFields.push('mobile = ?');
        updateValues.push(mobile || null);
      }

      if (updateFields.length === 0) {
        req.flash('error_msg', 'No fields to update');
        return res.redirect('/admin/profile');
      }

      // Add updated_at timestamp
      updateFields.push('updated_at = NOW()');
      updateValues.push(userId);

      const updateQuery = `
        UPDATE users 
        SET ${updateFields.join(', ')} 
        WHERE id = ?
      `;

      

      const [result] = await db.execute(updateQuery, updateValues);
      
      

      if (result.affectedRows > 0) {
        // Update session data
        if (name) req.session.user.name = name;
        if (email) req.session.user.email = email;
        if (mobile !== undefined) req.session.user.mobile = mobile;
        
        req.flash('success_msg', 'Profile updated successfully');
      } else {
        req.flash('error_msg', 'No changes were made');
      }

      res.redirect('/admin/profile');
    } catch (error) {
      console.error('Error updating profile:', error);
      req.flash('error_msg', 'Error updating profile: ' + error.message);
      res.redirect('/admin/profile');
    }
  }

  // Update profile picture
  async updateProfilePicture(req, res) {
    try {
      const userId = req.session.user.id;
      const profilePictureFile = req.file;

      

      if (!profilePictureFile) {
        return res.status(400).json({
          success: false,
          message: 'No profile picture file provided'
        });
      }

      // Get current profile picture URL to delete old one
      const [currentUser] = await db.execute(
        'SELECT profile_picture FROM users WHERE id = ?',
        [userId]
      );

      const currentProfilePicture = currentUser[0]?.profile_picture;

      // Generate unique filename
      const fileExtension = profilePictureFile.originalname.split('.').pop();
      const fileName = `profile-pictures/${userId}-${Date.now()}.${fileExtension}`;

      

      // Upload to S3
      const S3Service = require('../services/s3Service');
      const uploadResult = await S3Service.uploadFile(
        profilePictureFile,
        'profile-pictures'
      );



      if (!uploadResult.success) {
        throw new Error(uploadResult.error || 'Failed to upload profile picture to S3');
      }

      // Update database with new profile picture URL
      const [result] = await db.execute(
        'UPDATE users SET profile_picture = ?, updated_at = NOW() WHERE id = ?',
        [uploadResult.url, userId]
      );

      

      if (result.affectedRows > 0) {
        // Update session data
        req.session.user.profile_picture = uploadResult.url;

        // Delete old profile picture from S3 if it exists and is from our bucket
        if (currentProfilePicture && currentProfilePicture.includes('amazonaws.com')) {
          try {
            const oldFileName = currentProfilePicture.split('/').pop();
            await S3Service.deleteFile(`profile-pictures/${oldFileName}`);
          } catch (deleteError) {
            // Don't fail the request if old file deletion fails
          }
        }

        res.json({
          success: true,
          message: 'Profile picture updated successfully',
          user: {
            profile_picture: uploadResult.url
          }
        });
      } else {
        res.status(400).json({
          success: false,
          message: 'Failed to update profile picture in database'
        });
      }

    } catch (error) {
      console.error('Error updating profile picture:', error);
      res.status(500).json({
        success: false,
        message: 'Error updating profile picture: ' + error.message
      });
    }
  }

  // Change password
  async changePassword(req, res) {
    try {
      const userId = req.session.user.id;
      const { current_password, new_password, confirm_password } = req.body;

      // Validate input
      if (!current_password || !new_password || !confirm_password) {
        req.flash('error_msg', 'All password fields are required');
        return res.redirect('/admin/profile');
      }

      if (new_password !== confirm_password) {
        req.flash('error_msg', 'New password and confirmation do not match');
        return res.redirect('/admin/profile');
      }

      if (new_password.length < 8) {
        req.flash('error_msg', 'New password must be at least 8 characters long');
        return res.redirect('/admin/profile');
      }

      // Get current user data
      const [userData] = await db.execute(
        'SELECT password FROM users WHERE id = ?',
        [userId]
      );

      if (userData.length === 0) {
        req.flash('error_msg', 'User not found');
        return res.redirect('/admin/profile');
      }

      // Verify current password
      const bcrypt = require('bcryptjs');
      const isCurrentPasswordValid = await bcrypt.compare(current_password, userData[0].password);
      
      if (!isCurrentPasswordValid) {
        req.flash('error_msg', 'Current password is incorrect');
        return res.redirect('/admin/profile');
      }

      // Hash new password
      const saltRounds = 12;
      const hashedNewPassword = await bcrypt.hash(new_password, saltRounds);

      // Update password in database
      await db.execute(
        'UPDATE users SET password = ?, updated_at = NOW() WHERE id = ?',
        [hashedNewPassword, userId]
      );

      // Log security event
      const SecurityService = require('../services/securityService');
      await SecurityService.logSecurityEvent('password_changed', req, { 
        user_id: userId,
        user_email: req.session.user.email 
      });

      req.flash('success_msg', 'Password changed successfully');
      res.redirect('/admin/profile');
    } catch (error) {
      console.error('Error changing password:', error);
      req.flash('error_msg', 'Error changing password: ' + error.message);
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
