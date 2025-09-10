# Multi-stage build for Node.js + Python
FROM node:18-alpine AS node-builder

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

# Python stage
FROM python:3.9-slim

# Install system dependencies for OpenCV
RUN apt-get update && apt-get install -y \
    libopencv-dev \
    python3-opencv \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

# Install Node.js
RUN curl -fsSL https://deb.nodesource.com/setup_18.x | bash - \
    && apt-get install -y nodejs

WORKDIR /app

# Copy Node.js dependencies
COPY --from=node-builder /app/node_modules ./node_modules
COPY package*.json ./

# Copy Python service
COPY python-service/ ./python-service/
RUN pip install -r python-service/requirements.txt

# Copy main application
COPY src/ ./src/
COPY *.js ./

# Create uploads directory
RUN mkdir -p src/public/uploads/media src/public/uploads/logos

# Expose ports
EXPOSE 3000 5001

# Start both services
COPY start-both.sh ./
RUN chmod +x start-both.sh

CMD ["./start-both.sh"]
