const db = require('../config/database');

class Module {
    constructor(data) {
        this.id = data.id;
        this.name = data.name;
        this.display_name = data.display_name;
        this.description = data.description;
        this.icon = data.icon;
        this.route = data.route;
        this.order_index = data.order_index;
        this.is_active = data.is_active;
        this.created_at = data.created_at;
        this.updated_at = data.updated_at;
    }

    // Get all modules
    static async findAll(options = {}) {
        const { search = '', sort = 'order_index', order = 'asc', limit = 100, offset = 0 } = options;
        
        let query = `
            SELECT m.*, 
                   COUNT(DISTINCT ma.id) as action_count,
                   COUNT(DISTINCT p.id) as permission_count
            FROM modules m
            LEFT JOIN module_actions ma ON m.id = ma.module_id AND ma.is_active = 1
            LEFT JOIN permissions p ON m.id = p.module_id AND p.is_active = 1
            WHERE m.is_active = 1
        `;
        const params = [];
        
        // Search condition
        if (search && search.trim()) {
            query += ' AND (m.name LIKE ? OR m.display_name LIKE ? OR m.description LIKE ?)';
            const searchTerm = `%${search.trim()}%`;
            params.push(searchTerm, searchTerm, searchTerm);
        }
        
        // Validate sort column to prevent SQL injection
        const allowedSortColumns = ['id', 'name', 'display_name', 'description', 'icon', 'route', 'order_index', 'created_at', 'updated_at', 'action_count', 'permission_count'];
        const sortColumn = allowedSortColumns.includes(sort) ? sort : 'order_index';
        const sortOrder = order.toLowerCase() === 'desc' ? 'DESC' : 'ASC';
        
        // Handle calculated fields differently
        let orderByClause;
        if (sortColumn === 'action_count') {
            orderByClause = `COUNT(DISTINCT ma.id) ${sortOrder}`;
        } else if (sortColumn === 'permission_count') {
            orderByClause = `COUNT(DISTINCT p.id) ${sortOrder}`;
        } else {
            orderByClause = `m.${sortColumn} ${sortOrder}`;
        }
        
        query += ` GROUP BY m.id ORDER BY ${orderByClause}`;
        
        // Add secondary sort for consistent results
        if (sortColumn !== 'display_name') {
            query += ', m.display_name ASC';
        }
        
        if (limit && limit > 0) {
            query += ` LIMIT ${parseInt(limit)}`;
        }
        
        if (offset && offset > 0) {
            query += ` OFFSET ${parseInt(offset)}`;
        }
        
        const [rows] = await db.execute(query, params);
        return rows.map(row => ({
            ...new Module(row),
            action_count: row.action_count,
            permission_count: row.permission_count
        }));
    }

    // Get module by ID
    static async findById(id) {
        const query = `
            SELECT * FROM modules 
            WHERE id = ? AND is_active = 1
        `;
        
        const [rows] = await db.execute(query, [id]);
        return rows.length > 0 ? new Module(rows[0]) : null;
    }

    // Get module by name
    static async findByName(name) {
        const query = `
            SELECT * FROM modules 
            WHERE name = ? AND is_active = 1
        `;
        
        const [rows] = await db.execute(query, [name]);
        return rows.length > 0 ? new Module(rows[0]) : null;
    }

    // Get module by display name
    static async findByDisplayName(display_name) {
        const query = `
            SELECT * FROM modules 
            WHERE display_name = ? AND is_active = 1
        `;
        
        const [rows] = await db.execute(query, [display_name]);
        return rows.length > 0 ? new Module(rows[0]) : null;
    }

    // Get module by route
    static async findByRoute(route) {
        const query = `
            SELECT * FROM modules 
            WHERE route = ? AND is_active = 1
        `;
        
        const [rows] = await db.execute(query, [route]);
        return rows.length > 0 ? new Module(rows[0]) : null;
    }

    // Get module by order index
    static async findByOrderIndex(order_index) {
        const query = `
            SELECT * FROM modules 
            WHERE order_index = ? AND is_active = 1
        `;
        
        const [rows] = await db.execute(query, [order_index]);
        return rows.length > 0 ? new Module(rows[0]) : null;
    }

    // Create new module
    static async create(moduleData) {
        const { name, display_name, description, icon, route, order_index } = moduleData;
        
        const query = `
            INSERT INTO modules (name, display_name, description, icon, route, order_index) 
            VALUES (?, ?, ?, ?, ?, ?)
        `;
        
        const [result] = await db.execute(query, [name, display_name, description, icon, route, order_index]);
        return result.insertId;
    }

