# ArchivArt Production Migration

This directory contains the production database migration for the ArchivArt application with a complete RBAC (Role-Based Access Control) system.

## Overview

The production migration creates a comprehensive database setup with:
- **Single Admin User**: One admin user with full access to all system features
- **Complete RBAC System**: Modules, actions, roles, and permissions
- **All System Permissions**: Full access to all modules and their actions
- **Production-Ready Schema**: Optimized for production deployment

## Files

- `production_migration.sql` - Complete production database schema and data
- `run_production_migration.js` - Node.js script to run the migration
- `cascade_delete_utility.js` - Utility for safe cascade deletion of RBAC components
- `PRODUCTION_MIGRATION_README.md` - This documentation file

## Quick Start

### Option 1: Using the Node.js Script (Recommended)

```bash
# Run production migration
node database/run_production_migration.js

# Drop existing database and recreate (WARNING: Deletes all data!)
node database/run_production_migration.js --drop-db

# Show help
node database/run_production_migration.js --help
```

### Option 2: Using MySQL Command Line

```bash
# Run the migration directly
mysql -u root -p < database/production_migration.sql
```

## What's Included

### Core Tables
- **users** - User accounts and authentication (without legacy role column)
- **media** - Media files and metadata
- **user_sessions** - JWT token management
- **settings** - Application configuration

### RBAC Tables
- **modules** - System modules (Dashboard, Users, Media, RBAC, Settings, Security)
- **module_actions** - Actions within each module (view, create, update, delete, etc.)
- **roles** - System roles (super_admin, admin, moderator, editor, viewer, user)
- **permissions** - Granular permissions linking modules and actions
- **role_permissions** - Junction table linking roles to permissions
- **user_roles** - User role assignments

### Security Tables
- **blacklisted_tokens** - Token revocation
- **security_events** - Security event logging
- **failed_login_attempts** - Brute force protection
- **api_usage** - API request tracking

### System Data
- **6 System Modules**: Dashboard, Users, Media, RBAC, Settings, Security
- **30+ Module Actions**: Complete set of actions for each module
- **6 System Roles**: From super_admin to regular user
- **30+ Permissions**: Granular permissions for all actions
- **1 Admin User**: Single admin with full access
- **Default Settings**: Production-ready configuration

## Default Admin Credentials

After migration, you can login with:

- **Email**: admin@archivart.com
- **Password**: admin123

**⚠️ IMPORTANT**: Change the admin password immediately after first login!

## System Modules

### 1. Dashboard
- **Actions**: View Dashboard
- **Permissions**: dashboard.view

### 2. User Management
- **Actions**: View, Create, Update, Delete, Block Users
- **Permissions**: users.view, users.create, users.update, users.delete, users.block

### 3. Media Management
- **Actions**: View, Upload, Edit, Delete, Scan Media
- **Permissions**: media.view, media.upload, media.edit, media.delete, media.scan

### 4. RBAC (Role-Based Access Control)
- **Actions**: 
  - Roles: View, Create, Update, Delete
  - Permissions: View, Create, Update, Delete
  - Modules: View, Create, Update, Delete
  - Actions: View, Create, Update, Delete
  - Assign Roles to Users
- **Permissions**: Complete set of RBAC management permissions

### 5. System Settings
- **Actions**: View, Update Settings
- **Permissions**: settings.view, settings.update

### 6. Security
- **Actions**: View Security, View Logs, View Sessions, Revoke Sessions
- **Permissions**: security.view, security.logs.view, security.sessions.view, security.sessions.revoke

## System Roles

### 1. Super Administrator (super_admin)
- **Description**: Full system access with all permissions
- **Permissions**: ALL permissions (30+ permissions)
- **Usage**: System administrator with complete control

### 2. Administrator (admin)
- **Description**: Administrative access to most system features
- **Permissions**: Most permissions except super admin specific ones
- **Usage**: General system administration

### 3. Moderator (moderator)
- **Description**: Moderation access to content and users
- **Permissions**: User and media management permissions
- **Usage**: Content and user moderation

### 4. Editor (editor)
- **Description**: Content editing and management permissions
- **Permissions**: Media management permissions
- **Usage**: Content creation and editing

### 5. Viewer (viewer)
- **Description**: Read-only access to system features
- **Permissions**: View permissions only
- **Usage**: Read-only access for monitoring

