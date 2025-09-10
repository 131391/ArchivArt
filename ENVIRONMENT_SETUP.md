# 🔧 Environment Management Guide

## Overview

ArchivArt uses a **multi-service architecture** with separate environment configurations for each service:

- **Node.js Main App**: `.env` (root directory)
- **Python OpenCV Service**: `python-service/.env`

## 📁 Environment File Structure

```
ArchivArtWeb/
├── .env                    # Node.js app environment
├── env.template           # Node.js app template
├── python-service/
│   ├── .env              # Python service environment
│   └── env.template      # Python service template
└── ENVIRONMENT_SETUP.md  # This guide
```

## 🚀 Setup Instructions

### 1. **Local Development Setup**

```bash
# Copy templates to create actual .env files
cp env.template .env
cp python-service/env.template python-service/.env

# Edit the files with your actual values
nano .env
nano python-service/.env
```

### 2. **Production Deployment (Render)**

#### **Node.js Service Environment Variables:**
```bash
# Database
DB_HOST=your-production-db-host
DB_PORT=3306
DB_USER=your-db-user
DB_PASSWORD=your-db-password
DB_NAME=archivart

# Security
JWT_SECRET=your-production-jwt-secret
SESSION_SECRET=your-production-session-secret

# AWS S3
AWS_ACCESS_KEY_ID=your-aws-key
AWS_SECRET_ACCESS_KEY=your-aws-secret
AWS_REGION=us-east-1
AWS_S3_BUCKET=your-bucket

# OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
FACEBOOK_APP_ID=your-facebook-app-id
FACEBOOK_APP_SECRET=your-facebook-app-secret

# Service URLs
OPENCV_SERVICE_URL=https://your-python-service.onrender.com
IMAGE_BASE_URL=https://your-node-service.onrender.com

# Server
PORT=3000
NODE_ENV=production
```

#### **Python Service Environment Variables:**
```bash
# Server
OPENCV_HOST=0.0.0.0
OPENCV_PORT=5001
OPENCV_DEBUG=false

# OpenCV
ORB_FEATURES=500
MAX_FILE_SIZE=52428800
REQUEST_TIMEOUT=30

# Gunicorn
GUNICORN_WORKERS=4
GUNICORN_WORKER_CLASS=sync
GUNICORN_TIMEOUT=30

# Logging
LOG_LEVEL=INFO
ENABLE_METRICS=true
```

### 3. **Docker Deployment**

```bash
# Use docker-compose with environment variables
docker-compose up -d

# Or set environment variables in docker-compose.yml
environment:
  - DB_HOST=your-db-host
  - OPENCV_SERVICE_URL=http://python-service:5001
  - ORB_FEATURES=500
```

## 🔄 Environment Variable Flow

### **Local Development:**
```
Node.js App (.env) → Database, AWS, OAuth
Python Service (python-service/.env) → OpenCV config
```

### **Production (Separate Services):**
```
Node.js Service (Render) → Database, AWS, OAuth, OPENCV_SERVICE_URL
Python Service (Render) → OpenCV config, Gunicorn settings
```

### **Production (Docker):**
```
Docker Container → All environment variables from docker-compose.yml
```

## 🔐 Security Best Practices

1. **Never commit `.env` files** to version control
2. **Use strong secrets** for JWT and session keys
3. **Rotate secrets regularly** in production
4. **Use different secrets** for development and production
5. **Limit AWS permissions** to only what's needed

## 🛠️ Environment-Specific Configurations

### **Development:**
- `NODE_ENV=development`
- `OPENCV_DEBUG=true`
- `DEBUG=true`
- Local database and services

### **Production:**
- `NODE_ENV=production`
- `OPENCV_DEBUG=false`
- `DEBUG=false`
- Production database and external services

## 📋 Checklist for Deployment

- [ ] Copy environment templates
- [ ] Fill in production values
- [ ] Set up database connection
- [ ] Configure AWS S3 credentials
- [ ] Set up OAuth applications
- [ ] Configure service URLs
- [ ] Test environment variables
- [ ] Deploy services
- [ ] Verify connectivity between services

## 🆘 Troubleshooting

### **Common Issues:**

1. **Service Connection Failed:**
   - Check `OPENCV_SERVICE_URL` in Node.js service
   - Verify Python service is running
   - Check network connectivity

2. **Database Connection Failed:**
   - Verify database credentials
   - Check database host and port
   - Ensure database is accessible

3. **AWS S3 Upload Failed:**
   - Verify AWS credentials
   - Check S3 bucket permissions
   - Verify region configuration

### **Debug Commands:**
```bash
# Check environment variables
echo $DB_HOST
echo $OPENCV_SERVICE_URL

# Test service connectivity
curl http://localhost:5001/health
curl http://localhost:3000/health
```
