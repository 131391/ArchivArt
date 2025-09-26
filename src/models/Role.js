const db = require('../config/database');

class Role {
    constructor(data) {
        this.id = data.id;
        this.name = data.name;
        this.display_name = data.display_name;
        this.description = data.description;
        this.is_active = data.is_active;
        this.created_at = data.created_at;
        this.updated_at = data.updated_at;
        this.user_count = data.user_count || 0;
        this.permission_count = data.permission_count || 0;
    }

    // Create a new role
    static async create(roleData) {
        const { name, display_name, description = '', is_active = 1, is_system_role = 0 } = roleData;
        
        const query = `
            INSERT INTO roles (name, display_name, description, is_active, is_system_role, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, NOW(), NOW())
        `;
        
        const [result] = await db.execute(query, [name, display_name, description, is_active, is_system_role]);
        return result.insertId;
    }

    // Get all roles
    static async findAll(options = {}) {
        const { is_active = null, search = '', sort = 'display_name', order = 'asc', limit = 100, offset = 0 } = options;
        
        let query = `
            SELECT 
                r.id, 
                r.name, 
                r.display_name, 
                r.description, 
                r.is_active, 
                r.created_at, 
                r.updated_at,
                COUNT(DISTINCT ur.user_id) as user_count,
                COUNT(DISTINCT CASE WHEN rp.is_active = 1 THEN rp.permission_id END) as permission_count
            FROM roles r
            LEFT JOIN user_roles ur ON r.id = ur.role_id AND ur.is_active = 1
            LEFT JOIN role_permissions rp ON r.id = rp.role_id
        `;
        const params = [];
        const whereConditions = [];
        
        // Search condition
        if (search && search.trim()) {
            whereConditions.push('(r.name LIKE ? OR r.display_name LIKE ? OR r.description LIKE ?)');
            const searchTerm = `%${search.trim()}%`;
            params.push(searchTerm, searchTerm, searchTerm);
        }
        
        // Status filter
        if (is_active !== null) {
            whereConditions.push('r.is_active = ?');
            params.push(is_active);
        }
        
        // Build WHERE clause
        if (whereConditions.length > 0) {
            query += ' WHERE ' + whereConditions.join(' AND ');
        }
        
        // Validate sort column to prevent SQL injection
        const allowedSortColumns = ['id', 'name', 'display_name', 'description', 'is_active', 'created_at', 'updated_at', 'user_count', 'permission_count'];
        const sortColumn = allowedSortColumns.includes(sort) ? sort : 'display_name';
        const sortOrder = order.toLowerCase() === 'desc' ? 'DESC' : 'ASC';
        
        // Handle calculated fields differently
        let orderByClause;
        if (sortColumn === 'user_count') {
            orderByClause = `COUNT(DISTINCT ur.user_id) ${sortOrder}`;
        } else if (sortColumn === 'permission_count') {
            orderByClause = `COUNT(DISTINCT CASE WHEN rp.is_active = 1 THEN rp.permission_id END) ${sortOrder}`;
        } else {
            orderByClause = `r.${sortColumn} ${sortOrder}`;
        }
        
        query += ` GROUP BY r.id ORDER BY ${orderByClause}`;
        
        // Add secondary sort for consistent results
        if (sortColumn !== 'display_name') {
            query += ', r.display_name ASC';
        }
        
        if (limit && limit > 0) {
            query += ` LIMIT ${parseInt(limit)}`;
        }
        
        if (offset && offset > 0) {
            query += ` OFFSET ${parseInt(offset)}`;
        }
        
        const [rows] = await db.execute(query, params);
        return rows.map(row => new Role(row));
    }

    // Get role by ID
    static async findById(id) {
        const query = `
            SELECT id, name, display_name, description, is_active, created_at, updated_at
            FROM roles
            WHERE id = ?
        `;
        
        const [rows] = await db.execute(query, [id]);
        return rows.length > 0 ? new Role(rows[0]) : null;
    }

    // Get role by name
    static async findByName(name) {
        const query = `
            SELECT id, name, display_name, description, is_active, created_at, updated_at
            FROM roles
            WHERE name = ?
        `;
        
        const [rows] = await db.execute(query, [name]);
        return rows.length > 0 ? new Role(rows[0]) : null;
    }

