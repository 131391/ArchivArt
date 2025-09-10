# 🚀 Render Environment Variables Setup Guide

## Quick Setup Checklist

### ✅ Python Service Environment Variables

Copy and paste these into your Python service environment variables:

```bash
OPENCV_HOST=0.0.0.0
OPENCV_PORT=5001
OPENCV_DEBUG=false
ORB_FEATURES=500
MAX_FILE_SIZE=52428800
REQUEST_TIMEOUT=30
GUNICORN_WORKERS=4
GUNICORN_WORKER_CLASS=sync
GUNICORN_TIMEOUT=30
LOG_LEVEL=INFO
ENABLE_METRICS=true
FLASK_DEBUG=false
VERBOSE_LOGGING=true
```

### ✅ Node.js Service Environment Variables

Copy and paste these into your Node.js service environment variables:

```bash
# Database (REPLACE WITH YOUR VALUES)
DB_HOST=your-database-host
DB_PORT=3306
DB_USER=your-db-user
DB_PASSWORD=your-db-password
DB_NAME=archivart

# Security (REPLACE WITH YOUR VALUES)
JWT_SECRET=your-jwt-secret-key-here
SESSION_SECRET=your-session-secret-here

# Python Service URL (REPLACE WITH YOUR PYTHON SERVICE URL)
OPENCV_SERVICE_URL=https://your-python-service.onrender.com

# AWS S3 (REPLACE WITH YOUR VALUES)
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
AWS_REGION=us-east-1
AWS_S3_BUCKET=your-bucket-name

# OAuth (REPLACE WITH YOUR VALUES)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
FACEBOOK_APP_ID=your-facebook-app-id
FACEBOOK_APP_SECRET=your-facebook-app-secret

# Server Configuration
PORT=3000
NODE_ENV=production
IMAGE_BASE_URL=https://your-node-service.onrender.com
```

## 🔍 How to Find Your Service URLs

1. **Go to Render Dashboard**
2. **Click on your Python service**
3. **Copy the URL** (e.g., `https://archivart-python-xyz.onrender.com`)
4. **Use this URL as `OPENCV_SERVICE_URL`** in your Node.js service

## ⚠️ Important Notes

1. **Replace placeholder values** with your actual credentials
2. **Use strong secrets** for JWT_SECRET and SESSION_SECRET
3. **Make sure Python service URL** is correct in Node.js service
4. **Restart services** after adding environment variables

## 🧪 Testing Your Setup

After setting environment variables:

1. **Check Python service health**: `https://your-python-service.onrender.com/health`
2. **Check Node.js service health**: `https://your-node-service.onrender.com/health`
3. **Test duplicate detection** by uploading the same image twice

## 🆘 Troubleshooting

### Python Service Not Responding
- Check `OPENCV_PORT=5001`
- Verify `OPENCV_HOST=0.0.0.0`
- Check service logs in Render dashboard

### Node.js Can't Connect to Python
- Verify `OPENCV_SERVICE_URL` is correct
- Make sure Python service is running
- Check both service URLs are accessible

### Database Connection Failed
- Verify database credentials
- Check database host and port
- Ensure database is accessible from Render
