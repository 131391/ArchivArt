#!/bin/bash

# ArchivArt Database Migration Script
echo "🚀 Running ArchivArt Database Migration..."

# Database connection details (load from .env file)
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

# Set defaults if not provided
DB_HOST=${DB_HOST:-"localhost"}
DB_PORT=${DB_PORT:-"3306"}
DB_USER=${DB_USER:-"root"}
DB_PASSWORD=${DB_PASSWORD:-""}
DB_NAME=${DB_NAME:-"archivart"}

# Run the migration
echo "📊 Creating tables and inserting data..."
mysql --user="$DB_USER" --password="$DB_PASSWORD" --host="$DB_HOST" --port="$DB_PORT" "$DB_NAME" < database/complete_migration.sql

if [ $? -eq 0 ]; then
    echo "✅ Migration completed successfully!"
    echo ""
    echo "🔑 Admin Login Credentials:"
    echo "   Email: admin@archivart.com"
    echo "   Password: admin123"
    echo ""
    echo "👥 Test User Credentials (password: password123):"
    echo "   john.smith@example.com"
    echo "   sarah.johnson@example.com"
    echo "   michael.brown@example.com"
    echo "   (and 9 more dummy users)"
    echo ""
    echo "📊 Database Summary:"
    mysql --user="$DB_USER" --password="$DB_PASSWORD" --host="$DB_HOST" --port="$DB_PORT" "$DB_NAME" -e "
        SELECT 'Users' as table_name, COUNT(*) as count FROM users
        UNION ALL
        SELECT 'Media' as table_name, COUNT(*) as count FROM media;
        
        SELECT 'User Roles:' as info;
        SELECT role, COUNT(*) as count FROM users GROUP BY role;
    " 2>/dev/null || echo "Note: Database summary requires .env file with credentials"
else
    echo "❌ Migration failed. Please check the error messages above."
    exit 1
fi
