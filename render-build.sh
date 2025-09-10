#!/bin/bash

# Render build script for ArchivArt
# This script handles the build process for Render deployment

echo "🚀 Starting ArchivArt build process..."

# Install dependencies
echo "📦 Installing Node.js dependencies..."
npm install

# Check if Python service files exist
if [ -d "python-service" ]; then
    echo "🐍 Python service directory found"
    echo "📝 Note: Python OpenCV service will be used for image processing"
else
    echo "⚠️ Python service directory not found"
fi

# Check if database migration files exist
if [ -f "database/settings_table.sql" ]; then
    echo "🗄️ Database migration files found"
else
    echo "⚠️ Database migration files not found"
fi

echo "✅ Build process completed successfully!"
echo "🎯 Application will use Python OpenCV service for image processing"
echo "📊 Fallback to basic image processing if Python service is unavailable"
