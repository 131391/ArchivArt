#!/bin/bash

# Production OpenCV Feature Matching Service Startup Script

set -e  # Exit on any error

echo "🚀 Starting OpenCV Feature Matching Service (Production Mode)..."

# Configuration
SERVICE_NAME="opencv-service"
SERVICE_DIR="$(dirname "$0")"
LOG_DIR="$SERVICE_DIR/logs"
PID_FILE="$SERVICE_DIR/$SERVICE_NAME.pid"
LOG_FILE="$LOG_DIR/$SERVICE_NAME.log"

# Create logs directory
mkdir -p "$LOG_DIR"

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "❌ Python3 is not installed. Please install Python3 first."
    exit 1
fi

# Check if pip is installed
if ! command -v pip3 &> /dev/null; then
    echo "❌ pip3 is not installed. Please install pip3 first."
    exit 1
fi

# Navigate to the service directory
cd "$SERVICE_DIR"

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "📦 Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
echo "🔧 Activating virtual environment..."
source venv/bin/activate

# Install/upgrade dependencies
echo "📥 Installing/updating dependencies..."
pip install --upgrade pip
pip install -r requirements.txt

# Check if OpenCV is properly installed
echo "🔍 Verifying OpenCV installation..."
python3 -c "import cv2; print(f'OpenCV version: {cv2.__version__}')" || {
    echo "❌ OpenCV installation failed. Please check the installation."
    exit 1
}

# Check if service is already running
if [ -f "$PID_FILE" ]; then
    PID=$(cat "$PID_FILE")
    if ps -p $PID > /dev/null 2>&1; then
        echo "⚠️ Service is already running with PID $PID"
        echo "   To stop it, run: kill $PID"
        echo "   Or use: ./stop-production.sh"
        exit 1
    else
        echo "🧹 Removing stale PID file..."
        rm -f "$PID_FILE"
    fi
fi

# Set production environment variables
export OPENCV_DEBUG=false
export OPENCV_HOST=0.0.0.0
export OPENCV_PORT=${OPENCV_PORT:-5001}
export ORB_FEATURES=${ORB_FEATURES:-500}
export MAX_FILE_SIZE=${MAX_FILE_SIZE:-52428800}  # 50MB
export REQUEST_TIMEOUT=${REQUEST_TIMEOUT:-30}
export LOG_LEVEL=${LOG_LEVEL:-INFO}
export ENABLE_METRICS=true

echo "🔧 Production Configuration:"
echo "  - Host: $OPENCV_HOST"
echo "  - Port: $OPENCV_PORT"
echo "  - ORB Features: $ORB_FEATURES"
echo "  - Max File Size: $((MAX_FILE_SIZE / 1024 / 1024))MB"
echo "  - Request Timeout: ${REQUEST_TIMEOUT}s"
echo "  - Log Level: $LOG_LEVEL"
echo "  - Metrics: $ENABLE_METRICS"
echo ""

# Start the service with Gunicorn for production
echo "🌟 Starting service with Gunicorn..."
echo "📡 Service will be available at: http://$OPENCV_HOST:$OPENCV_PORT"
echo "🔍 Health check: http://$OPENCV_HOST:$OPENCV_PORT/health"
echo "📊 Metrics: http://$OPENCV_HOST:$OPENCV_PORT/metrics"
echo "📝 Logs: $LOG_FILE"
echo ""

# Start with Gunicorn
gunicorn \
    --bind $OPENCV_HOST:$OPENCV_PORT \
    --workers 4 \
    --worker-class sync \
    --worker-connections 1000 \
    --max-requests 1000 \
    --max-requests-jitter 100 \
    --timeout $REQUEST_TIMEOUT \
    --keep-alive 2 \
    --preload \
    --access-logfile - \
    --error-logfile - \
    --log-level info \
    --pid $PID_FILE \
    --daemon \
    app:app

# Wait a moment for the service to start
sleep 2

# Check if the service started successfully
if [ -f "$PID_FILE" ]; then
    PID=$(cat "$PID_FILE")
    if ps -p $PID > /dev/null 2>&1; then
        echo "✅ Service started successfully with PID $PID"
        echo "📊 Service status:"
        curl -s "http://$OPENCV_HOST:$OPENCV_PORT/health" | python3 -m json.tool 2>/dev/null || echo "   Health check endpoint not yet ready"
    else
        echo "❌ Service failed to start"
        exit 1
    fi
else
    echo "❌ PID file not created, service may have failed to start"
    exit 1
fi

echo ""
echo "🎉 OpenCV Feature Matching Service is running in production mode!"
echo "   Use './stop-production.sh' to stop the service"
echo "   Use './status-production.sh' to check service status"
