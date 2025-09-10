# ArchivArt Deployment Guide

This guide covers deployment strategies for the ArchivArt application with OpenCV integration, specifically for Render's free tier.

## 🎯 **Deployment Options**

### **Option 1: Single Service Deployment (Recommended for Free Tier)**

Since Render's free tier has limitations, the best approach is to integrate the Python OpenCV functionality directly into the Node.js application.

#### **Benefits:**
- ✅ **Single deployment** - Only one service to manage
- ✅ **Free tier compatible** - No additional service costs
- ✅ **Simpler architecture** - No inter-service communication
- ✅ **Better performance** - No network latency between services

#### **Implementation:**
We'll use `node-opencv` or `opencv4nodejs` to run OpenCV directly in Node.js.

### **Option 2: Separate Services (For Paid Tiers)**

For production environments with paid tiers, you can deploy both services separately.

## 🛠️ **Option 1: Single Service Implementation**

### **Step 1: Install Node.js OpenCV Package**

```bash
npm install opencv4nodejs
```

### **Step 2: Create OpenCV Service for Node.js**

```javascript
// src/services/nodeOpenCVService.js
const cv = require('opencv4nodejs');

class NodeOpenCVService {
    constructor() {
        this.orb = new cv.ORBDetector(2000);
        this.matcher = new cv.BFMatcher(cv.NORM_HAMMING, true);
    }

    async extractFeatures(imagePath) {
        try {
            const img = cv.imread(imagePath);
            const gray = img.cvtColor(cv.COLOR_BGR2GRAY);
            
            const keypoints = this.orb.detect(gray);
            const descriptors = this.orb.compute(gray, keypoints);
            
            return {
                success: true,
                descriptors: descriptors.getDataAsArray(),
                featureCount: keypoints.length
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    async matchFeatures(queryDescriptors, storedDescriptors) {
        try {
            const queryDesc = new cv.Mat(queryDescriptors, cv.CV_8U);
            const storedDesc = new cv.Mat(storedDescriptors, cv.CV_8U);
            
            const matches = this.matcher.match(queryDesc, storedDesc);
            const sortedMatches = matches.sort((a, b) => a.distance - b.distance);
            
            const score = sortedMatches.length > 0 ? 
                sortedMatches.reduce((sum, match) => sum + match.distance, 0) / sortedMatches.length : 
                9999;
            
            return {
                success: true,
                score: score,
                matchCount: sortedMatches.length
            };
        } catch (error) {
            return {
                success: false,
                error: error.message,
                score: 9999
            };
        }
    }

    async checkForDuplicates(newImagePath, existingMedia, threshold = 50) {
        try {
            const newFeatures = await this.extractFeatures(newImagePath);
            if (!newFeatures.success) {
                return { success: false, error: newFeatures.error };
            }

            let bestMatch = null;
            let bestScore = 9999;

            for (const media of existingMedia) {
                if (!media.descriptors || media.descriptors.length === 0) continue;

                const matchResult = await this.matchFeatures(newFeatures.descriptors, media.descriptors);
                if (matchResult.success && matchResult.score < bestScore) {
                    bestScore = matchResult.score;
                    bestMatch = media;
                }
            }

            return {
                success: true,
                isDuplicate: bestMatch && bestScore <= threshold,
                duplicateMedia: bestMatch,
                matchScore: bestScore
            };
        } catch (error) {
            return {
                success: false,
                error: error.message,
                isDuplicate: false
            };
        }
    }
}

module.exports = new NodeOpenCVService();
```

### **Step 3: Update Media Controller**

```javascript
// src/controllers/mediaController.js
const nodeOpenCVService = require('../services/nodeOpenCVService');

// Replace opencvService with nodeOpenCVService in uploadMedia and updateMedia methods
```

### **Step 4: Update Package.json**

```json
{
  "dependencies": {
    "opencv4nodejs": "^5.6.0",
    // ... other dependencies
  },
  "scripts": {
    "start": "node src/app.js",
    "build": "npm install"
  }
}
```

## 🌐 **Option 2: Separate Services Deployment**

### **For Render Paid Tiers or Other Platforms**

#### **Node.js Service (Main App)**
- **Platform**: Render Web Service
- **Build Command**: `npm install`
- **Start Command**: `npm start`
- **Environment Variables**:
  ```
  OPENCV_SERVICE_URL=https://your-opencv-service.onrender.com
  ```

#### **Python OpenCV Service**
- **Platform**: Render Web Service (separate)
- **Build Command**: `pip install -r requirements.txt`
- **Start Command**: `python app.py`
- **Environment Variables**:
  ```
  FLASK_ENV=production
  PORT=5001
  ```

## 📋 **Render Deployment Checklist**

### **For Single Service (Recommended)**

