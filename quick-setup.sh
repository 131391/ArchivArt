#!/bin/bash

echo "🚀 ArchivArt Quick Setup"
echo "======================="

# Check if .env exists
if [ ! -f .env ]; then
    echo "📝 Creating .env file from template..."
    cp env.example .env
    echo "⚠️  Please edit .env file with your database credentials before continuing!"
    echo "   Required: DB_HOST, DB_USER, DB_PASSWORD, DB_NAME"
    exit 1
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Create admin user
echo "👤 Setting up admin user..."
node setup-admin.js

echo ""
echo "🎉 Setup complete!"
echo ""
echo "🌐 Access your application:"
echo "   Admin Panel: http://localhost:3000/admin"
echo "   API Docs: http://localhost:3000/api-docs"
echo "   Home Page: http://localhost:3000"
echo ""
echo "🔑 Admin Login:"
echo "   Email: admin@archivart.com"
echo "   Password: admin123"
echo ""
echo "▶️  Start the server with: npm run dev"
