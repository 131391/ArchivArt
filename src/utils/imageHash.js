const crypto = require('crypto');
const fs = require('fs').promises;

/**
 * Image Hash Utility
 * Generates SHA-256 hash of image content for duplicate detection
 */
class ImageHash {
    /**
     * Generate SHA-256 hash of image file content
     * @param {string} filePath - Path to the image file
     * @returns {Promise<string>} - SHA-256 hash as hexadecimal string
     */
    static async generateHash(filePath) {
        try {
            // Read the file content
            const fileBuffer = await fs.readFile(filePath);
            
            // Generate SHA-256 hash
            const hash = crypto.createHash('sha256');
            hash.update(fileBuffer);
            
            return hash.digest('hex');
        } catch (error) {
            console.error('Error generating image hash:', error);
            throw new Error('Failed to generate image hash');
        }
    }

    /**
     * Generate hash from file buffer (for uploaded files)
     * @param {Buffer} fileBuffer - File content as buffer
     * @returns {string} - SHA-256 hash as hexadecimal string
     */
    static generateHashFromBuffer(fileBuffer) {
        try {
            const hash = crypto.createHash('sha256');
            hash.update(fileBuffer);
            return hash.digest('hex');
        } catch (error) {
            console.error('Error generating hash from buffer:', error);
            throw new Error('Failed to generate hash from buffer');
        }
    }

    /**
     * Validate if hash is a valid SHA-256 hash
     * @param {string} hash - Hash string to validate
     * @returns {boolean} - True if valid SHA-256 hash
     */
    static isValidHash(hash) {
        return /^[a-f0-9]{64}$/i.test(hash);
    }

    /**
     * Compare two hashes for equality
     * @param {string} hash1 - First hash
     * @param {string} hash2 - Second hash
     * @returns {boolean} - True if hashes are equal
     */
    static compareHashes(hash1, hash2) {
        if (!hash1 || !hash2) return false;
        return hash1.toLowerCase() === hash2.toLowerCase();
    }
}

module.exports = ImageHash;
