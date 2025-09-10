#!/bin/bash

# OpenCV Feature Matching Service Startup Script

echo "🚀 Starting OpenCV Feature Matching Service..."

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
cd "$(dirname "$0")"

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "📦 Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
echo "🔧 Activating virtual environment..."
source venv/bin/activate

# Install dependencies
echo "📥 Installing dependencies..."
pip install -r requirements.txt

# Check if OpenCV is properly installed
echo "🔍 Verifying OpenCV installation..."
python3 -c "import cv2; print(f'OpenCV version: {cv2.__version__}')" || {
    echo "❌ OpenCV installation failed. Please check the installation."
    exit 1
}

# Start the service
echo "🌟 Starting Flask service on port 5001..."
echo "📡 Service will be available at: http://localhost:5001"
echo "🔍 Health check: http://localhost:5001/health"
echo ""
echo "Press Ctrl+C to stop the service"
echo ""

python3 app.py
