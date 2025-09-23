const db = require('../config/database');
const TableUtils = require('../utils/tableUtils');
const S3Service = require('../services/s3Service');

class AdminController {
  // Dashboard
  async dashboard(req, res) {
    try {
      // Get statistics
      const [userStats] = await db.execute('SELECT COUNT(*) as total FROM users');
      const [regularUserStats] = await db.execute('SELECT COUNT(*) as total FROM users WHERE role = ?', ['user']);
      const [mediaStats] = await db.execute('SELECT COUNT(*) as total FROM media');
      const [videoStats] = await db.execute('SELECT COUNT(*) as total FROM media WHERE media_type = ?', ['video']);
      const [audioStats] = await db.execute('SELECT COUNT(*) as total FROM media WHERE media_type = ?', ['audio']);

      // Get recent users
      const [recentUsers] = await db.execute(
        'SELECT id, name, email, created_at FROM users WHERE role = ? ORDER BY created_at DESC LIMIT 5',
        ['user']
      );

      // Get recent media
      const [recentMedia] = await db.execute(
        'SELECT id, title, media_type, scanning_image, created_at FROM media ORDER BY created_at DESC LIMIT 5'
      );

      const stats = {
        totalUsers: regularUserStats[0].total,
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

      let query = 'SELECT id, name, email, role, is_active, is_blocked, created_at, updated_at FROM users';
      let countQuery = 'SELECT COUNT(*) as total FROM users';
      let whereConditions = [];
      let queryParams = [];
      let countParams = [];

      // Search condition
      if (search) {
        whereConditions.push('(name LIKE ? OR email LIKE ?)');
        queryParams.push(`%${search}%`, `%${search}%`);
        countParams.push(`%${search}%`, `%${search}%`);
      }

      // Status filter
      if (status) {
        if (status === 'active') {
          whereConditions.push('is_active = 1 AND is_blocked = 0');
        } else if (status === 'blocked') {
          whereConditions.push('is_blocked = 1');
        } else if (status === 'inactive') {
          whereConditions.push('is_active = 0 AND is_blocked = 0');
        }
      }

      // Role filter
      if (role) {
        whereConditions.push('role = ?');
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
        // Sort by is_active first, then by is_blocked
        query += ` ORDER BY is_active ${sortOrder}, is_blocked ${sortOrder === 'ASC' ? 'DESC' : 'ASC'}`;
        console.log('getUsersData - Status sorting query:', query);
      } else {
        query += ` ORDER BY ${sortColumn} ${sortOrder}`;
      }

      // Add pagination
      query += ` LIMIT ${limit} OFFSET ${offset}`;

      const [users] = await db.execute(query, queryParams);
      const [countResult] = await db.execute(countQuery, countParams);
      const totalUsers = countResult[0].total;
      const totalPages = Math.ceil(totalUsers / limit);

      // Generate table rows HTML
      const tableRows = users.map(user => `
        <tr class="hover:bg-gray-50">
          <td class="px-6 py-4 whitespace-nowrap">
            <div class="flex items-center">
              <div class="flex-shrink-0 h-10 w-10">
                <img class="h-10 w-10 rounded-full" src="https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=random" alt="${user.name}">
              </div>
              <div class="ml-4">
                <div class="text-sm font-medium text-gray-900">${user.name}</div>
                <div class="text-sm text-gray-500">${user.email}</div>
              </div>
            </div>
          </td>
          <td class="px-6 py-4 whitespace-nowrap">
            <span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full ${user.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-green-100 text-green-800'}">
              ${user.role}
            </span>
          </td>
          <td class="px-6 py-4 whitespace-nowrap">
            ${user.is_blocked == 1 || user.is_blocked === true ? 
              '<span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">Blocked</span>' :
              user.is_active == 1 || user.is_active === true ?
              '<span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">Active</span>' :
              '<span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">Inactive</span>'
            }
          </td>
          <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
            ${new Date(user.created_at).toLocaleDateString()}
          </td>
          <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
            <div class="flex space-x-2">
              <button onclick="viewUser(${user.id})" class="text-indigo-600 hover:text-indigo-900" title="View Details">
                <i class="fas fa-eye"></i>
              </button>
              <button onclick="editUser(${user.id})" class="text-blue-600 hover:text-blue-900" title="Edit User">
                <i class="fas fa-edit"></i>
              </button>
              ${user.role !== 'admin' ? `
                ${user.is_blocked == 1 || user.is_blocked === true ? 
                  `<button onclick="toggleUserStatus(${user.id}, 'unblock')" class="text-green-600 hover:text-green-900" title="Unblock User">
                    <i class="fas fa-unlock"></i>
                  </button>` :
                  `<button onclick="toggleUserStatus(${user.id}, 'block')" class="text-yellow-600 hover:text-yellow-900" title="Block User">
                    <i class="fas fa-ban"></i>
                  </button>`
                }
                <button onclick="deleteUser(${user.id})" class="text-red-600 hover:text-red-900" title="Delete User">
                  <i class="fas fa-trash"></i>
                </button>
              ` : ''}
            </div>
          </td>
        </tr>
      `).join('');

      // Generate pagination HTML
      let paginationHtml = '';
      if (totalPages > 1) {
        const startItem = (page - 1) * limit + 1;
        const endItem = Math.min(page * limit, totalUsers);
        const hasPrev = page > 1;
        const hasNext = page < totalPages;
        
        // Calculate page range
        const maxVisiblePages = 5;
        let startPage = Math.max(1, page - Math.floor(maxVisiblePages / 2));
        let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
        
        if (endPage - startPage + 1 < maxVisiblePages) {
          startPage = Math.max(1, endPage - maxVisiblePages + 1);
        }

        paginationHtml = `
          <div class="flex-1 flex justify-between sm:hidden">
            ${hasPrev ? `<button onclick="goToPage(${page - 1})" class="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">Previous</button>` : ''}
            ${hasNext ? `<button onclick="goToPage(${page + 1})" class="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">Next</button>` : ''}
          </div>
          <div class="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div>
              <p class="text-sm text-gray-700">
                Showing <span class="font-medium">${startItem}</span> to <span class="font-medium">${endItem}</span> of <span class="font-medium">${totalUsers}</span> results
              </p>
            </div>
            <div>
              <nav class="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                ${hasPrev ? `<button onclick="goToPage(${page - 1})" class="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"><span class="sr-only">Previous</span><i class="fas fa-chevron-left"></i></button>` : ''}
                ${Array.from({length: endPage - startPage + 1}, (_, i) => {
                  const pageNum = startPage + i;
                  return pageNum === page ? 
                    `<span class="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-indigo-50 text-sm font-medium text-indigo-600">${pageNum}</span>` :
                    `<button onclick="goToPage(${pageNum})" class="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50">${pageNum}</button>`;
                }).join('')}
                ${hasNext ? `<button onclick="goToPage(${page + 1})" class="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"><span class="sr-only">Next</span><i class="fas fa-chevron-right"></i></button>` : ''}
              </nav>
            </div>
          </div>
        `;
      }

      res.json({
        success: true,
        users: users,
        tableRows: tableRows,
        pagination: paginationHtml,
        totalUsers: totalUsers,
        currentPage: page,
        totalPages: totalPages
      });

    } catch (error) {
      console.error('Get users data error:', error);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
      res.status(500).json({
        success: false,
        message: 'Error loading users data'
      });
    }
  }

  // Get all users
  async getUsers(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = 10;
      const offset = (page - 1) * limit;
      const search = req.query.search || '';
      const status = req.query.status || '';
      const role = req.query.role || '';
      const sort = req.query.sort || 'created_at';
      const order = req.query.order || 'desc';

      let query = 'SELECT id, name, email, role, is_active, is_blocked, created_at, updated_at FROM users';
      let countQuery = 'SELECT COUNT(*) as total FROM users';
      let whereConditions = [];
      let queryParams = [];
      let countParams = [];

      // Search condition
      if (search) {
        whereConditions.push('(name LIKE ? OR email LIKE ?)');
        queryParams.push(`%${search}%`, `%${search}%`);
        countParams.push(`%${search}%`, `%${search}%`);
      }

      // Status filter
      if (status) {
        if (status === 'active') {
          whereConditions.push('is_active = true AND is_blocked = false');
        } else if (status === 'blocked') {
          whereConditions.push('is_blocked = true');
        } else if (status === 'inactive') {
          whereConditions.push('is_active = false AND is_blocked = false');
        }
      }

      // Role filter
      if (role) {
        whereConditions.push('role = ?');
        queryParams.push(role);
        countParams.push(role);
      }

      // Build WHERE clause
      if (whereConditions.length > 0) {
        const whereClause = ' WHERE ' + whereConditions.join(' AND ');
        query += whereClause;
        countQuery += whereClause;
      }

      // Sorting
      const validSortColumns = ['name', 'email', 'role', 'created_at', 'updated_at', 'status'];
      let sortColumn = validSortColumns.includes(sort) ? sort : 'created_at';
      const sortOrder = order.toLowerCase() === 'asc' ? 'ASC' : 'DESC';
      
      // Handle status sorting specially since it's a virtual column
      if (sortColumn === 'status') {
        // Sort by is_active first, then by is_blocked
        query += ` ORDER BY is_active ${sortOrder}, is_blocked ${sortOrder === 'ASC' ? 'DESC' : 'ASC'}`;
        console.log('Status sorting query:', query);
      } else {
        query += ` ORDER BY ${sortColumn} ${sortOrder}`;
      }

      // Pagination - use string interpolation for LIMIT and OFFSET
      query += ` LIMIT ${limit} OFFSET ${offset}`;

      console.log('Executing query:', query);
      console.log('Query params:', queryParams);
      
      const [users] = await db.execute(query, queryParams);
      const [countResult] = await db.execute(countQuery, countParams);
      const totalUsers = countResult[0].total;
      const totalPages = Math.ceil(totalUsers / limit);

      // Generate table data using common table component
      const tableData = TableUtils.generateTableData({
        data: users,
        columns: TableUtils.generateColumns([
          {
            key: 'name',
            label: 'User',
            type: 'avatar',
            sortable: true,
            subtitle: (user) => user.email
          },
          {
            key: 'role',
            label: 'Role',
            type: 'badge',
            sortable: true,
            badgeClass: (user) => user.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-green-100 text-green-800'
          },
          {
            key: 'status',
            label: 'Status',
            type: 'badge',
            sortable: true,
            formatter: (user) => {
              if (user.is_blocked == 1 || user.is_blocked === true) return 'Blocked';
              if (user.is_active == 1 || user.is_active === true) return 'Active';
              return 'Inactive';
            },
            badgeClass: (user) => {
              if (user.is_blocked == 1 || user.is_blocked === true) return 'bg-red-100 text-red-800';
              if (user.is_active == 1 || user.is_active === true) return 'bg-green-100 text-green-800';
              return 'bg-gray-100 text-gray-800';
            }
          },
          {
            key: 'created_at',
            label: 'Created',
            type: 'date',
            sortable: true
          }
        ]),
        actions: TableUtils.generateActions([
          {
            onclick: (user) => `viewUser(${user.id})`,
            class: 'text-indigo-600 hover:text-indigo-900',
            title: 'View Details',
            icon: 'fas fa-eye'
          },
          {
            onclick: (user) => `editUser(${user.id})`,
            class: 'text-blue-600 hover:text-blue-900',
            title: 'Edit User',
            icon: 'fas fa-edit'
          },
          {
            onclick: (user) => `toggleUserStatus(${user.id}, '${user.is_blocked == 1 || user.is_blocked === true ? 'unblock' : 'block'}')`,
            class: 'text-yellow-600 hover:text-yellow-900',
            title: user => user.is_blocked == 1 || user.is_blocked === true ? 'Unblock User' : 'Block User',
            icon: user => user.is_blocked == 1 || user.is_blocked === true ? 'fas fa-unlock' : 'fas fa-ban',
            condition: (user) => user.role !== 'admin'
          },
          {
            onclick: (user) => `deleteUser(${user.id})`,
            class: 'text-red-600 hover:text-red-900',
            title: 'Delete User',
            icon: 'fas fa-trash',
            condition: (user) => user.role !== 'admin'
          }
        ]),
        pagination: {
          currentPage: page,
          totalPages,
          totalItems: totalUsers,
          limit: 10
        },
        search,
        filters: {
          statusFilter: status,
          roleFilter: role
        },
        sort,
        order,
        title: 'Users Management',
        searchPlaceholder: 'Search users...',
        emptyIcon: 'users',
        emptyTitle: 'No users found',
        emptyMessage: 'No users have been registered yet.',
        emptySearchMessage: 'No users match your search criteria.'
      });

      res.render('admin/users', {
        ...tableData,
        // Keep original variables for backward compatibility
        users,
        search,
        status,
        role,
        sort,
        order
      });
    } catch (error) {
      console.error('Get users error:', error);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
      req.flash('error_msg', 'Error loading users');
      res.render('admin/users', {
        title: 'Users Management',
        users: [],
        pagination: { currentPage: 1, totalPages: 0, totalUsers: 0, hasNext: false, hasPrev: false },
        search: '',
        status: '',
        role: '',
        sort: 'created_at',
        order: 'desc'
      });
    }
  }

