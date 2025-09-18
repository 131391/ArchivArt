# ArchivArt Database Migration

This directory contains the complete database migration for the ArchivArt application.

## Files

- `complete_database_migration.sql` - Complete database schema and sample data
- `run_migration.js` - Node.js script to run the migration
- `MIGRATION_README.md` - This documentation file

## Quick Start

### Option 1: Using the Node.js Script (Recommended)

```bash
# Run migration normally
node database/run_migration.js

# Drop existing database and recreate (WARNING: Deletes all data!)
node database/run_migration.js --drop-db

# Show help
node database/run_migration.js --help
```

### Option 2: Using MySQL Command Line

```bash
# Run the migration directly
mysql -u root -p < database/complete_database_migration.sql
```

## What's Included

### Core Tables
- **users** - User accounts and authentication
- **media** - Media files and metadata
- **user_sessions** - JWT token management
- **settings** - Application configuration

### Security Tables
- **blacklisted_tokens** - Token revocation
- **security_events** - Security event logging
- **failed_login_attempts** - Brute force protection
- **api_usage** - API request tracking

### Sample Data
- 1 admin user
- 14 regular users
- 4 sample media files
- Default application settings

## Default Credentials

After migration, you can login with:

- **Email**: admin@archivart.com
- **Password**: password

## Database Structure

```
archivart/
├── users (15 records)
├── media (4 records)
├── user_sessions (0 records)
├── blacklisted_tokens (0 records)
├── security_events (0 records)
├── failed_login_attempts (0 records)
├── api_usage (0 records)
└── settings (1 record)
```

## Environment Variables

Make sure your `.env` file contains:

```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=archivart
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
- ✅ User roles (admin, user)
- ✅ Account status management
- ✅ Email verification

### Media Management
- ✅ File upload tracking
- ✅ Image hash for duplicate detection
- ✅ OpenCV descriptors for image matching
- ✅ Media type support (image, video, audio)
- ✅ View count tracking

### Application Settings
- ✅ Site configuration
- ✅ File upload limits
- ✅ AWS S3 integration
- ✅ SMTP configuration
- ✅ JWT and session settings

## Troubleshooting

### Common Issues

1. **Permission Denied**
   ```bash
   # Make sure MySQL user has proper permissions
   GRANT ALL PRIVILEGES ON archivart.* TO 'your_user'@'localhost';
   FLUSH PRIVILEGES;
   ```

2. **Database Already Exists**
   ```bash
   # Use --drop-db flag to recreate
   node database/run_migration.js --drop-db
   ```

3. **Connection Failed**
   - Check your `.env` file
   - Verify MySQL is running
   - Check firewall settings

### Verification

After migration, verify the setup:

```sql
-- Check tables
SHOW TABLES;

-- Check user count
SELECT COUNT(*) FROM users;

-- Check admin user
SELECT * FROM users WHERE role = 'admin';

-- Check media count
SELECT COUNT(*) FROM media;
```

## Production Deployment

For production deployment:

1. **Update passwords** - Change default admin password
2. **Configure SMTP** - Set up email settings
3. **Set up AWS S3** - Configure file storage
4. **Enable SSL** - Use HTTPS in production
5. **Backup strategy** - Set up regular database backups

## Support

If you encounter issues:

1. Check the console output for error messages
2. Verify your MySQL connection settings
3. Ensure you have proper database permissions
4. Check the application logs after starting the server

## Version History

- **v1.0.0** (2025-09-18) - Initial complete migration
  - All core tables
  - Security tables
  - Sample data
  - Enhanced user sessions
  - Settings table
