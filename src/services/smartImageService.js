const opencvService = require('./opencvService');
const nodeOpenCVService = require('./nodeOpenCVService');
const fallbackImageService = require('./fallbackImageService');

class SmartImageService {
    constructor() {
        this.primaryService = opencvService; // Python OpenCV service
        this.secondaryService = nodeOpenCVService; // Node.js OpenCV service
        this.fallbackService = fallbackImageService;
        this.currentService = null;
        this.initializeService();
    }

    async initializeService() {
        try {
            // Try Python OpenCV service first
            const isPythonOpenCVHealthy = await this.primaryService.isHealthy();
            
            if (isPythonOpenCVHealthy) {
                this.currentService = this.primaryService;
                console.log('🐍 Using Python OpenCV service for image processing');
                return;
            }
            
            // Try Node.js OpenCV service as secondary
            const isNodeOpenCVHealthy = await this.secondaryService.isHealthy();
            
            if (isNodeOpenCVHealthy) {
                this.currentService = this.secondaryService;
                console.log('🟢 Using Node.js OpenCV service for image processing');
                return;
            }
            
            // Fall back to basic image service
            this.currentService = this.fallbackService;
            console.log('⚠️ OpenCV services not available, using fallback image service');
            
        } catch (error) {
            console.warn('⚠️ Error initializing OpenCV services, using fallback:', error.message);
            this.currentService = this.fallbackService;
        }
    }

    async isHealthy() {
        if (this.currentService) {
            return await this.currentService.isHealthy();
        }
        return false;
    }

    async extractFeatures(imagePath) {
        if (!this.currentService) {
            await this.initializeService();
        }
        
        const result = await this.currentService.extractFeatures(imagePath);
        
        // Add service info to result
        if (this.currentService === this.primaryService) {
            result.service = 'python-opencv';
        } else if (this.currentService === this.secondaryService) {
            result.service = 'node-opencv';
        } else {
            result.service = 'fallback';
        }
        
        return result;
    }

    async matchFeatures(queryDescriptors, storedDescriptors) {
        if (!this.currentService) {
            await this.initializeService();
        }
        
        const result = await this.currentService.matchFeatures(queryDescriptors, storedDescriptors);
        
        // Add service info to result
        result.service = this.currentService === this.primaryService ? 'opencv' : 'fallback';
        
        return result;
    }

    async checkForDuplicates(newImagePath, existingMedia, threshold = null) {
        if (!this.currentService) {
            await this.initializeService();
        }
        
        // Use different thresholds based on service
        const actualThreshold = threshold || (this.currentService === this.primaryService ? 50 : 100);
        
        const result = await this.currentService.checkForDuplicates(newImagePath, existingMedia, actualThreshold);
        
        // Add service info to result
        result.service = this.currentService === this.primaryService ? 'opencv' : 'fallback';
        result.threshold = actualThreshold;
        
        return result;
    }

    async findMatchingMedia(scannedImagePath, mediaList, threshold = null) {
        if (!this.currentService) {
            await this.initializeService();
        }
        
        // Use different thresholds based on service
        const actualThreshold = threshold || (this.currentService === this.primaryService ? 50 : 100);
        
        const result = await this.currentService.findMatchingMedia(scannedImagePath, mediaList, actualThreshold);
        
        // Add service info to result
        result.service = this.currentService === this.primaryService ? 'opencv' : 'fallback';
        result.threshold = actualThreshold;
        
        return result;
    }

    clearCache() {
        if (this.currentService) {
            this.currentService.clearCache();
        }
    }

    getCacheStats() {
        if (this.currentService) {
            const stats = this.currentService.getCacheStats();
            stats.service = this.currentService === this.primaryService ? 'opencv' : 'fallback';
            return stats;
        }
        return { service: 'none', size: 0, keys: [] };
    }

    // Get current service information
    getServiceInfo() {
        return {
            current: this.currentService === this.primaryService ? 'opencv' : 'fallback',
            opencvAvailable: this.currentService === this.primaryService,
            fallbackActive: this.currentService === this.fallbackService
        };
    }

    // Force switch to fallback service
    async switchToFallback() {
        console.log('🔄 Switching to fallback image service');
        this.currentService = this.fallbackService;
    }

    // Try to reinitialize OpenCV service
    async tryReinitializeOpenCV() {
        try {
            console.log('🔄 Attempting to reinitialize OpenCV service...');
            await this.primaryService.initializeOpenCV();
            
            const isHealthy = await this.primaryService.isHealthy();
            if (isHealthy) {
                this.currentService = this.primaryService;
                console.log('✅ Successfully switched back to OpenCV service');
                return true;
            } else {
                console.log('❌ OpenCV service still not available');
                return false;
            }
        } catch (error) {
            console.error('❌ Error reinitializing OpenCV service:', error.message);
            return false;
        }
    }
}

module.exports = new SmartImageService();
