#!/bin/bash

# Production OpenCV Feature Matching Service Stop Script

SERVICE_NAME="opencv-service"
SERVICE_DIR="$(dirname "$0")"
PID_FILE="$SERVICE_DIR/$SERVICE_NAME.pid"

echo "🛑 Stopping OpenCV Feature Matching Service..."

# Check if PID file exists
if [ ! -f "$PID_FILE" ]; then
    echo "⚠️ PID file not found. Service may not be running."
    exit 1
fi

# Read PID from file
PID=$(cat "$PID_FILE")

# Check if process is running
if ! ps -p $PID > /dev/null 2>&1; then
    echo "⚠️ Process with PID $PID is not running. Removing stale PID file."
    rm -f "$PID_FILE"
    exit 1
fi

echo "🔄 Stopping service with PID $PID..."

# Send SIGTERM for graceful shutdown
kill -TERM $PID

# Wait for graceful shutdown (up to 30 seconds)
for i in {1..30}; do
    if ! ps -p $PID > /dev/null 2>&1; then
        echo "✅ Service stopped gracefully"
        rm -f "$PID_FILE"
        exit 0
    fi
    echo "   Waiting for graceful shutdown... ($i/30)"
    sleep 1
done

# If still running, force kill
echo "⚠️ Graceful shutdown timeout. Force killing process..."
kill -KILL $PID

# Wait a moment and check
sleep 2
if ! ps -p $PID > /dev/null 2>&1; then
    echo "✅ Service stopped (force kill)"
    rm -f "$PID_FILE"
else
    echo "❌ Failed to stop service"
    exit 1
fi
