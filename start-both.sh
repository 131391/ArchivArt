#!/bin/bash

# Exit on any error
set -e

echo "🚀 Starting ArchivArt services..."

# Function to handle shutdown
cleanup() {
    echo "🛑 Shutting down services..."
    if [ ! -z "$PYTHON_PID" ]; then
        kill $PYTHON_PID 2>/dev/null || true
    fi
    if [ ! -z "$NODE_PID" ]; then
        kill $NODE_PID 2>/dev/null || true
    fi
    wait
    echo "✅ Services stopped"
    exit 0
}

# Set up signal handlers
trap cleanup SIGTERM SIGINT

# Start Python service in background
echo "🐍 Starting Python OpenCV service..."
cd python-service
python3 app.py &
PYTHON_PID=$!
cd ..

# Wait a moment for Python service to start
sleep 2

# Start Node.js service
echo "🟢 Starting Node.js application..."
npm start &
NODE_PID=$!

echo "✅ Both services started successfully!"
echo "📊 Node.js app: http://localhost:3000"
echo "🔍 Python service: http://localhost:5001"

# Wait for both processes
wait
