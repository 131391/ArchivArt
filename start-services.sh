#!/bin/bash

# ArchivArt Services Startup Script
# This script starts both the Node.js backend and Python OpenCV microservice

echo "🚀 Starting ArchivArt Services..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to check if a port is in use
check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null ; then
        return 0  # Port is in use
    else
        return 1  # Port is free
    fi
}

# Function to kill processes on specific ports
kill_port() {
    local port=$1
    local pids=$(lsof -ti:$port)
    if [ ! -z "$pids" ]; then
        echo -e "${YELLOW}Killing processes on port $port...${NC}"
        kill -9 $pids
        sleep 2
    fi
}

# Clean up any existing processes
echo -e "${BLUE}Cleaning up existing processes...${NC}"
kill_port 3000  # Node.js backend
kill_port 5001  # Python OpenCV service

# Check if Python service directory exists
if [ ! -d "python-service" ]; then
    echo -e "${RED}❌ Python service directory not found!${NC}"
    echo "Please ensure the python-service directory exists with the OpenCV microservice."
    exit 1
fi

# Check if Node.js dependencies are installed
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}📦 Installing Node.js dependencies...${NC}"
    npm install
fi

# Check if Python dependencies are installed
if [ ! -d "python-service/venv" ]; then
    echo -e "${YELLOW}📦 Setting up Python virtual environment...${NC}"
    cd python-service
    python3 -m venv venv
    source venv/bin/activate
    pip install -r requirements.txt
    cd ..
fi

# Start Python OpenCV service in background
echo -e "${GREEN}🐍 Starting Python OpenCV service on port 5001...${NC}"
cd python-service
source venv/bin/activate
python app.py &
PYTHON_PID=$!
cd ..

# Wait a moment for Python service to start
sleep 3

# Check if Python service is running
if ! check_port 5001; then
    echo -e "${RED}❌ Failed to start Python OpenCV service!${NC}"
    kill $PYTHON_PID 2>/dev/null
    exit 1
fi

echo -e "${GREEN}✅ Python OpenCV service started successfully${NC}"

# Start Node.js backend
echo -e "${GREEN}🟢 Starting Node.js backend on port 3000...${NC}"
npm start &
NODE_PID=$!

# Wait a moment for Node.js to start
sleep 3

# Check if Node.js service is running
if ! check_port 3000; then
    echo -e "${RED}❌ Failed to start Node.js backend!${NC}"
    kill $NODE_PID 2>/dev/null
    kill $PYTHON_PID 2>/dev/null
    exit 1
fi

echo -e "${GREEN}✅ Node.js backend started successfully${NC}"

# Display service information
echo ""
echo -e "${BLUE}🎉 All services are running!${NC}"
echo -e "${GREEN}📡 Node.js Backend: http://localhost:3000${NC}"
echo -e "${GREEN}🐍 Python OpenCV Service: http://localhost:5001${NC}"
echo -e "${GREEN}🔍 OpenCV Health Check: http://localhost:5001/health${NC}"
echo ""
echo -e "${YELLOW}Press Ctrl+C to stop all services${NC}"

# Function to cleanup on exit
cleanup() {
    echo ""
    echo -e "${YELLOW}🛑 Stopping services...${NC}"
    kill $NODE_PID 2>/dev/null
    kill $PYTHON_PID 2>/dev/null
    kill_port 3000
    kill_port 5001
    echo -e "${GREEN}✅ All services stopped${NC}"
    exit 0
}

# Set up signal handlers
trap cleanup SIGINT SIGTERM

# Wait for processes
wait
