const S3Service = require('../services/s3Service');

class UploadController {
  /**
   * Upload a single file (image or video) to S3 and return the URL
   * Public API endpoint for mobile/app use
   * 
   * Query/Body Parameters:
   * - folder (optional): Custom folder name (e.g., 'ocr', 'profiles', 'documents')
   *   If not provided, files are auto-categorized by type (images, videos, audio)
   * 
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  static async uploadFile(req, res) {
    try {
      // Validate file was uploaded
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No file provided. Please upload an image or video file.',
          error: 'MISSING_FILE'
        });
      }

      // Get custom folder from query params or body, or use auto-categorization
      let customFolder = req.query.folder || req.body.folder;
      let folder = 'uploads';

      if (customFolder) {
        // Validate folder name - only alphanumeric, hyphens, underscores
        // Prevent path traversal with .. or /
        if (!/^[a-zA-Z0-9_-]+$/.test(customFolder)) {
          return res.status(400).json({
            success: false,
            message: 'Invalid folder name. Only alphanumeric characters, hyphens, and underscores are allowed.',
            error: 'INVALID_FOLDER_NAME'
          });
        }
        folder = customFolder;
      } else {
        // Auto-categorize by file type if no custom folder provided
        const mimeType = req.file.mimetype;

        if (mimeType.startsWith('image/')) {
          folder = 'uploads/images';
        } else if (mimeType.startsWith('video/')) {
          folder = 'uploads/videos';
        } else if (mimeType.startsWith('audio/')) {
          folder = 'uploads/audio';
        }
      }

      // Upload to S3
      const uploadResult = await S3Service.uploadFile(req.file, folder);

      if (!uploadResult.success) {
        console.error('S3 upload failed:', uploadResult.error);
        return res.status(500).json({
          success: false,
          message: 'Failed to upload file to cloud storage. Please try again.',
          error: uploadResult.error || 'UPLOAD_FAILED'
        });
      }

      // Return success response with S3 URL
      return res.status(200).json({
        success: true,
        message: 'File uploaded successfully',
        url: uploadResult.url,
        key: uploadResult.key,
        fileName: uploadResult.fileName,
        fileType: req.file.mimetype,
        fileSize: req.file.size,
        folder: folder
      });

    } catch (error) {
      console.error('Upload error:', error);
      return res.status(500).json({
        success: false,
        message: 'An error occurred during file upload. Please try again.',
        error: error.message
      });
    }
  }
}

module.exports = UploadController;
