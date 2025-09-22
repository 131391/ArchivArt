const db = require('../config/database');
const UserRole = require('../models/UserRole');
const Role = require('../models/Role');
const { checkPermission, checkModulePermission, getUserRoleName } = require('../middleware/rbac');

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
      const page = parseInt(req.query.page) || 1;
      const limit = 10;
      const offset = (page - 1) * limit;
      const search = req.query.search || '';
      const status = req.query.status || '';
      const role = req.query.role || '';
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

      // Generate table rows HTML with RBAC data
      const tableRows = users.map(user => `
        <tr class="hover:bg-gray-50">
          <td class="px-6 py-4 whitespace-nowrap">
            <div class="flex items-center">
              <div class="flex-shrink-0 h-10 w-10">
                <div class="h-10 w-10 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 flex items-center justify-center">
                  <span class="text-sm font-medium text-white">${user.name.charAt(0).toUpperCase()}</span>
                </div>
              </div>
              <div class="ml-4">
                <div class="text-sm font-medium text-gray-900">${user.name}</div>
                <div class="text-sm text-gray-500">ID: ${user.id}</div>
              </div>
            </div>
          </td>
          <td class="px-6 py-4 whitespace-nowrap">
            <div class="text-sm text-gray-900">${user.email}</div>
          </td>
          <td class="px-6 py-4 whitespace-nowrap">
            <span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
              <div class="w-2 h-2 rounded-full mr-2 bg-current opacity-75"></div>
              ${user.role_display_name || 'No Role'}
            </span>
          </td>
          <td class="px-6 py-4 whitespace-nowrap">
            ${user.is_blocked == 1 || user.is_blocked === true ? 
              '<span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800"><div class="w-2 h-2 rounded-full mr-2 bg-current opacity-75"></div>Blocked</span>' :
              user.is_active == 1 || user.is_active === true ?
              '<span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800"><div class="w-2 h-2 rounded-full mr-2 bg-current opacity-75"></div>Active</span>' :
              '<span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-800"><div class="w-2 h-2 rounded-full mr-2 bg-current opacity-75"></div>Inactive</span>'
            }
          </td>
          <td class="px-6 py-4 whitespace-nowrap">
            <div class="flex items-center space-x-2">
              <i class="fas fa-calendar text-gray-400 text-xs"></i>
              <span class="text-sm text-gray-900">${new Date(user.created_at).toLocaleDateString()}</span>
            </div>
          </td>
          <td class="px-6 py-4 whitespace-nowrap">
            <div class="flex items-center space-x-2">
              <button onclick="viewUser(${user.id})" class="text-blue-600 hover:text-blue-900 inline-flex items-center justify-center w-8 h-8 rounded-lg text-sm font-medium transition-all duration-200 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-2" title="View">
                <i class="fas fa-eye"></i>
              </button>
              <button onclick="editUser(${user.id})" class="text-indigo-600 hover:text-indigo-900 inline-flex items-center justify-center w-8 h-8 rounded-lg text-sm font-medium transition-all duration-200 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-2" title="Edit">
                <i class="fas fa-edit"></i>
              </button>
              <button onclick="toggleUserStatus(${user.id}, '${user.is_blocked == 1 || user.is_blocked === true ? 'unblock' : 'block'}')" class="text-${user.is_blocked == 1 || user.is_blocked === true ? 'green' : 'yellow'}-600 hover:text-${user.is_blocked == 1 || user.is_blocked === true ? 'green' : 'yellow'}-900 inline-flex items-center justify-center w-8 h-8 rounded-lg text-sm font-medium transition-all duration-200 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-2" title="${user.is_blocked == 1 || user.is_blocked === true ? 'Unblock' : 'Block'}">
                <i class="fas fa-${user.is_blocked == 1 || user.is_blocked === true ? 'unlock' : 'ban'}"></i>
              </button>
              <button onclick="deleteUser(${user.id})" class="text-red-600 hover:text-red-900 inline-flex items-center justify-center w-8 h-8 rounded-lg text-sm font-medium transition-all duration-200 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-2" title="Delete">
                <i class="fas fa-trash"></i>
              </button>
            </div>
          </td>
        </tr>
      `).join('');

      res.json({
        success: true,
        data: users,
        tableRows: tableRows,
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
      const status = req.query.status || '';
      const role = req.query.role || '';

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
      const pagination = this.generatePagination(page, totalPages, totalUsers, limit);

      res.render('admin/users', {
        title: 'User Management',
        data: users,
        roles: roles,
        pagination: pagination,
        search: search,
        filters: { roleFilter: role }
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
  generatePagination(currentPage, totalPages, totalItems, limit) {
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
}

module.exports = AdminController;
