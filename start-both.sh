#!/bin/bash

# Start Python service in background
cd python-service
python app.py &
PYTHON_PID=$!

# Go back to main directory
cd ..

# Start Node.js service
npm start &
NODE_PID=$!

# Function to handle shutdown
cleanup() {
    echo "Shutting down services..."
    kill $PYTHON_PID $NODE_PID
    wait
    exit 0
}

# Set up signal handlers
trap cleanup SIGTERM SIGINT

# Wait for both processes
wait
