const fs = require('fs').promises;
const path = require('path');

class NodeOpenCVService {
    constructor() {
        this.isAvailable = false;
        this.orb = null;
        this.matcher = null;
        this.descriptorCache = new Map();
        this.initializeOpenCV();
    }

    async initializeOpenCV() {
        try {
            // Try to load opencv4nodejs
            const cv = require('opencv4nodejs');
            
            // Initialize ORB detector with fewer features for better performance
            this.orb = new cv.ORBDetector(1000); // Reduced from 2000 for better performance
            this.matcher = new cv.BFMatcher(cv.NORM_HAMMING, true);
            
            this.isAvailable = true;
        } catch (error) {
            this.isAvailable = false;
        }
    }

    async isHealthy() {
        return this.isAvailable;
    }

    async extractFeatures(imagePath) {
        if (!this.isAvailable) {
            return {
                success: false,
                error: 'OpenCV service not available. Please install opencv4nodejs for full functionality.'
            };
        }

        try {
            // Check cache first
            const cacheKey = imagePath;
            if (this.descriptorCache.has(cacheKey)) {
                const cached = this.descriptorCache.get(cacheKey);
                
                return cached;
            }

           
            
            const cv = require('opencv4nodejs');
            
            // Read and preprocess image
            const img = cv.imread(imagePath);
            const gray = img.cvtColor(cv.COLOR_BGR2GRAY);
            
            // Resize image if too large (for better performance)
            const maxSize = 800;
            if (gray.rows > maxSize || gray.cols > maxSize) {
                const scale = Math.min(maxSize / gray.rows, maxSize / gray.cols);
                const newRows = Math.round(gray.rows * scale);
                const newCols = Math.round(gray.cols * scale);
                gray.resize(newRows, newCols);
            }
            
            // Extract keypoints and descriptors
            const keypoints = this.orb.detect(gray);
            const descriptors = this.orb.compute(gray, keypoints);
            
            const result = {
                success: true,
                descriptors: descriptors.getDataAsArray(),
                featureCount: keypoints.length
            };

            // Cache the result
            this.descriptorCache.set(cacheKey, result);
            
            
            return result;
            
        } catch (error) {
            
            return {
                success: false,
                error: error.message
            };
        }
    }

    async matchFeatures(queryDescriptors, storedDescriptors) {
        if (!this.isAvailable) {
            return {
                success: false,
                error: 'OpenCV service not available',
                score: 9999
            };
        }

        try {
            const cv = require('opencv4nodejs');
            
            // Convert arrays to OpenCV Mat objects
            const queryDesc = new cv.Mat(queryDescriptors, cv.CV_8U);
            const storedDesc = new cv.Mat(storedDescriptors, cv.CV_8U);
            
            // Match descriptors
            const matches = this.matcher.match(queryDesc, storedDesc);
            const sortedMatches = matches.sort((a, b) => a.distance - b.distance);
            
            // Calculate match score (lower is better)
            const score = sortedMatches.length > 0 ? 
                sortedMatches.reduce((sum, match) => sum + match.distance, 0) / sortedMatches.length : 
                9999;
            
            return {
                success: true,
                score: score,
                matchCount: sortedMatches.length,
                matches: sortedMatches.length
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
           
            
            // Extract features from new image
            const newFeatures = await this.extractFeatures(newImagePath);
            if (!newFeatures.success) {
                return {
                    success: false,
                    error: newFeatures.error,
                    isDuplicate: false
                };
            }

            if (newFeatures.featureCount === 0) {
                
                return {
                    success: true,
                    isDuplicate: false,
                    duplicateMedia: null
                };
            }

            let bestMatch = null;
            let bestScore = 9999;

            // Compare with existing media
            for (const media of existingMedia) {
                if (!media.descriptors || media.descriptors.length === 0) {
                    continue;
                }

                try {
                    const matchResult = await this.matchFeatures(newFeatures.descriptors, media.descriptors);
                    if (matchResult.success && matchResult.score < bestScore) {
                        bestScore = matchResult.score;
                        bestMatch = media;
                    }
                } catch (matchError) {
                    
                    continue;
                }
            }

            const isDuplicate = bestMatch && bestScore <= threshold;
            

            return {
                success: true,
                isDuplicate: isDuplicate,
                duplicateMedia: bestMatch,
                matchScore: bestScore,
                matchCount: bestMatch ? 'N/A' : 0
            };
            
        } catch (error) {
           
            return {
                success: false,
                error: error.message,
                isDuplicate: false
            };
        }
    }

    async findMatchingMedia(scannedImagePath, mediaList, threshold = 50) {
        try {
           
            
            // Extract features from scanned image
            const scannedFeatures = await this.extractFeatures(scannedImagePath);
            if (!scannedFeatures.success) {
                return {
                    success: false,
                    error: scannedFeatures.error,
                    matchedMedia: null
                };
            }

            if (scannedFeatures.featureCount === 0) {
                return {
                    success: true,
                    matchedMedia: null,
                    message: 'No features could be extracted from scanned image'
                };
            }

            let bestMatch = null;
            let bestScore = 9999;

            // Compare with all media
            for (const media of mediaList) {
                if (!media.descriptors || media.descriptors.length === 0) {
                    continue;
                }

                try {
                    const matchResult = await this.matchFeatures(scannedFeatures.descriptors, media.descriptors);
                    if (matchResult.success && matchResult.score < bestScore) {
                        bestScore = matchResult.score;
                        bestMatch = media;
                    }
                } catch (matchError) {
                   
                    continue;
                }
            }

            if (bestMatch && bestScore <= threshold) {
               
                return {
                    success: true,
                    matchedMedia: bestMatch,
                    matchScore: bestScore,
                    matchCount: 'N/A'
                };
            } else {
               
                return {
                    success: true,
                    matchedMedia: null,
                    message: 'No matching media found'
                };
            }
            
        } catch (error) {
           
            return {
                success: false,
                error: error.message,
                matchedMedia: null
            };
        }
    }

    // Clear cache to free memory
    clearCache() {
        this.descriptorCache.clear();
       
    }

    // Get cache statistics
    getCacheStats() {
        return {
            size: this.descriptorCache.size,
            keys: Array.from(this.descriptorCache.keys()).map(k => path.basename(k))
        };
    }
}

module.exports = new NodeOpenCVService();
