const db = require('../config/database');

class UserRole {
    constructor(data) {
        this.id = data.id;
        this.user_id = data.user_id;
        this.role_id = data.role_id;
        this.is_active = data.is_active;
        this.created_at = data.created_at;
        this.updated_at = data.updated_at;
    }

    // Assign role to user
    static async assignRole(userId, roleId) {
        const query = `
            INSERT INTO user_roles (user_id, role_id, is_active, assigned_at)
            VALUES (?, ?, 1, NOW())
            ON DUPLICATE KEY UPDATE is_active = 1, assigned_at = NOW()
        `;
        
        const [result] = await db.execute(query, [userId, roleId]);
        return result.affectedRows > 0;
    }

    // Remove role from user
    static async removeRole(userId, roleId) {
        const query = `
            UPDATE user_roles
            SET is_active = 0
            WHERE user_id = ? AND role_id = ?
        `;
        
        const [result] = await db.execute(query, [userId, roleId]);
        return result.affectedRows > 0;
    }

    // Get user roles
    static async getUserRoles(userId) {
        const query = `
            SELECT r.id, r.name, r.display_name, r.description
            FROM roles r
            INNER JOIN user_roles ur ON r.id = ur.role_id
            WHERE ur.user_id = ? AND r.is_active = 1 AND ur.is_active = 1
            ORDER BY r.display_name
        `;
        
        const [rows] = await db.execute(query, [userId]);
        return rows;
    }

    // Get user's primary role (first active role)
    static async getUserPrimaryRole(userId) {
        const query = `
            SELECT r.id, r.name, r.display_name, r.description
            FROM roles r
            INNER JOIN user_roles ur ON r.id = ur.role_id
            WHERE ur.user_id = ? AND r.is_active = 1 AND ur.is_active = 1
            ORDER BY ur.assigned_at ASC
            LIMIT 1
        `;
        
        const [rows] = await db.execute(query, [userId]);
        return rows.length > 0 ? rows[0] : null;
    }

    // Get user permissions
    static async getUserPermissions(userId) {
        const query = `
            SELECT DISTINCT p.id, p.name, p.display_name, p.description, m.name as module
            FROM permissions p
            LEFT JOIN modules m ON p.module_id = m.id
            INNER JOIN role_permissions rp ON p.id = rp.permission_id
            INNER JOIN user_roles ur ON rp.role_id = ur.role_id
            WHERE ur.user_id = ? AND ur.is_active = 1 AND p.is_active = 1 AND rp.is_active = 1
            ORDER BY m.name, p.display_name
        `;
        
        const [rows] = await db.execute(query, [userId]);
        return rows;
    }

    // Check if user has specific permission
    static async hasPermission(userId, permissionName) {
        const query = `
            SELECT COUNT(*) as count
            FROM permissions p
            INNER JOIN role_permissions rp ON p.id = rp.permission_id
            INNER JOIN user_roles ur ON rp.role_id = ur.role_id
            WHERE ur.user_id = ? AND p.name = ? AND ur.is_active = 1
        `;
        
        const [rows] = await db.execute(query, [userId, permissionName]);
        return rows[0].count > 0;
    }

    // Check if user has any permission in a module
    static async hasModulePermission(userId, module) {
        const query = `
            SELECT COUNT(*) as count
            FROM permissions p
            INNER JOIN role_permissions rp ON p.id = rp.permission_id
            INNER JOIN user_roles ur ON rp.role_id = ur.role_id
            WHERE ur.user_id = ? AND p.module = ? AND ur.is_active = 1
        `;
        
        const [rows] = await db.execute(query, [userId, module]);
        return rows[0].count > 0;
    }

    // Get users with specific role
    static async getUsersWithRole(roleId) {
        const query = `
            SELECT u.id, u.name, u.email, u.is_active, u.created_at
            FROM users u
            INNER JOIN user_roles ur ON u.id = ur.user_id
            WHERE ur.role_id = ? AND u.is_active = 1 AND ur.is_active = 1
            ORDER BY u.name
        `;
        
        const [rows] = await db.execute(query, [roleId]);
        return rows;
    }

    // Update user's primary role (remove all others and assign new one)
    static async updateUserPrimaryRole(userId, roleId) {
        const connection = await db.getConnection();
        
        try {
            await connection.beginTransaction();
            
            // Deactivate all current roles
            await connection.execute(
                'UPDATE user_roles SET is_active = 0 WHERE user_id = ?',
                [userId]
            );
            
            // Check if role assignment already exists
            const [existingRole] = await connection.execute(
                'SELECT id FROM user_roles WHERE user_id = ? AND role_id = ?',
                [userId, roleId]
            );
            
            if (existingRole.length > 0) {
                // Update existing role assignment
                await connection.execute(
                    'UPDATE user_roles SET is_active = 1, assigned_at = NOW() WHERE user_id = ? AND role_id = ?',
                    [userId, roleId]
                );
            } else {
                // Insert new role assignment
                await connection.execute(
                    'INSERT INTO user_roles (user_id, role_id, is_active, assigned_at) VALUES (?, ?, 1, NOW())',
                    [userId, roleId]
                );
            }
            
            await connection.commit();
            return true;
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    // Get role statistics
    static async getRoleStats() {
        const query = `
            SELECT 
                r.id,
                r.name,
                r.display_name,
                COUNT(ur.user_id) as user_count
            FROM roles r
            LEFT JOIN user_roles ur ON r.id = ur.role_id AND ur.is_active = 1
            WHERE r.is_active = 1
            GROUP BY r.id, r.name, r.display_name
            ORDER BY user_count DESC, r.display_name
        `;
        
        const [rows] = await db.execute(query);
        return rows;
    }
}

module.exports = UserRole;