    // Update module
    static async update(id, updateData) {
        const { name, display_name, description, icon, route, order_index, is_active } = updateData;
        
        const query = `
            UPDATE modules 
            SET name = ?, display_name = ?, description = ?, icon = ?, route = ?, order_index = ?, is_active = ?
            WHERE id = ?
        `;
        
        // Convert undefined values to null for MySQL compatibility
        const [result] = await db.execute(query, [
            name || null, 
            display_name || null, 
            description || null, 
            icon || null, 
            route || null, 
            order_index || 0, 
            is_active !== undefined ? is_active : 1, 
            id
        ]);
        return result.affectedRows > 0;
    }

    // Delete module
    static async delete(id) {
        const query = 'UPDATE modules SET is_active = 0 WHERE id = ?';
        const [result] = await db.execute(query, [id]);
        return result.affectedRows > 0;
    }

    // Get related data count for a module
    static async getRelatedDataCount(id) {
        const [actionsCount] = await db.execute('SELECT COUNT(*) as count FROM module_actions WHERE module_id = ?', [id]);
        const [permissionsCount] = await db.execute('SELECT COUNT(*) as count FROM permissions WHERE module_id = ?', [id]);
        const [rolePermissionsCount] = await db.execute(`
            SELECT COUNT(*) as count 
            FROM role_permissions rp 
            INNER JOIN permissions p ON rp.permission_id = p.id 
            WHERE p.module_id = ?
        `, [id]);
        
        return {
            actions: actionsCount[0].count,
            permissions: permissionsCount[0].count,
            rolePermissions: rolePermissionsCount[0].count
        };
    }

    // Delete module with cascade (delete all related data)
    static async deleteWithCascade(id) {
        const connection = await db.getConnection();
        
        try {
            await connection.beginTransaction();
            
            // 1. Delete all role permissions for this module's permissions
            await connection.execute(`
                DELETE rp FROM role_permissions rp 
                INNER JOIN permissions p ON rp.permission_id = p.id 
                WHERE p.module_id = ?
            `, [id]);
            
            // 2. Delete all permissions for this module
            await connection.execute(`
                DELETE FROM permissions WHERE module_id = ?
            `, [id]);
            
            // 3. Delete all module actions for this module
            await connection.execute(`
                DELETE FROM module_actions WHERE module_id = ?
            `, [id]);
            
            // 4. Finally, delete the module itself
            await connection.execute(`
                DELETE FROM modules WHERE id = ?
            `, [id]);
            
            await connection.commit();
            return true;
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    // Get module actions
    async getActions() {
        const query = `
            SELECT * FROM module_actions 
            WHERE module_id = ? AND is_active = 1 
            ORDER BY name ASC
        `;
        
        const [rows] = await db.execute(query, [this.id]);
        return rows;
    }

    // Get module permissions
    async getPermissions() {
        const query = `
            SELECT p.*, ma.name as action_name, ma.display_name as action_display_name
            FROM permissions p
            INNER JOIN module_actions ma ON p.action_id = ma.id
            WHERE p.module_id = ? AND p.is_active = 1
            ORDER BY ma.name ASC
        `;
        
        const [rows] = await db.execute(query, [this.id]);
        return rows;
    }

    // Get modules with action counts
    static async findAllWithActionCounts() {
        const query = `
            SELECT m.*, COUNT(ma.id) as action_count
            FROM modules m
            LEFT JOIN module_actions ma ON m.id = ma.module_id AND ma.is_active = 1
            WHERE m.is_active = 1
            GROUP BY m.id
            ORDER BY m.order_index ASC, m.display_name ASC
        `;
        
        const [rows] = await db.execute(query);
        return rows.map(row => ({
            ...new Module(row),
            action_count: row.action_count
        }));
    }

    // Get modules with permission counts
    static async findAllWithPermissionCounts() {
        const query = `
            SELECT m.*, COUNT(p.id) as permission_count
            FROM modules m
            LEFT JOIN permissions p ON m.id = p.module_id AND p.is_active = 1
            WHERE m.is_active = 1
            GROUP BY m.id
            ORDER BY m.order_index ASC, m.display_name ASC
        `;
        
        const [rows] = await db.execute(query);
        return rows.map(row => ({
            ...new Module(row),
            permission_count: row.permission_count
        }));
    }
}

module.exports = Module;
