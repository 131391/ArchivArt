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
                return;
            }
            
            // Try Node.js OpenCV service as secondary
            const isNodeOpenCVHealthy = await this.secondaryService.isHealthy();
            
            if (isNodeOpenCVHealthy) {
                this.currentService = this.secondaryService;
               
                return;
            }
            
            // Fall back to basic image service
            this.currentService = this.fallbackService;
           
            
        } catch (error) {
           
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
        
        // Use lower thresholds for more sensitive duplicate detection
        const actualThreshold = threshold || (this.currentService === this.primaryService ? 30 : 50);
        
        const result = await this.currentService.checkForDuplicates(newImagePath, existingMedia, actualThreshold);
        
        // Add service info to result
        if (this.currentService === this.primaryService) {
            result.service = 'python-opencv';
        } else if (this.currentService === this.secondaryService) {
            result.service = 'node-opencv';
        } else {
            result.service = 'fallback';
        }
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
        if (this.currentService === this.primaryService) {
            result.service = 'python-opencv';
        } else if (this.currentService === this.secondaryService) {
            result.service = 'node-opencv';
        } else {
            result.service = 'fallback';
        }
        result.threshold = actualThreshold;
        
        return result;
    }

    clearCache() {
        if (this.currentService && typeof this.currentService.clearCache === 'function') {
            this.currentService.clearCache();
        }
    }

    getCacheStats() {
        if (this.currentService && typeof this.currentService.getCacheStats === 'function') {
            const stats = this.currentService.getCacheStats();
            if (this.currentService === this.primaryService) {
                stats.service = 'python-opencv';
            } else if (this.currentService === this.secondaryService) {
                stats.service = 'node-opencv';
            } else {
                stats.service = 'fallback';
            }
            return stats;
        }
        return { service: 'none', size: 0, keys: [] };
    }

    // Get current service information
    getServiceInfo() {
        let currentService = 'fallback';
        if (this.currentService === this.primaryService) {
            currentService = 'python-opencv';
        } else if (this.currentService === this.secondaryService) {
            currentService = 'node-opencv';
        }
        
        return {
            current: currentService,
            pythonOpenCVAvailable: this.currentService === this.primaryService,
            nodeOpenCVAvailable: this.currentService === this.secondaryService,
            fallbackActive: this.currentService === this.fallbackService
        };
    }

    // Force switch to fallback service
    async switchToFallback() {
       
        this.currentService = this.fallbackService;
    }

    // Try to reinitialize OpenCV service
    async tryReinitializeOpenCV() {
        try {
           
            await this.primaryService.initializeOpenCV();
            
            const isHealthy = await this.primaryService.isHealthy();
            if (isHealthy) {
                this.currentService = this.primaryService;
               
                return true;
            } else {
               
                return false;
            }
        } catch (error) {
           
            return false;
        }
    }
}

module.exports = new SmartImageService();
