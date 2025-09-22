const db = require('../config/database');

class Permission {
    constructor(data) {
        this.id = data.id;
        this.name = data.name;
        this.display_name = data.display_name;
        this.description = data.description;
        this.module = data.module;
        this.action = data.action;
        this.resource = data.resource;
        this.is_system_permission = data.is_system_permission;
        this.is_active = data.is_active;
        this.created_at = data.created_at;
        this.updated_at = data.updated_at;
    }

    // Create a new permission
    static async create(permissionData) {
        const { name, display_name, description = '', module = '', action = '', resource = '', is_system_permission = 0 } = permissionData;
        
        const query = `
            INSERT INTO permissions (name, display_name, description, module, action, resource, is_system_permission, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
        `;
        
        const [result] = await db.execute(query, [name, display_name, description, module, action, resource, is_system_permission]);
        return result.insertId;
    }

    // Get all permissions
    static async findAll(options = {}) {
        const { 
            module = null, 
            is_active = null,
            search = '',
            sort = 'created_at',
            order = 'desc',
            limit = 100, 
            offset = 0 
        } = options;
        
        let query = `
            SELECT id, name, display_name, description, module, action, resource, is_system_permission, is_active, created_at, updated_at
            FROM permissions
        `;
        const params = [];
        const conditions = [];
        
        if (module) {
            conditions.push('module = ?');
            params.push(module);
        }
        
        if (is_active !== null) {
            conditions.push('is_active = ?');
            params.push(is_active);
        }
        
        if (search) {
            conditions.push('(name LIKE ? OR display_name LIKE ? OR description LIKE ? OR module LIKE ?)');
            const searchParam = `%${search}%`;
            params.push(searchParam, searchParam, searchParam, searchParam);
        }
        
        if (conditions.length > 0) {
            query += ' WHERE ' + conditions.join(' AND ');
        }
        
        // Add sorting
        const validSortColumns = ['name', 'display_name', 'module', 'action', 'created_at', 'updated_at'];
        const sortColumn = validSortColumns.includes(sort) ? sort : 'created_at';
        const sortOrder = order.toLowerCase() === 'asc' ? 'ASC' : 'DESC';
        query += ` ORDER BY ${sortColumn} ${sortOrder}`;
        
        if (limit && limit > 0) {
            query += ` LIMIT ${parseInt(limit)}`;
        }
        
        if (offset && offset > 0) {
            query += ` OFFSET ${parseInt(offset)}`;
        }
        
        const [rows] = await db.execute(query, params);
        return rows.map(row => new Permission(row));
    }

    // Get total count of permissions
    static async getTotalCount(options = {}) {
        const { 
            module = null, 
            is_active = null,
            search = ''
        } = options;
        
        let query = `
            SELECT COUNT(*) as total
            FROM permissions
        `;
        const params = [];
        const conditions = [];
        
        if (module) {
            conditions.push('module = ?');
            params.push(module);
        }
        
        if (is_active !== null) {
            conditions.push('is_active = ?');
            params.push(is_active);
        }
        
        if (search) {
            conditions.push('(name LIKE ? OR display_name LIKE ? OR description LIKE ? OR module LIKE ?)');
            const searchParam = `%${search}%`;
            params.push(searchParam, searchParam, searchParam, searchParam);
        }
        
        if (conditions.length > 0) {
            query += ' WHERE ' + conditions.join(' AND ');
        }
        
        const [rows] = await db.execute(query, params);
        return rows[0].total;
    }

    // Get permission by ID
    static async findById(id) {
        const query = `
            SELECT p.*, m.name as module_name, m.display_name as module_display_name, 
                   ma.name as action_name, ma.display_name as action_display_name
            FROM permissions p
            LEFT JOIN modules m ON p.module_id = m.id
            LEFT JOIN module_actions ma ON p.action_id = ma.id
            WHERE p.id = ?
        `;
        
        const [rows] = await db.execute(query, [id]);
        return rows.length > 0 ? new Permission(rows[0]) : null;
    }

    // Get permission by name
    static async findByName(name) {
        const query = `
            SELECT p.*, m.name as module_name, m.display_name as module_display_name, 
                   ma.name as action_name, ma.display_name as action_display_name
            FROM permissions p
            LEFT JOIN modules m ON p.module_id = m.id
            LEFT JOIN module_actions ma ON p.action_id = ma.id
            WHERE p.name = ?
        `;
        
        const [rows] = await db.execute(query, [name]);
        return rows.length > 0 ? new Permission(rows[0]) : null;
    }

    // Update permission
    static async update(id, updateData) {
        const { name, display_name, description, module, action, resource, is_active } = updateData;
        
        const query = `
            UPDATE permissions
            SET name = ?, display_name = ?, description = ?, module = ?, action = ?, resource = ?, is_active = ?, updated_at = NOW()
            WHERE id = ?
        `;
        
        // Convert undefined to null for MySQL compatibility
        const safeName = name || null;
        const safeDisplayName = display_name || null;
        const safeDescription = description || null;
        const safeModule = module || null;
        const safeAction = action || null;
        const safeResource = resource || null;
        const safeIsActive = is_active !== undefined ? is_active : 1;
        
        const [result] = await db.execute(query, [safeName, safeDisplayName, safeDescription, safeModule, safeAction, safeResource, safeIsActive, id]);
        return result.affectedRows > 0;
    }

    // Delete permission
    static async delete(id) {
        const query = 'DELETE FROM permissions WHERE id = ?';
        const [result] = await db.execute(query, [id]);
        return result.affectedRows > 0;
    }

    // Get permissions by module
    static async findByModule(module) {
        const query = `
            SELECT id, name, display_name, description, module, is_active, created_at, updated_at
            FROM permissions
            WHERE module = ? AND is_active = 1
            ORDER BY display_name
        `;
        
        const [rows] = await db.execute(query, [module]);
        return rows.map(row => new Permission(row));
    }

    // Get all modules
    static async getModules() {
        const query = `
            SELECT DISTINCT module
            FROM permissions
            WHERE is_active = 1 AND module != ''
            ORDER BY module
        `;
        
        const [rows] = await db.execute(query);
        return rows.map(row => row.module);
    }

    static async getModuleActions() {
        const query = `
            SELECT DISTINCT action
            FROM permissions
            WHERE is_active = 1 AND action != ''
            ORDER BY action
        `;
        
        const [rows] = await db.execute(query);
        return rows.map(row => row.action);
    }

    // Get roles that have this permission
    async getRoles() {
        const query = `
            SELECT r.id, r.name, r.display_name, r.description
            FROM roles r
            INNER JOIN role_permissions rp ON r.id = rp.role_id
            WHERE rp.permission_id = ? AND r.is_active = 1 AND rp.is_active = 1
        `;
        
        const [rows] = await db.execute(query, [this.id]);
        return rows;
    }
}

module.exports = Permission;
