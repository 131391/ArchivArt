# 📁 ArchivArt Database Files

## 🎯 Quick Reference

| File | Purpose | When to Use |
|------|---------|-------------|
| **`production_migration.sql`** | ⭐ Complete production migration | Fresh database setup (RECOMMENDED) |
| **`restore_database.js`** | Node.js restore script | Alternative to SQL file, better progress tracking |
| **`cascade_delete_utility.js`** | Safe deletion CLI tool | Maintenance and safe RBAC deletion |
| **`QUICK_START.md`** | Quick setup guide | First-time setup instructions |
| **`PRODUCTION_SETUP.md`** | Complete documentation | Detailed setup and troubleshooting |

## 📋 File Descriptions

### Essential Files (Use These)

#### 1. `production_migration.sql` ⭐ **PRIMARY FILE**
- **Size:** 29KB
- **Purpose:** Complete database migration for production
- **Contains:**
  - All 13 table schemas
  - System data (modules, roles, permissions)
  - Admin user creation
  - Cascade deletion stored procedures
  - Idempotent (safe to run multiple times)

**Usage:**
```bash
mysql -h HOST -u USER -p DATABASE < production_migration.sql
```

#### 2. `restore_database.js` 
- **Size:** 12KB
- **Purpose:** Node.js script for database restoration
- **Features:**
  - Better error handling
  - Progress indicators
  - Automatic rollback on errors
  - Uses environment variables from `.env`

**Usage:**
```bash
node database/restore_database.js
```

#### 3. `cascade_delete_utility.js`
- **Size:** 22KB
- **Purpose:** CLI utility for safe RBAC component deletion
- **Features:**
  - Interactive mode
  - Shows deletion impact before executing
  - Uses stored procedures
  - Prevents accidental data loss
  - Detailed logging

**Usage:**
```bash
node database/cascade_delete_utility.js
```

**Interactive Commands:**
- Delete module
- Delete module action
- Delete permission
- Delete role
- Delete user
- Exit

### Documentation Files

#### 4. `QUICK_START.md`
- **Purpose:** Quick setup guide for beginners
- **Content:** Step-by-step setup instructions
- **Best for:** First-time deployment

#### 5. `PRODUCTION_SETUP.md`
- **Purpose:** Comprehensive setup documentation
- **Content:**
  - Detailed file descriptions
  - Installation instructions
  - Troubleshooting guide
  - Security best practices
  - Maintenance procedures
- **Best for:** Production deployment and maintenance

### Legacy/Backup Files

#### 6. `production_migration_fixed.sql`
- **Size:** 18KB
- **Purpose:** Backup version with cascade deletion fixes
- **Status:** Kept for reference, use `production_migration.sql` instead

#### 7. `run_production_migration.js`
- **Size:** 13KB
- **Purpose:** Node.js script to run SQL migration
- **Status:** Alternative to command-line MySQL
- **Note:** Handles `DELIMITER` issues in some environments

#### 8. `PRODUCTION_MIGRATION_README.md`
- **Size:** 14KB
- **Purpose:** Legacy documentation
- **Status:** Superseded by `PRODUCTION_SETUP.md`

## 🚀 Getting Started

### For First-Time Setup

1. **Read:** `QUICK_START.md`
2. **Run:** `production_migration.sql` OR `restore_database.js`
3. **Login:** Use admin credentials (admin@archivart.com / admin123)
4. **Secure:** Change default password immediately

### For Maintenance

1. **Safe Deletion:** Use `cascade_delete_utility.js`
2. **Troubleshooting:** Refer to `PRODUCTION_SETUP.md`
3. **Backup:** Regular database dumps

## 📊 What Gets Installed

### Tables (13)
```
Core:         users, media, user_sessions
RBAC:         modules, module_actions, permissions, roles, 
              role_permissions, user_roles
Security:     blacklisted_tokens, failed_login_attempts, api_usage
Config:       settings
```

### System Data
```
Modules:      5 (dashboard, users, media, rbac, settings)
Roles:        6 (super_admin, admin, moderator, editor, viewer, user)
Permissions:  18 (across all modules)
Users:        1 (admin@archivart.com)
```

### Stored Procedures (5)
```
- DeleteModuleWithCascade
- DeleteModuleActionWithCascade  
- DeletePermissionWithCascade
- DeleteRoleWithCascade
- DeleteUserWithCascade
```

## 🔐 Security Features

✅ **Safe Cascade Deletion** - No accidental data loss  
✅ **Transaction-based** - All or nothing operations  
✅ **Token Blacklisting** - Revoke JWT tokens  
✅ **Failed Login Tracking** - Monitor security threats  
✅ **API Usage Logging** - Track API calls  
✅ **Password Hashing** - bcrypt with salt  

## 💡 Common Workflows

### Fresh Installation
```bash
# 1. Configure .env
# 2. Run migration
mysql -u root -p database_name < database/production_migration.sql
# 3. Login and change password
```

### Database Reset (Development)
```bash
# WARNING: Deletes all data!
node database/restore_database.js
```

### Safe Role Deletion
```bash
# Use the CLI utility
node database/cascade_delete_utility.js
# Follow interactive prompts
```

### Database Backup
```bash
# Full backup
mysqldump -u root -p database_name > backup.sql

# Schema only
mysqldump -u root -p --no-data database_name > schema.sql
```

## 🐛 Troubleshooting

**Issue:** "DELIMITER command not found"
- Use MySQL command line client
- OR use `restore_database.js` instead

**Issue:** "Procedure already exists"
- Drop procedures first
- OR use `DROP PROCEDURE IF EXISTS` in migration

**Issue:** "Foreign key constraint fails"
- Ensure parent tables exist
- Check cascade deletion procedures

**Issue:** "Connection refused"
- Verify database host and port in `.env`
- Check firewall settings
- Ensure database is running

## 📞 Need Help?

1. Check `QUICK_START.md` for basic setup
2. Review `PRODUCTION_SETUP.md` for detailed docs
3. Verify `.env` configuration
4. Check application logs
5. Test database connection

## 🔄 Version Control

**Current Version:** 1.0.0

**Files to Commit:**
- ✅ `production_migration.sql`
- ✅ `restore_database.js`
- ✅ `cascade_delete_utility.js`
- ✅ All `.md` documentation files

**Files to Ignore:**
- ❌ `.env` (contains sensitive credentials)
- ❌ Backup files (`*.sql` backups)
- ❌ Temporary files

## 📈 Migration History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2025-01-23 | Initial production migration with RBAC and security |

---

**🎉 Your database is production-ready!**

For the latest updates and best practices, always refer to the documentation files in this directory.
