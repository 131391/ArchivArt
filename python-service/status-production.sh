#!/bin/bash

# Production OpenCV Feature Matching Service Status Script

SERVICE_NAME="opencv-service"
SERVICE_DIR="$(dirname "$0")"
PID_FILE="$SERVICE_DIR/$SERVICE_NAME.pid"

echo "📊 OpenCV Feature Matching Service Status"
echo "=========================================="

# Check if PID file exists
if [ ! -f "$PID_FILE" ]; then
    echo "❌ Service is not running (no PID file found)"
    exit 1
fi

# Read PID from file
PID=$(cat "$PID_FILE")

# Check if process is running
if ! ps -p $PID > /dev/null 2>&1; then
    echo "❌ Service is not running (process with PID $PID not found)"
    echo "🧹 Removing stale PID file..."
    rm -f "$PID_FILE"
    exit 1
fi

echo "✅ Service is running with PID $PID"

# Get process information
echo ""
echo "📋 Process Information:"
echo "  - PID: $PID"
echo "  - Command: $(ps -p $PID -o cmd=)"
echo "  - CPU Usage: $(ps -p $PID -o %cpu=)%"
echo "  - Memory Usage: $(ps -p $PID -o %mem=)%"
echo "  - Start Time: $(ps -p $PID -o lstart=)"

# Check service health
echo ""
echo "🏥 Health Check:"
OPENCV_HOST=${OPENCV_HOST:-0.0.0.0}
OPENCV_PORT=${OPENCV_PORT:-5001}

if command -v curl &> /dev/null; then
    HEALTH_RESPONSE=$(curl -s "http://$OPENCV_HOST:$OPENCV_PORT/health" 2>/dev/null)
    if [ $? -eq 0 ]; then
        echo "✅ Health endpoint responding"
        echo "📊 Service Info:"
        echo "$HEALTH_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$HEALTH_RESPONSE"
    else
        echo "❌ Health endpoint not responding"
    fi
else
    echo "⚠️ curl not available, cannot check health endpoint"
fi

# Check metrics if available
echo ""
echo "📈 Metrics:"
if command -v curl &> /dev/null; then
    METRICS_RESPONSE=$(curl -s "http://$OPENCV_HOST:$OPENCV_PORT/metrics" 2>/dev/null)
    if [ $? -eq 0 ]; then
        echo "✅ Metrics endpoint responding"
        echo "$METRICS_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$METRICS_RESPONSE"
    else
        echo "❌ Metrics endpoint not responding"
    fi
else
    echo "⚠️ curl not available, cannot check metrics endpoint"
fi

echo ""
echo "🔗 Service URLs:"
echo "  - Health: http://$OPENCV_HOST:$OPENCV_PORT/health"
echo "  - Metrics: http://$OPENCV_HOST:$OPENCV_PORT/metrics"
echo "  - Info: http://$OPENCV_HOST:$OPENCV_PORT/info"
