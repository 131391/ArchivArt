const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

class FallbackImageService {
    constructor() {
        this.isAvailable = true; // Always available as fallback
    }

    async isHealthy() {
        return true;
    }

    async extractFeatures(imagePath) {
        try {
            // Read image file and generate a simple hash-based descriptor
            const imageBuffer = await fs.readFile(imagePath);
            const hash = crypto.createHash('sha256').update(imageBuffer).digest('hex');
            
            // Convert hash to a simple descriptor array (32 bytes = 256 bits)
            const descriptor = [];
            for (let i = 0; i < hash.length; i += 2) {
                descriptor.push(parseInt(hash.substr(i, 2), 16));
            }
            
            // Create a more robust descriptor by repeating and modifying
            const robustDescriptor = [];
            for (let i = 0; i < 100; i++) { // Create 100 descriptor points
                const index = i % descriptor.length;
                const value = (descriptor[index] + i) % 256;
                robustDescriptor.push([value, value, value, value, value, value, value, value]); // 8-byte descriptor
            }
            
            return {
                success: true,
                descriptors: robustDescriptor,
                featureCount: robustDescriptor.length,
                method: 'fallback_hash'
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
            // Simple Hamming distance calculation
            let totalDistance = 0;
            let matchCount = 0;
            
            const minLength = Math.min(queryDescriptors.length, storedDescriptors.length);
            
            for (let i = 0; i < minLength; i++) {
                const queryDesc = queryDescriptors[i];
                const storedDesc = storedDescriptors[i];
                
                if (queryDesc && storedDesc && queryDesc.length === storedDesc.length) {
                    let distance = 0;
                    for (let j = 0; j < queryDesc.length; j++) {
                        distance += Math.abs(queryDesc[j] - storedDesc[j]);
                    }
                    totalDistance += distance;
                    matchCount++;
                }
            }
            
            const score = matchCount > 0 ? totalDistance / matchCount : 9999;
            
            return {
                success: true,
                score: score,
                matchCount: matchCount,
                matches: matchCount
            };
            
        } catch (error) {
            console.error('❌ Fallback: Error matching features:', error.message);
            return {
                success: false,
                error: error.message,
                score: 9999
            };
        }
    }

    async checkForDuplicates(newImagePath, existingMedia, threshold = 100) {
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
                    console.warn(`⚠️ Fallback: Error matching with media ${media.id}:`, matchError.message);
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

    async findMatchingMedia(scannedImagePath, mediaList, threshold = 100) {
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
                    console.warn(`⚠️ Fallback: Error matching with media ${media.id}:`, matchError.message);
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

    getCacheStats() {
        return {
            size: 0,
            keys: [],
            method: 'fallback'
        };
    }
}

module.exports = new FallbackImageService();
