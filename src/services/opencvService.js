const axios = require('axios');
const path = require('path');

class OpenCVService {
    constructor() {
        // Use 127.0.0.1 for Docker container communication
        this.baseURL = process.env.OPENCV_SERVICE_URL || 'http://127.0.0.1:5001';
        this.timeout = 30000; // 30 seconds timeout
    }

    /**
     * Check if the OpenCV service is healthy
     * @returns {Promise<boolean>}
     */
    async isHealthy() {
        try {
            const response = await axios.get(`${this.baseURL}/health`, {
                timeout: 5000
            });
            return response.status === 200;
        } catch (error) {
            console.error('OpenCV service health check failed:', error.message);
            return false;
        }
    }

    /**
     * Extract ORB features from an image
     * @param {string} imagePath - Path to the image file
     * @returns {Promise<Object>} - Feature extraction result
     */
    async extractFeatures(imagePath) {
        try {
            // Convert relative path to absolute path
            const absolutePath = path.isAbsolute(imagePath) ? imagePath : path.resolve(imagePath);
            console.log(`🔍 Extracting features from: ${imagePath} (absolute: ${absolutePath})`);
            
            const response = await axios.post(`${this.baseURL}/extract`, {
                image_path: absolutePath
            }, {
                timeout: this.timeout
            });

            if (response.data.success) {
                console.log(`✅ Features extracted successfully: ${response.data.feature_count} features`);
                return {
                    success: true,
                    descriptors: response.data.descriptors,
                    featureCount: response.data.feature_count
                };
            } else {
                console.error('❌ Feature extraction failed:', response.data.error);
                return {
                    success: false,
                    error: response.data.error
                };
            }
        } catch (error) {
            console.error('❌ OpenCV service error:', error.message);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Match features between two descriptor sets
     * @param {Array} queryDescriptors - Query image descriptors
     * @param {Array} storedDescriptors - Stored image descriptors
     * @returns {Promise<Object>} - Match result
     */
    async matchFeatures(queryDescriptors, storedDescriptors) {
        try {
            const response = await axios.post(`${this.baseURL}/match`, {
                query_desc: queryDescriptors,
                stored_desc: storedDescriptors
            }, {
                timeout: this.timeout
            });

            if (response.data.success) {
                return {
                    success: true,
                    score: response.data.score,
                    matchCount: response.data.match_count,
                    matches: response.data.matches
                };
            } else {
                return {
                    success: false,
                    error: response.data.error,
                    score: 9999
                };
            }
        } catch (error) {
            console.error('❌ Feature matching error:', error.message);
            return {
                success: false,
                error: error.message,
                score: 9999
            };
        }
    }

    /**
     * Compare a query image against multiple stored descriptors
     * @param {string} queryImagePath - Path to query image
     * @param {Array} storedDescriptors - Array of stored descriptors with IDs
     * @param {number} threshold - Match threshold (default: 50)
     * @returns {Promise<Object>} - Comparison result
     */
    async compareImage(queryImagePath, storedDescriptors, threshold = 50) {
        try {
            // Convert relative path to absolute path
            const absolutePath = path.isAbsolute(queryImagePath) ? queryImagePath : path.resolve(queryImagePath);
            console.log(`🔍 Comparing image against ${storedDescriptors.length} stored descriptors (path: ${absolutePath})`);
            
            // Convert match count threshold to similarity threshold
            // Python service expects similarity threshold (0.0-1.0)
            // We'll use a simple conversion: threshold/100 = similarity
            const similarityThreshold = Math.min(threshold / 100, 1.0);
            
            const response = await axios.post(`${this.baseURL}/compare`, {
                query_image_path: absolutePath,
                stored_descriptors: storedDescriptors,
                threshold: similarityThreshold
            }, {
                timeout: this.timeout
            });

            if (response.data.success) {
                const result = {
                    success: true,
                    bestMatch: response.data.best_match,
                    allMatches: response.data.all_matches,
                    threshold: response.data.threshold
                };

                if (result.bestMatch) {
                    console.log(`✅ Best match found: ${result.bestMatch.id} (score: ${result.bestMatch.similarity})`);
                } else {
                    console.log('❌ No match found below threshold');
                }

                return result;
            } else {
                console.error('❌ Image comparison failed:', response.data.error);
                return {
                    success: false,
                    error: response.data.error
                };
            }
        } catch (error) {
            console.error('❌ Image comparison error:', error.message);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Check for duplicate images during upload
     * @param {string} newImagePath - Path to the new image
     * @param {Array} existingMedia - Array of existing media with descriptors
     * @param {number} threshold - Duplicate detection threshold (default: 50)
     * @returns {Promise<Object>} - Duplicate check result
     */
    async checkForDuplicates(newImagePath, existingMedia, threshold = 50) {
        try {
            // Convert relative path to absolute path
            const absolutePath = path.isAbsolute(newImagePath) ? newImagePath : path.resolve(newImagePath);
            console.log(`🔍 Checking for duplicates against ${existingMedia.length} existing images (path: ${absolutePath})`);
            
            // Prepare stored descriptors for comparison
            const storedDescriptors = existingMedia
                .filter(media => media.descriptors && media.descriptors.length > 0)
                .map(media => ({
                    id: media.id,
                    descriptors: media.descriptors
                }));

            if (storedDescriptors.length === 0) {
                console.log('ℹ️ No existing descriptors found, skipping duplicate check');
                return {
                    success: true,
                    isDuplicate: false,
                    duplicateMedia: null
                };
            }

            // Compare the new image against existing ones
            const comparisonResult = await this.compareImage(absolutePath, storedDescriptors, threshold);

            if (comparisonResult.success && comparisonResult.bestMatch) {
                const duplicateMedia = existingMedia.find(media => media.id === comparisonResult.bestMatch.id);
                return {
                    success: true,
                    isDuplicate: true,
                    duplicateMedia: duplicateMedia,
                    matchScore: comparisonResult.bestMatch.similarity,
                    matchCount: comparisonResult.bestMatch.match_count
                };
            } else {
                return {
                    success: true,
                    isDuplicate: false,
                    duplicateMedia: null
                };
            }
        } catch (error) {
            console.error('❌ Duplicate check error:', error.message);
            return {
                success: false,
                error: error.message,
                isDuplicate: false
            };
        }
    }

    /**
     * Find matching media for a scanned image
     * @param {string} scannedImagePath - Path to the scanned image
     * @param {Array} mediaList - Array of media with descriptors
     * @param {number} threshold - Match threshold (default: 50)
     * @returns {Promise<Object>} - Match result
     */
    async findMatchingMedia(scannedImagePath, mediaList, threshold = 50) {
        try {
            // Convert relative path to absolute path
            const absolutePath = path.isAbsolute(scannedImagePath) ? scannedImagePath : path.resolve(scannedImagePath);
            console.log(`🔍 Finding matching media for scanned image against ${mediaList.length} media items (path: ${absolutePath})`);
            
            // Prepare stored descriptors for comparison
            const storedDescriptors = mediaList
                .filter(media => media.descriptors && media.descriptors.length > 0)
                .map(media => ({
                    id: media.id,
                    descriptors: media.descriptors
                }));

            if (storedDescriptors.length === 0) {
                console.log('ℹ️ No media with descriptors found');
                return {
                    success: true,
                    matchedMedia: null,
                    message: 'No media with descriptors available for matching'
                };
            }

            // Compare the scanned image against all media
            const comparisonResult = await this.compareImage(absolutePath, storedDescriptors, threshold);

            if (comparisonResult.success && comparisonResult.bestMatch) {
                const matchedMedia = mediaList.find(media => media.id === comparisonResult.bestMatch.id);
                return {
                    success: true,
                    matchedMedia: matchedMedia,
                    matchScore: comparisonResult.bestMatch.similarity,
                    matchCount: comparisonResult.bestMatch.match_count
                };
            } else {
                return {
                    success: true,
                    matchedMedia: null,
                    message: 'No matching media found'
                };
            }
        } catch (error) {
            console.error('❌ Media matching error:', error.message);
            return {
                success: false,
                error: error.message,
                matchedMedia: null
            };
        }
    }
}

module.exports = new OpenCVService();
