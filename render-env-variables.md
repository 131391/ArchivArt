# 🚀 Render Environment Variables for ArchivArt

## Your Service URL: https://archivart.onrender.com/

Copy and paste these environment variables into your Render service:

### 🔧 **Required Environment Variables**

```bash
# Database Configuration (REPLACE WITH YOUR VALUES)
DB_HOST=your-database-host
DB_PORT=3306
DB_USER=your-db-user
DB_PASSWORD=your-db-password
DB_NAME=archivart

# Security (REPLACE WITH YOUR VALUES)
JWT_SECRET=your-jwt-secret-key-here-archivart-2024
SESSION_SECRET=your-session-secret-here-archivart-2024

# Python OpenCV Service Configuration
OPENCV_HOST=0.0.0.0
OPENCV_PORT=5001
OPENCV_DEBUG=false
ORB_FEATURES=500
MAX_FILE_SIZE=52428800
REQUEST_TIMEOUT=30

# Gunicorn Configuration
GUNICORN_WORKERS=4
GUNICORN_WORKER_CLASS=sync
GUNICORN_TIMEOUT=30

# Logging
LOG_LEVEL=INFO
ENABLE_METRICS=true

# AWS S3 Configuration (REPLACE WITH YOUR VALUES)
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
AWS_REGION=us-east-1
AWS_S3_BUCKET=archivart-media

# OAuth Configuration (REPLACE WITH YOUR VALUES)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
FACEBOOK_APP_ID=your-facebook-app-id
FACEBOOK_APP_SECRET=your-facebook-app-secret

# Server Configuration
PORT=3000
NODE_ENV=production
IMAGE_BASE_URL=https://archivart.onrender.com
```

## 📋 **Step-by-Step Setup Instructions**

### **Step 1: Go to Render Dashboard**
1. Go to [https://dashboard.render.com](https://dashboard.render.com)
2. Click on your **ArchivArt service**

### **Step 2: Add Environment Variables**
1. Click on **"Environment"** tab
2. Click **"Add Environment Variable"**
3. Add each variable from the list above

### **Step 3: Important Variables to Replace**

**You MUST replace these with your actual values:**

```bash
# Database (REPLACE WITH YOUR VALUES)
DB_HOST=your-database-host
DB_PORT=3306
DB_USER=your-db-user
DB_PASSWORD=your-db-password
DB_NAME=archivart

# Security (generate new secrets for production)
JWT_SECRET=your-production-jwt-secret-key-here
SESSION_SECRET=your-production-session-secret-here

# AWS S3 (if you're using it)
AWS_ACCESS_KEY_ID=your-actual-aws-key
AWS_SECRET_ACCESS_KEY=your-actual-aws-secret
AWS_REGION=us-east-1
AWS_S3_BUCKET=your-actual-bucket-name
```

### **Step 4: Restart Service**
1. After adding all environment variables
2. Click **"Manual Deploy"** or restart the service
3. Wait for deployment to complete

## 🧪 **Test Your Setup**

After setting up environment variables, test these URLs:

1. **Main App**: [https://archivart.onrender.com/](https://archivart.onrender.com/)
2. **Health Check**: [https://archivart.onrender.com/health](https://archivart.onrender.com/health)
3. **Admin Panel**: [https://archivart.onrender.com/admin](https://archivart.onrender.com/admin)
4. **API Docs**: [https://archivart.onrender.com/api-docs](https://archivart.onrender.com/api-docs)

## 🔍 **Python OpenCV Service**

Since you're using a single service, the Python OpenCV service will run internally on port 5001. The Node.js app will connect to it using:

```bash
OPENCV_SERVICE_URL=http://localhost:5001
```

## ⚠️ **Important Notes**

1. **Replace placeholder values** with your actual credentials
2. **Use strong secrets** for JWT_SECRET and SESSION_SECRET
3. **Make sure database credentials** are correct
4. **Restart service** after adding environment variables

## 🆘 **Troubleshooting**

### If the service doesn't start:
- Check all required environment variables are set
- Verify database credentials are correct
- Check service logs in Render dashboard

### If duplicate detection doesn't work:
- Verify Python service is running on port 5001
- Check OPENCV_SERVICE_URL is set to http://localhost:5001
- Check service logs for Python service errors
