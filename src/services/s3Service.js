const AWS = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
require('dotenv').config();

// Configure AWS
AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION || 'us-east-1'
});

const s3 = new AWS.S3();

class S3Service {
  /**
   * Upload a file to S3
   * @param {Object} file - The file object (from multer)
   * @param {string} folder - The folder path in S3 (e.g., 'media', 'profile-pictures', 'logos')
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} - Returns { success: boolean, url: string, key: string, error?: string }
   */
  static async uploadFile(file, folder = 'uploads', options = {}) {
    try {
      // Generate unique filename
      const fileExtension = path.extname(file.originalname);
      const uniqueFileName = `${uuidv4()}${fileExtension}`;
      const key = `${process.env.AWS_S3_FILE_PATH || ''}${folder}/${uniqueFileName}`;

      // Upload parameters
      const uploadParams = {
        Bucket: process.env.AWS_S3_BUCKET,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
        ...options
      };

      // Upload to S3
      const result = await s3.upload(uploadParams).promise();
      
      return {
        success: true,
        url: result.Location,
        key: key,
        fileName: uniqueFileName
      };
    } catch (error) {
      console.error('S3 upload error:', error);
      return {
        success: false,
        error: error.message,
        url: null,
        key: null
      };
    }
  }

  /**
   * Update a file in S3 (delete old and upload new)
   * @param {Object} newFile - The new file object (from multer)
   * @param {string} oldKey - The S3 key of the file to replace
   * @param {string} folder - The folder path in S3
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} - Returns { success: boolean, url: string, key: string, error?: string }
   */
  static async updateFile(newFile, oldKey, folder = 'uploads', options = {}) {
    try {
      // First, delete the old file if it exists
      if (oldKey) {
        await this.deleteFile(oldKey);
      }

      // Upload the new file
      const uploadResult = await this.uploadFile(newFile, folder, options);
      
      return uploadResult;
    } catch (error) {
      console.error('S3 update error:', error);
      return {
        success: false,
        error: error.message,
        url: null,
        key: null
      };
    }
  }

  /**
   * Delete a file from S3
   * @param {string} key - The S3 key of the file to delete
   * @returns {Promise<Object>} - Returns { success: boolean, error?: string }
   */
  static async deleteFile(key) {
    try {
      if (!key) {
        return { success: true, message: 'No file to delete' };
      }

      // Extract key from URL if full URL is provided
      const s3Key = this.extractKeyFromUrl(key) || key;

      const deleteParams = {
        Bucket: process.env.AWS_S3_BUCKET,
        Key: s3Key
      };

      await s3.deleteObject(deleteParams).promise();
      
      return {
        success: true,
        message: 'File deleted successfully'
      };
    } catch (error) {
      console.error('S3 delete error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get file information from S3
   * @param {string} key - The S3 key of the file
   * @returns {Promise<Object>} - Returns file information or null if not found
   */
  static async getFileInfo(key) {
    try {
      // Extract key from URL if full URL is provided
      const s3Key = this.extractKeyFromUrl(key) || key;

      const params = {
        Bucket: process.env.AWS_S3_BUCKET,
        Key: s3Key
      };

      const result = await s3.headObject(params).promise();
      
      return {
        success: true,
        size: result.ContentLength,
        contentType: result.ContentType,
        lastModified: result.LastModified,
        etag: result.ETag
      };
    } catch (error) {
      if (error.statusCode === 404) {
        return { success: false, error: 'File not found' };
      }
      console.error('S3 get file info error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Generate a signed URL for private file access
   * @param {string} key - The S3 key of the file
   * @param {number} expiresIn - URL expiration time in seconds (default: 3600)
   * @returns {Promise<string>} - Returns signed URL
   */
  static async getSignedUrl(key, expiresIn = 3600) {
    try {
      const s3Key = this.extractKeyFromUrl(key) || key;
      
      const params = {
        Bucket: process.env.AWS_S3_BUCKET,
        Key: s3Key,
        Expires: expiresIn
      };

      return await s3.getSignedUrlPromise('getObject', params);
    } catch (error) {
      console.error('S3 signed URL error:', error);
      throw error;
    }
  }

  /**
   * Extract S3 key from full URL
   * @param {string} url - Full S3 URL
   * @returns {string|null} - S3 key or null if not found
   */
  static extractKeyFromUrl(url) {
    if (!url) return null;
    
    try {
      const urlObj = new URL(url);
      const bucketUrl = `${urlObj.protocol}//${urlObj.hostname}/`;
      return url.replace(bucketUrl, '');
    } catch (error) {
      // If it's not a full URL, assume it's already a key
      return url;
    }
  }

  /**
   * Get public URL for a file
   * @param {string} key - The S3 key of the file
   * @returns {string} - Public URL
   */
  static getPublicUrl(key) {
    const s3Key = this.extractKeyFromUrl(key) || key;
    return `${process.env.AWS_S3_BUCKET_URL}${s3Key}`;
  }

  /**
   * Upload multiple files to S3
   * @param {Array} files - Array of file objects
   * @param {string} folder - The folder path in S3
   * @param {Object} options - Additional options
   * @returns {Promise<Array>} - Returns array of upload results
   */
  static async uploadMultipleFiles(files, folder = 'uploads', options = {}) {
    try {
      const uploadPromises = files.map(file => this.uploadFile(file, folder, options));
      const results = await Promise.all(uploadPromises);
      
      return {
        success: true,
        results: results,
        totalFiles: files.length,
        successfulUploads: results.filter(r => r.success).length,
        failedUploads: results.filter(r => !r.success).length
      };
    } catch (error) {
      console.error('S3 multiple upload error:', error);
      return {
        success: false,
        error: error.message,
        results: []
      };
    }
  }

  /**
   * Check if S3 service is properly configured
   * @returns {Promise<Object>} - Returns configuration status
   */
  static async checkConfiguration() {
    try {
      const requiredEnvVars = [
        'AWS_ACCESS_KEY_ID',
        'AWS_SECRET_ACCESS_KEY',
        'AWS_REGION',
        'AWS_S3_BUCKET'
      ];

      const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
      
      if (missingVars.length > 0) {
        return {
          success: false,
          error: `Missing required environment variables: ${missingVars.join(', ')}`
        };
      }

      // Test S3 connection by listing buckets
      await s3.listBuckets().promise();
      
      return {
        success: true,
        message: 'S3 configuration is valid',
        bucket: process.env.AWS_S3_BUCKET,
        region: process.env.AWS_REGION
      };
    } catch (error) {
      console.error('S3 configuration check error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = S3Service;