  // Get single user
  async getUser(req, res) {
    try {
      const { id } = req.params;
      const [users] = await db.execute(
        'SELECT id, name, email, role, profile_picture, is_active, is_blocked, created_at, updated_at FROM users WHERE id = ?',
        [id]
      );

      if (users.length === 0) {
        if (req.headers.accept && req.headers.accept.includes('application/json')) {
          return res.status(404).json({ success: false, message: 'User not found' });
        }
        req.flash('error_msg', 'User not found');
        return res.redirect('/admin/users');
      }

      // Return JSON for AJAX requests
      if (req.headers.accept && req.headers.accept.includes('application/json')) {
        return res.json({ success: true, user: users[0] });
      }

      res.render('admin/user-detail', {
        title: 'User Details',
        user: users[0]
      });
    } catch (error) {
      console.error('Get user error:', error);
      if (req.headers.accept && req.headers.accept.includes('application/json')) {
        return res.status(500).json({ success: false, message: 'Error loading user' });
      }
      req.flash('error_msg', 'Error loading user');
      res.redirect('/admin/users');
    }
  }

  // Update user
  async updateUser(req, res) {
    try {
      const { id } = req.params;
      const { name, email, role, status } = req.body;

      // Check if email is already taken by another user
      const [existingUsers] = await db.execute(
        'SELECT id FROM users WHERE email = ? AND id != ?',
        [email, id]
      );

      if (existingUsers.length > 0) {
        if (req.headers.accept && req.headers.accept.includes('application/json')) {
          return res.status(400).json({ success: false, message: 'Email already taken' });
        }
        req.flash('error_msg', 'Email already taken');
        return res.redirect('/admin/users');
      }

      // Update user status based on status field
      let isActive = true;
      let isBlocked = false;
      
      if (status === 'inactive') {
        isActive = false;
        isBlocked = false;
      } else if (status === 'blocked') {
        isActive = true;
        isBlocked = true;
      } else if (status === 'active') {
        isActive = true;
        isBlocked = false;
      }

      await db.execute(
        'UPDATE users SET name = ?, email = ?, role = ?, is_active = ?, is_blocked = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [name, email, role, isActive, isBlocked, id]
      );

      if (req.headers.accept && req.headers.accept.includes('application/json')) {
        return res.json({ success: true, message: 'User updated successfully' });
      }
      req.flash('success_msg', 'User updated successfully');
      res.redirect('/admin/users');
    } catch (error) {
      console.error('Update user error:', error);
      if (req.headers.accept && req.headers.accept.includes('application/json')) {
        return res.status(500).json({ success: false, message: 'Error updating user' });
      }
      req.flash('error_msg', 'Error updating user');
      res.redirect('/admin/users');
    }
  }