### 6. Regular User (user)
- **Description**: Basic user permissions
- **Permissions**: Basic media viewing
- **Usage**: Standard user access

## Database Structure

```
archivartv1/
├── users (1 record - admin user)
├── modules (6 records - system modules)
├── module_actions (30+ records - module actions)
├── roles (6 records - system roles)
├── permissions (30+ records - system permissions)
├── role_permissions (30+ records - super_admin has all)
├── user_roles (1 record - admin has super_admin role)
├── media (0 records - empty initially)
├── user_sessions (0 records - empty initially)
├── blacklisted_tokens (0 records - empty initially)
├── security_events (0 records - empty initially)
├── failed_login_attempts (0 records - empty initially)
├── api_usage (0 records - empty initially)
└── settings (1 record - default settings)
```

## Environment Variables

Make sure your `.env` file contains:

```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=archivartv1
DB_PORT=3306
```

## Features Included

### Security Features
- ✅ JWT token management
- ✅ Token blacklisting
- ✅ Failed login tracking
- ✅ Security event logging
- ✅ API usage monitoring
- ✅ Rate limiting support

### User Management
- ✅ Local authentication
- ✅ Social login support (Google, Facebook)
- ✅ RBAC system with roles and permissions
- ✅ Account status management
- ✅ Email verification
- ✅ Two-factor authentication support

### Media Management
- ✅ File upload tracking
- ✅ Image hash for duplicate detection
- ✅ Perceptual hash for similarity detection
- ✅ OpenCV descriptors for image matching
- ✅ Media type support (image, video, audio)
- ✅ View count tracking

### RBAC System
- ✅ Module-based permissions
- ✅ Action-based permissions
- ✅ Role-based access control
- ✅ Granular permission system
- ✅ User role assignments
- ✅ System and custom roles

### Application Settings
- ✅ Site configuration
- ✅ File upload limits
- ✅ AWS S3 integration
- ✅ SMTP configuration
- ✅ JWT and session settings

### Cascade Deletion System
- ✅ Hierarchical deletion with stored procedures
- ✅ Safe deletion of modules, actions, permissions, roles, and users
- ✅ Automatic cleanup of related data
- ✅ Transaction-based operations for data integrity
- ✅ Utility script for easy management

## Production Deployment

For production deployment:

1. **Update passwords** - Change default admin password immediately
2. **Configure SMTP** - Set up email settings for notifications
3. **Set up AWS S3** - Configure file storage for media
4. **Enable SSL** - Use HTTPS in production
5. **Backup strategy** - Set up regular database backups
6. **Environment variables** - Configure all production settings
7. **Security hardening** - Review and update security settings

## Troubleshooting

### Common Issues

1. **Permission Denied**
   ```bash
   # Make sure MySQL user has proper permissions
   GRANT ALL PRIVILEGES ON archivartv1.* TO 'your_user'@'localhost';
   FLUSH PRIVILEGES;
   ```

2. **Database Already Exists**
   ```bash
   # Use --drop-db flag to recreate
   node database/run_production_migration.js --drop-db
   ```

3. **Connection Failed**
   - Check your `.env` file
   - Verify MySQL is running
   - Check firewall settings
   - Verify database credentials

4. **Migration Fails**
   - Check MySQL error logs
   - Verify database user permissions
   - Ensure MySQL version compatibility (5.7+)

### Verification

After migration, verify the setup:

```sql
-- Check tables
SHOW TABLES;

-- Check admin user
SELECT u.name, u.email, r.display_name as role, COUNT(rp.permission_id) as permissions
FROM users u
INNER JOIN user_roles ur ON u.id = ur.user_id
INNER JOIN roles r ON ur.role_id = r.id
LEFT JOIN role_permissions rp ON r.id = rp.role_id AND rp.is_active = 1
WHERE u.email = 'admin@archivart.com'
GROUP BY u.id;

-- Check modules and actions
SELECT m.display_name as module, COUNT(ma.id) as actions
FROM modules m
LEFT JOIN module_actions ma ON m.id = ma.module_id AND ma.is_active = 1
GROUP BY m.id
ORDER BY m.order_index;

-- Check permissions
SELECT COUNT(*) as total_permissions FROM permissions WHERE is_active = 1;
```

