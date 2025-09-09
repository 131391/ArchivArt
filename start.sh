#!/bin/bash

# ArchivArt Startup Script

echo "🚀 Starting ArchivArt AR Media Platform..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Check if MySQL is installed
if ! command -v mysql &> /dev/null; then
    echo "❌ MySQL is not installed. Please install MySQL first."
    exit 1
fi

# Check if .env file exists
if [ ! -f .env ]; then
    echo "⚠️  .env file not found. Creating from template..."
    cp env.example .env
    echo "📝 Please update the .env file with your configuration before running again."
    exit 1
fi

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Check if database exists
echo "🔍 Checking database connection..."
node -e "
const mysql = require('mysql2');
require('dotenv').config();

const connection = mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'archivart'
});

connection.connect((err) => {
    if (err) {
        console.log('❌ Database connection failed:', err.message);
        console.log('📝 Please check your database configuration in .env file');
        process.exit(1);
    } else {
        console.log('✅ Database connected successfully');
        connection.end();
    }
});
"

if [ $? -ne 0 ]; then
    echo "❌ Database setup failed. Please check your configuration."
    exit 1
fi

# Start the application
echo "🎯 Starting ArchivArt server..."
echo "📱 Admin Panel: http://localhost:3000/admin"
echo "📚 API Documentation: http://localhost:3000/api-docs"
echo "🌐 Home Page: http://localhost:3000"
echo ""
echo "Default Admin Login:"
echo "Email: admin@archivart.com"
echo "Password: admin123"
echo ""

# Start with nodemon in development or node in production
if [ "$NODE_ENV" = "production" ]; then
    node src/app.js
else
    npx nodemon src/app.js
fi
