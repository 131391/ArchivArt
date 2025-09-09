# ArchivArt Database Setup Instructions

## Prerequisites
1. Create a `.env` file from `env.example`
2. Update the database credentials in `.env` with your actual values

## Database Setup

### Option 1: Using the migration script
```bash
# Make sure your .env file has the correct database credentials
./run_migration.sh
```

### Option 2: Manual setup
```bash
# Connect to your database and run the migration
mysql --user=your_user --password=your_password --host=your_host --port=your_port your_database < database/complete_migration.sql
```

## Default Credentials
After running the migration, you can login with:

**Admin:**
- Email: `admin@archivart.com`
- Password: `admin123`

**Test Users (password: `password123`):**
- `john.smith@example.com`
- `sarah.johnson@example.com`
- `michael.brown@example.com`
- And 11 more dummy users...

## Environment Variables Required
Make sure your `.env` file contains:
```env
DB_HOST=your_database_host
DB_PORT=your_database_port
DB_USER=your_database_user
DB_PASSWORD=your_database_password
DB_NAME=archivart
JWT_SECRET=your_jwt_secret_key
SESSION_SECRET=your_session_secret
```