## Security Considerations

### Immediate Actions Required
1. **Change Admin Password**: Update the default password immediately
2. **Review Permissions**: Verify all permissions are correctly assigned
3. **Enable 2FA**: Consider enabling two-factor authentication
4. **Update Settings**: Configure production-specific settings

### Best Practices
1. **Regular Backups**: Set up automated database backups
2. **Monitor Logs**: Review security events regularly
3. **Update Dependencies**: Keep all packages updated
4. **Access Control**: Limit admin access to trusted users only
5. **Audit Trail**: Monitor user activities and permission changes

## Cascade Deletion System

The production migration includes a comprehensive cascade deletion system that ensures data integrity when deleting RBAC components.

### Stored Procedures

The migration creates the following stored procedures for safe deletion:

- **`DeleteModuleWithCascade(module_id)`** - Deletes a module and all related data
- **`DeleteModuleActionWithCascade(action_id)`** - Deletes an action and all related data
- **`DeletePermissionWithCascade(permission_id)`** - Deletes a permission and all related data
- **`DeleteRoleWithCascade(role_id)`** - Deletes a role and all related data (non-system roles only)
- **`DeleteUserWithCascade(user_id)`** - Deletes a user and all related data

### Deletion Hierarchy

When you delete a component, the system automatically deletes related data in the correct order:

#### Module Deletion
1. Role permissions for the module's permissions
2. All permissions for the module
3. All actions for the module
4. The module itself

#### Action Deletion
1. Role permissions for the action's permissions
2. All permissions for the action
3. The action itself

#### Permission Deletion
1. All role permissions for the permission
2. The permission itself

#### Role Deletion
1. All user role assignments
2. All role permissions
3. The role itself (only if not a system role)

#### User Deletion
1. All user sessions
2. All user roles
3. All media uploaded by the user
4. All security events for the user
5. All API usage records
6. All blacklisted tokens
7. The user itself

### Using the Cascade Deletion Utility

```bash
# List all components
node database/cascade_delete_utility.js --list-modules
node database/cascade_delete_utility.js --list-actions
node database/cascade_delete_utility.js --list-permissions
node database/cascade_delete_utility.js --list-roles
node database/cascade_delete_utility.js --list-users

# Delete components (with cascade)
node database/cascade_delete_utility.js --delete-module 1
node database/cascade_delete_utility.js --delete-action 5
node database/cascade_delete_utility.js --delete-permission 10
node database/cascade_delete_utility.js --delete-role 2
node database/cascade_delete_utility.js --delete-user 3

# Show help
node database/cascade_delete_utility.js --help
```

### Direct SQL Usage

You can also call the stored procedures directly:

```sql
-- Delete a module and all related data
CALL DeleteModuleWithCascade(1);

-- Delete an action and all related data
CALL DeleteModuleActionWithCascade(5);

-- Delete a permission and all related data
CALL DeletePermissionWithCascade(10);

-- Delete a role and all related data
CALL DeleteRoleWithCascade(2);

-- Delete a user and all related data
CALL DeleteUserWithCascade(3);
```

## Support

If you encounter issues:

1. Check the console output for error messages
2. Verify your MySQL connection settings
3. Ensure you have proper database permissions
4. Check the application logs after starting the server
5. Review the troubleshooting section above
6. Use the cascade deletion utility for safe data management

## Version History

- **v1.1.0** (2025-01-23) - Enhanced production migration
  - Complete RBAC system with cascade deletion
  - Single admin user with full permissions
  - All system modules and actions
  - Production-ready schema
  - Comprehensive security features
  - Stored procedures for hierarchical deletion
  - Cascade deletion utility script
  - Database name updated to archivartv2

- **v1.0.0** (2025-01-23) - Initial production migration
  - Complete RBAC system
  - Single admin user with full permissions
  - All system modules and actions
  - Production-ready schema
  - Comprehensive security features

## Next Steps

After running the migration:

1. **Start the application** and verify it's working
2. **Login with admin credentials** and change the password
3. **Configure system settings** for your environment
4. **Set up additional users** if needed
5. **Configure file storage** (AWS S3 or local)
6. **Set up email notifications** if required
7. **Review and customize permissions** as needed

The system is now ready for production use with a complete RBAC system and a single admin user with full access to all modules and actions.
