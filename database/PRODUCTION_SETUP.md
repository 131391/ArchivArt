# ArchivArt Production Database Setup Guide

## 📋 Overview

This guide explains how to set up the ArchivArt database for production deployment using a single migration file.

## 🗂️ Files Available

### Essential Files (Use These):

1. **`production_migration.sql`** - Complete database migration (RECOMMENDED)
   - Creates all tables with proper schema
   - Inserts system data (modules, roles, permissions)
   - Creates admin user with credentials
   - Sets up cascade deletion procedures
   - **This is the ONLY file you need for a fresh database setup**

2. **`restore_database.js`** - Node.js script to restore database
   - Alternative to SQL file
   - Provides better error handling
   - Shows progress during setup
   - Useful for development/testing

3. **`cascade_delete_utility.js`** - Safe deletion utility
   - CLI tool for safely deleting RBAC components
   - Prevents accidental data loss
   - Use for maintenance tasks

### Optional Files:

4. **`production_migration_fixed.sql`** - Backup version with fixes
5. **`run_production_migration.js`** - Script to run SQL migration

## 🚀 Quick Start - Production Setup

### Option 1: Using MySQL Command Line (RECOMMENDED)

```bash
# 1. Make sure you have MySQL credentials ready
# 2. Update your .env file with correct database credentials
# 3. Run the migration

mysql -h YOUR_HOST -u YOUR_USER -p YOUR_DATABASE < database/production_migration.sql
```

**Example for remote database:**
```bash
mysql -h mysql-xxxxx.aivencloud.com -P 13863 -u avnadmin -p archivartv2 < database/production_migration.sql
```

**Example for local database:**
```bash
mysql -u root -p archivartv2 < database/production_migration.sql
```

### Option 2: Using Node.js Restore Script

```bash
# 1. Make sure .env file has correct database credentials
# 2. Run the restore script

cd database
node restore_database.js
```

## 📊 What Gets Created

### Database Tables (13 tables):

**Core Tables:**
- `users` - User accounts
- `media` - Media files and metadata
- `user_sessions` - Active user sessions

**RBAC Tables:**
- `modules` - System modules
- `module_actions` - Available actions per module
- `permissions` - Granular permissions
- `roles` - User roles
- `role_permissions` - Role-permission assignments
- `user_roles` - User-role assignments

**Security Tables:**
- `blacklisted_tokens` - Revoked JWT tokens
- `failed_login_attempts` - Login security tracking
- `api_usage` - API usage monitoring

**Configuration:**
- `settings` - System settings

### System Data:

**Modules (5):**
1. Dashboard - Main dashboard
2. Users - User management
3. Media - Media management
4. RBAC - Role & permissions
5. Settings - System settings

**Roles (6):**
1. Super Administrator (super_admin) - Full access
2. Administrator (admin) - Admin access
3. Moderator (moderator) - Moderation access
4. Editor (editor) - Content editing
5. Viewer (viewer) - Read-only access
6. Regular User (user) - Basic permissions

**Permissions (18):**
- Dashboard: 1 permission
- Users: 5 permissions (view, create, update, delete, block)
- Media: 5 permissions (view, upload, edit, delete, scan)
- RBAC: 5 permissions (view, create, update, delete, assign_roles)
- Settings: 2 permissions (view, update)

**Admin User:**
- Email: `admin@archivart.com`
- Password: `admin123`
- Role: Super Administrator
- Permissions: All 18 permissions

## 🔐 Security Features

### Stored Procedures for Safe Deletion:

1. `DeleteModuleWithCascade(module_id)` - Safely delete modules
2. `DeleteModuleActionWithCascade(action_id)` - Safely delete actions
3. `DeletePermissionWithCascade(permission_id)` - Safely delete permissions
4. `DeleteRoleWithCascade(role_id)` - Safely delete roles
5. `DeleteUserWithCascade(user_id)` - Safely delete users

**These procedures ensure:**
- No orphaned data
- Maintains referential integrity
- Prevents cascade deletion bugs
- Transaction-based (all or nothing)

## 📝 Environment Configuration

Update your `.env` file with database credentials:

```env
DB_HOST=your-database-host
DB_PORT=3306
DB_USER=your-username
DB_PASSWORD=your-password
DB_NAME=archivartv2
```

## ✅ Post-Installation Checklist

After running the migration:

1. **Verify Database Tables**
   ```sql
   SHOW TABLES;
   -- Should show 13 tables
   ```

2. **Check Admin User**
   ```sql
   SELECT * FROM users WHERE email = 'admin@archivart.com';
   ```

3. **Verify Permissions**
   ```sql
   SELECT COUNT(*) FROM permissions;
   -- Should show 18 permissions
   ```

4. **Test Admin Login**
   - Navigate to: `http://your-domain/admin/login`
   - Email: `admin@archivart.com`
   - Password: `admin123`

5. **IMPORTANT: Change Admin Password**
   - After first login, immediately change the default password
   - Go to Settings → Profile → Change Password

## 🔄 Database Maintenance

### To Reset Database (Development Only):

```bash
# WARNING: This will delete all data!

# Option 1: Drop and recreate
mysql -u root -p -e "DROP DATABASE archivartv2; CREATE DATABASE archivartv2;"
mysql -u root -p archivartv2 < database/production_migration.sql

# Option 2: Use restore script
node database/restore_database.js
```

### To Backup Database:

```bash
# Backup entire database
mysqldump -u root -p archivartv2 > backup_$(date +%Y%m%d).sql

# Backup schema only
mysqldump -u root -p --no-data archivartv2 > schema_backup.sql

# Backup data only
mysqldump -u root -p --no-create-info archivartv2 > data_backup.sql
```

## 🐛 Troubleshooting

### Issue: "Table already exists"
**Solution:** The migration uses `CREATE TABLE IF NOT EXISTS` and `INSERT IGNORE`, so it's safe to run multiple times.

### Issue: "Access denied"
**Solution:** Check your database credentials in `.env` file.

### Issue: "Unknown database"
**Solution:** Create the database first:
```sql
CREATE DATABASE archivartv2;
```

### Issue: "DELIMITER command not recognized"
**Solution:** Use `mysql` command line client, not other SQL clients. Or use the Node.js restore script instead.

### Issue: "Procedure already exists"
**Solution:** Drop existing procedures first:
```sql
DROP PROCEDURE IF EXISTS DeleteModuleWithCascade;
DROP PROCEDURE IF EXISTS DeleteModuleActionWithCascade;
DROP PROCEDURE IF EXISTS DeletePermissionWithCascade;
DROP PROCEDURE IF EXISTS DeleteRoleWithCascade;
DROP PROCEDURE IF EXISTS DeleteUserWithCascade;
```

## 📞 Support

For issues or questions:
1. Check the troubleshooting section above
2. Review the migration file comments
3. Check application logs
4. Verify database connectivity

## 🔒 Security Best Practices

1. **Change default admin password immediately**
2. **Never commit .env file to version control**
3. **Use strong database passwords**
4. **Enable SSL for database connections in production**
5. **Regularly backup your database**
6. **Monitor failed login attempts**
7. **Review API usage logs**
8. **Keep stored procedures updated**

## 📈 Version History

- **v1.0.0** (2025-01-23) - Initial production migration
  - Complete RBAC system
  - Security features
  - Media management
  - Cascade deletion procedures

---

**Need to update the migration?**
Always test changes in development first, create a backup, then apply to production.