    // Update role
    static async update(id, updateData) {
        const { name, display_name, description, is_active } = updateData;
        
        const query = `
            UPDATE roles
            SET name = ?, display_name = ?, description = ?, is_active = ?, updated_at = NOW()
            WHERE id = ?
        `;
        
        const [result] = await db.execute(query, [name, display_name, description, is_active, id]);
        return result.affectedRows > 0;
    }

    // Delete role
    static async delete(id) {
        const query = 'DELETE FROM roles WHERE id = ?';
        const [result] = await db.execute(query, [id]);
        return result.affectedRows > 0;
    }

    // Get role permissions
    async getPermissions() {
        const query = `
            SELECT p.id, p.name, p.display_name, p.description, m.name as module, ma.name as action, p.resource
            FROM permissions p
            LEFT JOIN modules m ON p.module_id = m.id
            LEFT JOIN module_actions ma ON p.action_id = ma.id
            INNER JOIN role_permissions rp ON p.id = rp.permission_id
            WHERE rp.role_id = ? AND p.is_active = 1 AND rp.is_active = 1
        `;
        
        const [rows] = await db.execute(query, [this.id]);
        return rows;
    }

    // Add permission to role
    static async addPermission(roleId, permissionId) {
        const query = `
            INSERT INTO role_permissions (role_id, permission_id, is_active, granted_at)
            VALUES (?, ?, 1, NOW())
            ON DUPLICATE KEY UPDATE is_active = 1
        `;
        
        const [result] = await db.execute(query, [roleId, permissionId]);
        return result.affectedRows > 0;
    }

    // Remove permission from role
    static async removePermission(roleId, permissionId) {
        const query = `
            UPDATE role_permissions
            SET is_active = 0
            WHERE role_id = ? AND permission_id = ?
        `;
        
        const [result] = await db.execute(query, [roleId, permissionId]);
        return result.affectedRows > 0;
    }

    // Get role permissions (static method)
    static async getRolePermissions(roleId) {
        const query = `
            SELECT 
                p.id as permission_id,
                p.name,
                p.display_name,
                m.name as module,
                p.description,
                rp.is_active
            FROM permissions p
            LEFT JOIN modules m ON p.module_id = m.id
            INNER JOIN role_permissions rp ON p.id = rp.permission_id
            WHERE rp.role_id = ? AND rp.is_active = 1
            ORDER BY m.name, p.display_name
        `;
        
        console.log('Getting role permissions for role:', roleId);
        const [rows] = await db.execute(query, [roleId]);
        console.log('Retrieved role permissions:', rows.length, 'permissions');
        return rows;
    }

    // Update role permissions
    static async updateRolePermissions(roleId, permissionIds) {
        console.log('Role.updateRolePermissions called with:');
        console.log('- roleId:', roleId);
        console.log('- permissionIds:', permissionIds);
        console.log('- permissionIds type:', typeof permissionIds);
        console.log('- permissionIds length:', permissionIds ? permissionIds.length : 'null/undefined');
        
        const connection = await db.getConnection();
        
        try {
            await connection.beginTransaction();
            
            // Remove all existing permissions for this role
            console.log('Setting all existing permissions to inactive for role:', roleId);
            const [deactivateResult] = await connection.execute(
                'UPDATE role_permissions SET is_active = 0 WHERE role_id = ?',
                [roleId]
            );
            console.log('Deactivated permissions count:', deactivateResult.affectedRows);
            
            // Add new permissions
            if (permissionIds && permissionIds.length > 0) {
                console.log('Adding new permissions:', permissionIds);
                const values = permissionIds.map(permissionId => [roleId, permissionId, 1, new Date()]);
                const placeholders = values.map(() => '(?, ?, ?, ?)').join(', ');
                
                const [insertResult] = await connection.execute(
                    `INSERT INTO role_permissions (role_id, permission_id, is_active, granted_at) 
                     VALUES ${placeholders} 
                     ON DUPLICATE KEY UPDATE is_active = 1`,
                    values.flat()
                );
                console.log('Insert/Update result:', insertResult);
            } else {
                console.log('No permissions to add - all permissions will be inactive');
            }
            
            await connection.commit();
            console.log('Transaction committed successfully');
            return { success: true };
        } catch (error) {
            console.error('Error in updateRolePermissions:', error);
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }
}

module.exports = Role;
