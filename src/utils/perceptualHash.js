const { imageHash } = require('image-hash');
const path = require('path');

class PerceptualHash {
    /**
     * Generate perceptual hash (pHash) of an image
     * @param {string} imagePath - Path to the image file
     * @param {number} size - Hash size (default: 16, recommended: 8 or 16)
     * @param {boolean} format - Format (default: true for hex)
     * @returns {Promise<string>} - Perceptual hash string
     */
    static async generateHash(imagePath, size = 16, format = true) {
        return new Promise((resolve, reject) => {
            // Ensure absolute path
            const absolutePath = path.resolve(imagePath);
            
            imageHash(absolutePath, size, format, (error, hash) => {
                if (error) {
                    console.error('Error generating perceptual hash:', error);
                    return reject(error);
                }
                resolve(hash);
            });
        });
    }

    /**
     * Calculate Hamming Distance between two perceptual hashes
     * @param {string} hash1 - First perceptual hash
     * @param {string} hash2 - Second perceptual hash
     * @returns {number} - Hamming distance (0 = identical, higher = more different)
     */
    static hammingDistance(hash1, hash2) {
        if (!hash1 || !hash2) {
            throw new Error('Both hashes must be provided');
        }

        if (hash1.length !== hash2.length) {
            throw new Error('Hashes must be the same length');
        }

        let distance = 0;
        for (let i = 0; i < hash1.length; i++) {
            if (hash1[i] !== hash2[i]) {
                distance++;
            }
        }
        return distance;
    }

    /**
     * Check if two images are similar based on perceptual hash
     * @param {string} hash1 - First perceptual hash
     * @param {string} hash2 - Second perceptual hash
     * @param {number} threshold - Similarity threshold (default: 5)
     * @returns {boolean} - True if images are similar
     */
    static areSimilar(hash1, hash2, threshold = 5) {
        try {
            const distance = this.hammingDistance(hash1, hash2);
            return distance <= threshold;
        } catch (error) {
            console.error('Error comparing hashes:', error);
            return false;
        }
    }

    /**
     * Check if two images are identical based on perceptual hash
     * @param {string} hash1 - First perceptual hash
     * @param {string} hash2 - Second perceptual hash
     * @returns {boolean} - True if images are identical
     */
    static areIdentical(hash1, hash2) {
        return this.areSimilar(hash1, hash2, 0);
    }

    /**
     * Generate hash for scanning image with error handling
     * @param {string} scanningImagePath - Path to scanning image
     * @returns {Promise<string|null>} - Perceptual hash or null if error
     */
    static async generateScanningImageHash(scanningImagePath) {
        try {
            if (!scanningImagePath) {
                throw new Error('Scanning image path is required');
            }

            // Ensure the path is relative to uploads directory
            const fullPath = path.join(process.cwd(), 'src', 'public', 'uploads', 'media', scanningImagePath);
            
            const hash = await this.generateHash(fullPath, 16, true);
            
            return hash;
        } catch (error) {
            console.error('Error generating scanning image hash:', error);
            return null;
        }
    }

    /**
     * Validate perceptual hash format
     * @param {string} hash - Hash to validate
     * @returns {boolean} - True if valid
     */
    static isValidHash(hash) {
        if (!hash || typeof hash !== 'string') {
            return false;
        }
        
        // Check if it's a valid hex string
        return /^[a-f0-9]+$/i.test(hash);
    }

    /**
     * Get similarity level description
     * @param {string} hash1 - First hash
     * @param {string} hash2 - Second hash
     * @returns {string} - Description of similarity level
     */
    static getSimilarityDescription(hash1, hash2) {
        try {
            const distance = this.hammingDistance(hash1, hash2);
            
            if (distance === 0) {
                return 'Identical';
            } else if (distance <= 2) {
                return 'Very Similar';
            } else if (distance <= 5) {
                return 'Similar';
            } else if (distance <= 10) {
                return 'Somewhat Similar';
            } else {
                return 'Different';
            }
        } catch (error) {
            return 'Unable to Compare';
        }
    }
}

module.exports = PerceptualHash;
