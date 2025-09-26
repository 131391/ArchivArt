const db = require('../config/database');

class ModuleAction {
    constructor(data) {
        this.id = data.id;
        this.module_id = data.module_id;
        this.name = data.name;
        this.display_name = data.display_name;
        this.description = data.description;
        this.route = data.route;
        this.is_active = data.is_active;
        this.created_at = data.created_at;
        this.updated_at = data.updated_at;
        this.module_name = data.module_name;
        this.module_display_name = data.module_display_name;
    }

    // Get all actions
    static async findAll() {
        const query = `
            SELECT ma.*, m.name as module_name, m.display_name as module_display_name
            FROM module_actions ma
            INNER JOIN modules m ON ma.module_id = m.id
            WHERE ma.is_active = 1 AND m.is_active = 1
            ORDER BY m.order_index ASC, ma.name ASC
        `;
        
        const [rows] = await db.execute(query);
        return rows.map(row => new ModuleAction(row));
    }

    // Get action by ID (active only)
    static async findById(id) {
        const query = `
            SELECT ma.*, m.name as module_name, m.display_name as module_display_name
            FROM module_actions ma
            INNER JOIN modules m ON ma.module_id = m.id
            WHERE ma.id = ? AND ma.is_active = 1 AND m.is_active = 1
        `;
        
        const [rows] = await db.execute(query, [id]);
        return rows.length > 0 ? new ModuleAction(rows[0]) : null;
    }

    // Get action by ID (including inactive)
    static async findByIdAny(id) {
        const query = `
            SELECT ma.*, m.name as module_name, m.display_name as module_display_name
            FROM module_actions ma
            INNER JOIN modules m ON ma.module_id = m.id
            WHERE ma.id = ? AND m.is_active = 1
        `;
        
        const [rows] = await db.execute(query, [id]);
        return rows.length > 0 ? new ModuleAction(rows[0]) : null;
    }

    // Get actions by module ID
    static async findByModuleId(moduleId) {
        const query = `
            SELECT * FROM module_actions 
            WHERE module_id = ? AND is_active = 1 
            ORDER BY name ASC
        `;
        
        const [rows] = await db.execute(query, [moduleId]);
        return rows.map(row => new ModuleAction(row));
    }

    // Get action by module and name
    static async findByModuleAndName(moduleId, name) {
        const query = `
            SELECT * FROM module_actions 
            WHERE module_id = ? AND name = ? AND is_active = 1
        `;
        
        const [rows] = await db.execute(query, [moduleId, name]);
        return rows.length > 0 ? new ModuleAction(rows[0]) : null;
    }

    // Get action by name and module (alias for findByModuleAndName)
    static async findByNameAndModule(name, moduleId) {
        return this.findByModuleAndName(moduleId, name);
    }

    // Create new action
    static async create(actionData) {
        const { module_id, name, display_name, description, route } = actionData;
        
        // Handle undefined route field
        const routeValue = route !== undefined ? route : null;
        
        const query = `
            INSERT INTO module_actions (module_id, name, display_name, description, route) 
            VALUES (?, ?, ?, ?, ?)
        `;
        
        const [result] = await db.execute(query, [module_id, name, display_name, description, routeValue]);
        return result.insertId;
    }

    // Update action
    static async update(id, updateData) {
        const { name, display_name, description, route, is_active } = updateData;
        
        // Convert is_active to integer if it's a string, default to 1 if undefined
        const isActiveValue = is_active !== undefined ? parseInt(is_active) : 1;
        
        // Handle undefined values by using null for SQL
        const routeValue = route !== undefined ? route : null;
        
        const query = `
            UPDATE module_actions 
            SET name = ?, display_name = ?, description = ?, route = ?, is_active = ?, updated_at = NOW()
            WHERE id = ?
        `;
        
        const [result] = await db.execute(query, [name, display_name, description, routeValue, isActiveValue, id]);
        return result.affectedRows > 0;
    }

    // Delete action
    static async delete(id) {
        const query = 'UPDATE module_actions SET is_active = 0 WHERE id = ?';
        const [result] = await db.execute(query, [id]);
        return result.affectedRows > 0;
    }

    // Get action permissions
    async getPermissions() {
        const query = `
            SELECT p.*, m.name as module_name, m.display_name as module_display_name
            FROM permissions p
            INNER JOIN modules m ON p.module_id = m.id
            WHERE p.action_id = ? AND p.is_active = 1
            ORDER BY p.name ASC
        `;
        
        const [rows] = await db.execute(query, [this.id]);
        return rows;
    }

    // Get actions with permission counts
    static async findAllWithPermissionCounts() {
        const query = `
            SELECT ma.*, m.name as module_name, m.display_name as module_display_name, COUNT(p.id) as permission_count
            FROM module_actions ma
            INNER JOIN modules m ON ma.module_id = m.id
            LEFT JOIN permissions p ON ma.id = p.action_id AND p.is_active = 1
            WHERE ma.is_active = 1 AND m.is_active = 1
            GROUP BY ma.id
            ORDER BY m.order_index ASC, ma.name ASC
        `;
        
        const [rows] = await db.execute(query);
        return rows.map(row => ({
            ...new ModuleAction(row),
            permission_count: row.permission_count
        }));
    }

    // Get actions by module with permission counts
    static async findByModuleIdWithPermissionCounts(moduleId) {
        const query = `
            SELECT ma.*, COUNT(p.id) as permission_count
            FROM module_actions ma
            LEFT JOIN permissions p ON ma.id = p.action_id AND p.is_active = 1
            WHERE ma.module_id = ? AND ma.is_active = 1
            GROUP BY ma.id
            ORDER BY ma.name ASC
        `;
        
        const [rows] = await db.execute(query, [moduleId]);
        return rows.map(row => ({
            ...new ModuleAction(row),
            permission_count: row.permission_count
        }));
    }
}

module.exports = ModuleAction;