  // Block user
  async blockUser(req, res) {
    try {
      const { id } = req.params;
      await db.execute('UPDATE users SET is_blocked = true, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [id]);
      
      if (req.headers.accept && req.headers.accept.includes('application/json')) {
        return res.json({ success: true, message: 'User blocked successfully' });
      }
      req.flash('success_msg', 'User blocked successfully');
      res.redirect('/admin/users');
    } catch (error) {
      console.error('Block user error:', error);
      if (req.headers.accept && req.headers.accept.includes('application/json')) {
        return res.status(500).json({ success: false, message: 'Error blocking user' });
      }
      req.flash('error_msg', 'Error blocking user');
      res.redirect('/admin/users');
    }
  }

  // Unblock user
  async unblockUser(req, res) {
    try {
      const { id } = req.params;
      await db.execute('UPDATE users SET is_blocked = false, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [id]);
      
      if (req.headers.accept && req.headers.accept.includes('application/json')) {
        return res.json({ success: true, message: 'User unblocked successfully' });
      }
      req.flash('success_msg', 'User unblocked successfully');
      res.redirect('/admin/users');
    } catch (error) {
      console.error('Unblock user error:', error);
      if (req.headers.accept && req.headers.accept.includes('application/json')) {
        return res.status(500).json({ success: false, message: 'Error unblocking user' });
      }
      req.flash('error_msg', 'Error unblocking user');
      res.redirect('/admin/users');
    }
  }

  // Delete user
  async deleteUser(req, res) {
    try {
      const { id } = req.params;
      
      // Don't allow deleting admin users
      const [users] = await db.execute('SELECT role FROM users WHERE id = ?', [id]);
      if (users.length > 0 && users[0].role === 'admin') {
        if (req.headers.accept && req.headers.accept.includes('application/json')) {
          return res.status(400).json({ success: false, message: 'Cannot delete admin users' });
        }
        req.flash('error_msg', 'Cannot delete admin users');
        return res.redirect('/admin/users');
      }

      await db.execute('DELETE FROM users WHERE id = ?', [id]);
      
      if (req.headers.accept && req.headers.accept.includes('application/json')) {
        return res.json({ success: true, message: 'User deleted successfully' });
      }
      req.flash('success_msg', 'User deleted successfully');
      res.redirect('/admin/users');
    } catch (error) {
      console.error('Delete user error:', error);
      if (req.headers.accept && req.headers.accept.includes('application/json')) {
        return res.status(500).json({ success: false, message: 'Error deleting user' });
      }
      req.flash('error_msg', 'Error deleting user');
      res.redirect('/admin/users');
    }
  }

  // Settings page
  async settings(req, res) {
    try {
      // Get current settings from database
      const [settings] = await db.execute('SELECT * FROM settings LIMIT 1');
      const currentSettings = settings.length > 0 ? settings[0] : {};
      
      res.render('admin/settings', {
        title: 'Settings',
        settings: currentSettings
      });
    } catch (error) {
      console.error('Settings error:', error);
      req.flash('error_msg', 'Error loading settings');
      res.render('admin/settings', { 
        title: 'Settings',
        settings: {}
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
      console.error('Update settings error:', error);
      res.status(500).json({
        success: false,
        message: 'Error updating settings'
      });
    }
  }

  // Profile page
  async profile(req, res) {
    try {
      const [users] = await db.execute(
        'SELECT id, name, email, role, created_at FROM users WHERE id = ?',
        [req.session.user.id]
      );

      if (users.length === 0) {
        req.flash('error_msg', 'User not found');
        return res.redirect('/admin/dashboard');
      }

      res.render('admin/profile', {
        title: 'Profile',
        user: users[0]
      });
    } catch (error) {
      console.error('Profile error:', error);
      req.flash('error_msg', 'Error loading profile');
      res.redirect('/admin/dashboard');
    }
  }

  // Update profile
  async updateProfile(req, res) {
    try {
      const { name, email } = req.body;
      const userId = req.session.user.id;

      // Check if email is already taken by another user
      const [existingUsers] = await db.execute(
        'SELECT id FROM users WHERE email = ? AND id != ?',
        [email, userId]
      );

      if (existingUsers.length > 0) {
        req.flash('error_msg', 'Email already taken');
        return res.redirect('/admin/profile');
      }

      // Update user
      await db.execute(
        'UPDATE users SET name = ?, email = ? WHERE id = ?',
        [name, email, userId]
      );

      // Update session
      req.session.user.name = name;
      req.session.user.email = email;

      req.flash('success_msg', 'Profile updated successfully');
      res.redirect('/admin/profile');
    } catch (error) {
      console.error('Update profile error:', error);
      req.flash('error_msg', 'Error updating profile');
      res.redirect('/admin/profile');
    }
  }
}

module.exports = new AdminController();