#### **1. Prepare for Deployment**
```bash
# Remove Python service files (not needed for single service)
rm -rf python-service/
rm start-services.sh

# Update package.json with opencv4nodejs
npm install opencv4nodejs

# Update media controller to use Node.js OpenCV service
```

#### **2. Render Configuration**
- **Repository**: Your GitHub repository
- **Root Directory**: `/` (root of project)
- **Build Command**: `npm install`
- **Start Command**: `npm start`
- **Environment**: `Node`

#### **3. Environment Variables**
```
NODE_ENV=production
DATABASE_URL=your_database_url
SESSION_SECRET=your_session_secret
```

#### **4. Build Settings**
- **Node Version**: 18.x or 20.x
- **Auto-Deploy**: Yes (on git push)

### **For Separate Services**

#### **Main App Service**
- **Name**: `archivart-main`
- **Type**: Web Service
- **Build Command**: `npm install`
- **Start Command**: `npm start`

#### **OpenCV Service**
- **Name**: `archivart-opencv`
- **Type**: Web Service
- **Build Command**: `pip install -r requirements.txt`
- **Start Command**: `python app.py`
- **Python Version**: 3.9+

## 🔧 **Production Optimizations**

### **Single Service Optimizations**

```javascript
// src/services/nodeOpenCVService.js
class NodeOpenCVService {
    constructor() {
        // Use fewer features for faster processing
        this.orb = new cv.ORBDetector(1000); // Reduced from 2000
        this.matcher = new cv.BFMatcher(cv.NORM_HAMMING, true);
        
        // Cache for frequently accessed descriptors
        this.descriptorCache = new Map();
    }

    // Add caching for better performance
    async extractFeatures(imagePath) {
        const cacheKey = imagePath;
        if (this.descriptorCache.has(cacheKey)) {
            return this.descriptorCache.get(cacheKey);
        }
        
        // ... existing extraction logic
        
        this.descriptorCache.set(cacheKey, result);
        return result;
    }
}
```

### **Memory Management**

```javascript
// Add to app.js
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    process.exit(0);
});

// Memory monitoring
setInterval(() => {
    const used = process.memoryUsage();
    console.log('Memory usage:', {
        rss: Math.round(used.rss / 1024 / 1024) + ' MB',
        heapTotal: Math.round(used.heapTotal / 1024 / 1024) + ' MB',
        heapUsed: Math.round(used.heapUsed / 1024 / 1024) + ' MB'
    });
}, 30000); // Every 30 seconds
```

## 🚨 **Free Tier Limitations & Solutions**

### **Render Free Tier Limits**
- **750 hours/month** (enough for 24/7 operation)
- **512MB RAM** (sufficient for Node.js + OpenCV)
- **Sleep after 15 minutes** of inactivity
- **Cold start time**: ~30 seconds

### **Solutions for Free Tier**

#### **1. Keep-Alive Service**
```javascript
// Add to app.js
const keepAlive = () => {
    setInterval(() => {
        // Ping your own service to keep it awake
        fetch('https://your-app.onrender.com/health')
            .catch(err => console.log('Keep-alive ping failed:', err));
    }, 14 * 60 * 1000); // Every 14 minutes
};

// Start keep-alive in production
if (process.env.NODE_ENV === 'production') {
    keepAlive();
}
```

#### **2. Optimize for Cold Starts**
```javascript
// Lazy load OpenCV
let opencvService = null;

const getOpenCVService = async () => {
    if (!opencvService) {
        opencvService = require('../services/nodeOpenCVService');
    }
    return opencvService;
};

// Use in controllers
const opencv = await getOpenCVService();
```

#### **3. Reduce Memory Usage**
```javascript
// Use smaller images for feature extraction
const resizeImage = (imagePath) => {
    const img = cv.imread(imagePath);
    const resized = img.resize(800, 600); // Resize to max 800x600
    return resized;
};
```

## 📊 **Performance Monitoring**

### **Add Health Check Endpoint**
```javascript
// Add to app.js
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        memory: process.memoryUsage(),
        uptime: process.uptime()
    });
});
```

### **Error Monitoring**
```javascript
// Add error tracking
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    // Log to external service if needed
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
```

## 🎯 **Recommended Approach**

For your current setup with Render's free tier, I recommend:

1. **Use Option 1 (Single Service)** with `opencv4nodejs`
2. **Implement keep-alive** to prevent sleep
3. **Optimize memory usage** for 512MB limit
4. **Add monitoring** for performance tracking
5. **Use lazy loading** for faster cold starts

This approach will give you the best performance and reliability on Render's free tier while maintaining all the OpenCV functionality you need.

## 🚀 **Next Steps**

1. **Choose deployment option** based on your needs
2. **Update code** for chosen approach
3. **Test locally** before deploying
4. **Deploy to Render** with proper configuration
5. **Monitor performance** and optimize as needed

Would you like me to help you implement the single-service approach with `opencv4nodejs`?
