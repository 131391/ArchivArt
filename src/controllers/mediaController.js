const Media = require('../models/Media');
const smartImageService = require('../services/smartImageService');
const S3Service = require('../services/s3Service');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { v4: uuidv4 } = require('uuid');

// Use the new S3-based multer configuration
const { mediaUpload } = require('../config/multer');
const upload = mediaUpload;

class MediaController {
    // Public API: match scanning image using OpenCV feature matching
    static async matchScanningImage(req, res) {
        try {
            // Accept uploaded image file
            const threshold = parseInt(req.body.threshold || '20', 10); // Default threshold for OpenCV matching (20% similarity)
            
            if (!req.file) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'Image file is required. Please upload an image file.' 
                });
            }

            // Check if image processing service is available
            const isServiceHealthy = await smartImageService.isHealthy();
            if (!isServiceHealthy) {
                return res.status(503).json({
                    success: false,
                    message: 'Image processing service is temporarily unavailable. Please try again later.'
                });
            }

            // For S3 uploads, we need to save the file temporarily for the Python service
            // Since multer.memoryStorage stores the file in memory as buffer
            const tempDir = path.join(__dirname, '../temp');
            await fs.mkdir(tempDir, { recursive: true });
            const tempPath = path.join(tempDir, `${uuidv4()}${path.extname(req.file.originalname)}`);
            
            // Write the buffer to a temporary file
            await fs.writeFile(tempPath, req.file.buffer);
            console.log(`📱 Mobile app uploaded image: ${req.file.originalname} at ${tempPath}`);
            
            try {

                // Get all media with descriptors for matching
                const existingMedia = await Media.findAllWithDescriptors();
                
                if (existingMedia.length === 0) {
                    // Clean up uploaded file
                    await fs.unlink(tempPath).catch(() => {});
                    return res.json({
                        success: true,
                        message: 'No media available for matching',
                        matches: [],
                        service: smartImageService.getServiceInfo().current
                    });
                }

                // Find matching media using OpenCV
                const matchResult = await smartImageService.findMatchingMedia(
                    tempPath,
                    existingMedia,
                    threshold
                );

                // Clean up uploaded file
                await fs.unlink(tempPath).catch(() => {});

                if (matchResult.success && matchResult.matchedMedia) {
                    // Found a match
                    const matchedMedia = matchResult.matchedMedia;
                    const result = {
                        id: matchedMedia.id,
                        title: matchedMedia.title,
                        description: matchedMedia.description,
                        media_type: matchedMedia.media_type,
                        scanning_image: matchedMedia.scanning_image,
                        file_path: matchedMedia.file_path,
                        is_active: matchedMedia.is_active,
                        created_at: matchedMedia.created_at,
                        // Add full URLs for mobile apps - handle both S3 URLs and local paths
                        scanning_image_url: /^https?:\/\//i.test(matchedMedia.scanning_image) ? 
                            matchedMedia.scanning_image : 
                            `${process.env.IMAGE_BASE_URL || `http://localhost:${process.env.PORT || 3000}`}/uploads/media/${matchedMedia.scanning_image}`,
                        file_url: /^https?:\/\//i.test(matchedMedia.file_path) ? 
                            matchedMedia.file_path : 
                            `${process.env.IMAGE_BASE_URL || `http://localhost:${process.env.PORT || 3000}`}/uploads/media/${matchedMedia.file_path}`,
                        similarity: {
                            score: matchResult.matchScore,
                            matchCount: matchResult.matchCount,
                            threshold: threshold,
                            service: matchResult.service,
                            description: matchResult.matchScore >= 0.8 ? 'Very High' : 
                                       matchResult.matchScore >= 0.6 ? 'High' : 
                                       matchResult.matchScore >= 0.4 ? 'Medium' : 'Low'
                        }
                    };

                    return res.json({
                        success: true,
                        message: 'Match found',
                        match: result,
                        service: matchResult.service
                    });
                } else {
                    // No match found
                    return res.json({
                        success: true,
                        message: 'No matching media found',
                        matches: [],
                        service: matchResult.service || smartImageService.getServiceInfo().current
                    });
                }

            } catch (processingError) {
                // Clean up temp file on error
                await fs.unlink(tempPath).catch(() => {});
                throw processingError;
            }

        } catch (error) {
            console.error('Error matching scanning image:', error);
            // Clean up uploaded file on error
            if (req.file && req.file.path) {
                await fs.unlink(req.file.path).catch(() => {});
            }
            return res.status(500).json({ 
                success: false, 
                message: 'Server error matching image',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }
    // Get media list page
    static async getMediaList(req, res) {
        try {
            const {
                page = 1,
                limit = 10,
                search = '',
                media_type = '',
                is_active = '',
                sort = 'created_at',
                order = 'desc'
            } = req.query;

            const options = {
                page: parseInt(page),
                limit: parseInt(limit),
                search,
                media_type,
                is_active,
                sort,
                order
            };

            const result = await Media.findAll(options);
            const stats = await Media.getStats();

            res.render('admin/media', {
                title: 'Media Management',
                media: result.media,
                pagination: {
                    currentPage: result.page,
                    totalPages: result.totalPages,
                    totalItems: result.total,
                    hasNext: result.page < result.totalPages,
                    hasPrev: result.page > 1,
                    nextPage: result.page + 1,
                    prevPage: result.page - 1
                },
                search,
                filters: {
                    media_type,
                    is_active
                },
                stats,
                user: req.session.user
            });
    } catch (error) {
            console.error('Error getting media list:', error);
            req.flash('error', 'Error loading media list');
            res.redirect('/admin/dashboard');
        }
    }

    // Get media data for AJAX
    static async getMediaData(req, res) {
        try {
            console.log('getMediaData called with query:', req.query);
            
            const {
                page = 1,
                limit = 10,
                search = '',
                media_type = '',
                is_active = '',
                sort = 'created_at',
                order = 'desc'
            } = req.query;

            const options = {
                page: parseInt(page),
                limit: parseInt(limit),
                search,
                media_type,
                is_active,
                sort,
                order
            };
            const result = await Media.findAll(options);

            // Generate table rows HTML
            const tableRows = result.media.map(media => `
                <tr class="hover:bg-gray-50">
                    <td class="px-6 py-4 table-cell-wrap max-w-sm">
                        <div class="flex items-center">
                            <div class="flex-shrink-0 h-12 w-12">
                                ${media.media_type === 'image' ? 
                                    `<img class=\"h-12 w-12 rounded-lg object-cover\" src=\"${typeof mediaUrl === 'function' ? '${mediaUrl("' + media.file_path + '")}' : '/uploads/media/' + media.file_path}\" alt=\"${media.title}\">` :
                                    `<div class="h-12 w-12 rounded-lg bg-gray-200 flex items-center justify-center">
                                        <i class="fas fa-${media.media_type === 'video' ? 'video' : 'music'} text-gray-500"></i>
                                    </div>`
                                }
                            </div>
                            <div class="ml-4">
                                <div class="text-sm font-medium text-gray-900">${media.title}</div>
                                <div class="text-sm text-gray-500">${media.media_type}</div>
                            </div>
                        </div>
                    </td>
                    <td class="px-6 py-4 table-cell-wrap max-w-md">
                        <div class="text-sm text-gray-900">${media.description || 'No description'}</div>
                    </td>
                    <td class="px-6 py-4 table-cell-nowrap">
                        <div class="text-sm text-gray-900">${media.scanning_image}</div>
                    </td>
                    <td class="px-6 py-4 table-cell-nowrap">
                        <span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full ${media.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
                            ${media.is_active ? 'Active' : 'Inactive'}
                        </span>
                    </td>
                    <td class="px-6 py-4 table-cell-nowrap text-sm text-gray-500">
                        ${new Date(media.created_at).toLocaleDateString()}
                    </td>
                    <td class="px-6 py-4 table-cell-nowrap text-sm text-gray-500">
                        ${media.uploaded_by_name || 'Unknown'}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div class="flex space-x-2">
                            <button onclick="window.location.href='/admin/media/view/${media.id}'" class="text-indigo-600 hover:text-indigo-900" title="View">
                                <i class="fas fa-eye"></i>
                            </button>
                            <button onclick="editMedia(${media.id})" class="text-blue-600 hover:text-blue-900" title="Edit">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button onclick="toggleMediaStatus(${media.id})" class="text-${media.is_active ? 'yellow' : 'green'}-600 hover:text-${media.is_active ? 'yellow' : 'green'}-900" title="${media.is_active ? 'Deactivate' : 'Activate'}">
                                <i class="fas fa-${media.is_active ? 'pause' : 'play'}"></i>
                            </button>
                            <button onclick="deleteMedia(${media.id})" class="text-red-600 hover:text-red-900" title="Delete">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `).join('');

            res.json({
                success: true,
                media: result.media,
                tableRows,
                pagination: {
                    currentPage: result.page,
                    totalPages: result.totalPages,
                    totalItems: result.total,
                    hasNext: result.page < result.totalPages,
                    hasPrev: result.page > 1,
                    startItem: ((result.page - 1) * result.limit) + 1,
                    endItem: Math.min(result.page * result.limit, result.total)
                }
            });
        } catch (error) {
            console.error('Error getting media data:', error);
            res.status(500).json({
                success: false,
                message: 'Error loading media data'
            });
        }
    }

    // Show upload form
    static async showUploadForm(req, res) {
        try {
            res.render('admin/media-upload', {
                title: 'Upload Media',
                user: req.session.user
      });
    } catch (error) {
            console.error('Error showing upload form:', error);
            req.flash('error', 'Error loading upload form');
            res.redirect('/admin/media');
        }
    }

    // Handle file upload
    static async uploadMedia(req, res) {
        try {
            // Files are already processed by combinedUpload middleware in route
            console.log('Upload request received');
            console.log('Request body:', req.body);
            console.log('Request files:', req.files);
            
            const { title, description, media_type } = req.body;
            const mediaFile = req.files.media_file ? req.files.media_file[0] : null;
            const scanningImageFile = req.files.scanning_image ? req.files.scanning_image[0] : null;

            // Validate required fields
            if (!title || !mediaFile || !scanningImageFile) {
                return res.status(400).json({
                    success: false,
                    message: 'Title, media file, and scanning image are required'
                });
            }

                    // Check if image processing service is available
                    const isServiceHealthy = await smartImageService.isHealthy();
                    if (!isServiceHealthy) {
                        console.error('Image processing service is not available');
                        
                        return res.status(500).json({
                            success: false,
                            message: 'Image processing service is temporarily unavailable. Please try again later.'
                        });
                    }

                    // Extract features from the scanning image
                    let descriptors = null;
                    let tempScanningPath = null;
                    try {
                        // Create temporary file for scanning image processing
                        const tempDir = path.join(__dirname, '../temp');
                        await fs.mkdir(tempDir, { recursive: true });
                        tempScanningPath = path.join(tempDir, `${uuidv4()}${path.extname(scanningImageFile.originalname)}`);
                        await fs.writeFile(tempScanningPath, scanningImageFile.buffer);
                        
                        const featureResult = await smartImageService.extractFeatures(tempScanningPath);
                        if (featureResult.success) {
                            descriptors = featureResult.descriptors;
                            console.log(`Extracted ${featureResult.featureCount} features from scanning image using ${featureResult.service} service`);
                        } else {
                            throw new Error(featureResult.error);
                        }
                    } catch (featureError) {
                        console.error('Error extracting features:', featureError);
                        
                        return res.status(400).json({
                            success: false,
                            message: 'Error processing scanning image. Please try again.'
                        });
                    } finally {
                        // Clean up temporary file
                        if (tempScanningPath) {
                            await fs.unlink(tempScanningPath).catch(() => {});
                        }
                    }

                    // Check for duplicate images using feature matching
                    try {
                        const existingMedia = await Media.findAllWithDescriptors();
                        const duplicateCheck = await smartImageService.checkForDuplicates(
                            tempScanningPath, 
                            existingMedia
                        );

                        if (duplicateCheck.success && duplicateCheck.isDuplicate) {
                            console.log(`Duplicate image detected: ${duplicateCheck.duplicateMedia.title} using ${duplicateCheck.service} service`);
                            
                            return res.status(400).json({
                                success: false,
                                message: `This scanning image is too similar to existing media: "${duplicateCheck.duplicateMedia.title}". Please use a different image.`,
                                duplicateMedia: {
                                    id: duplicateCheck.duplicateMedia.id,
                                    title: duplicateCheck.duplicateMedia.title,
                                    matchScore: duplicateCheck.matchScore
                                },
                                service: duplicateCheck.service
                            });
                        }
                    } catch (duplicateError) {
                        console.error('Error checking for duplicates:', duplicateError);
                        // Continue with upload even if duplicate check fails
                        console.log('Continuing with upload despite duplicate check error');
                    }

                    // Upload files to S3
                    const mediaUploadResult = await S3Service.uploadFile(mediaFile, 'media');
                    const scanningImageUploadResult = await S3Service.uploadFile(scanningImageFile, 'media');

                    if (!mediaUploadResult.success || !scanningImageUploadResult.success) {
                        return res.status(500).json({
                            success: false,
                            message: 'Failed to upload files to cloud storage. Please try again.'
                        });
                    }

                    // Create media record
                    const mediaData = {
                        title,
                        description,
                        scanning_image: scanningImageUploadResult.url,
                        descriptors: descriptors,
                        media_type,
                        file_path: mediaUploadResult.url,
                        file_size: mediaFile.size,
                        mime_type: mediaFile.mimetype,
                        uploaded_by: req.session.user.id
                    };

                    const newMedia = await Media.create(mediaData);

            res.json({
                success: true,
                message: 'Media uploaded successfully',
                media: newMedia
            });
        } catch (error) {
            console.error('Upload error:', error);
            
            res.status(500).json({
                success: false,
                message: error.message || 'Error uploading media'
            });
        }
    }

    // Get media view page
    static async getMediaView(req, res) {
        try {
            const { id } = req.params;
            const media = await Media.findById(id);

            if (!media) {
                req.flash('error', 'Media not found');
                return res.redirect('/admin/media');
            }

            res.render('admin/media-view', {
                title: `Media: ${media.title}`,
                media: media
            });
        } catch (error) {
            console.error('Error loading media view:', error);
            req.flash('error', 'Error loading media details');
            res.redirect('/admin/media');
        }
    }

    // Show edit media form
    static async showEditForm(req, res) {
        try {
            const { id } = req.params;
            const media = await Media.findById(id);

            if (!media) {
                req.flash('error', 'Media not found');
                return res.redirect('/admin/media');
            }

            res.render('admin/media-edit', {
                title: `Edit Media: ${media.title}`,
                media: media
            });
        } catch (error) {
            console.error('Error loading media edit form:', error);
            req.flash('error', 'Error loading media edit form');
            res.redirect('/admin/media');
        }
    }

    // Get single media
    static async getMedia(req, res) {
        try {
            const { id } = req.params;
            const media = await Media.findById(id);

            if (!media) {
                return res.status(404).json({
                    success: false,
                    message: 'Media not found'
                });
            }

            res.json({
                success: true,
                media
      });
    } catch (error) {
            console.error('Error getting media:', error);
            res.status(500).json({
                success: false,
                message: 'Error loading media'
      });
    }
  }

    // Get all active media (public API for mobile apps)
    static async getAllActiveMedia(req, res) {
        try {
            const { page = 1, limit = 20, media_type = '' } = req.query;
            
            const options = {
                page: parseInt(page),
                limit: parseInt(limit),
                search: '',
                media_type,
                is_active: '1', // Only active media (1 = true, 0 = false)
                sort: 'created_at',
                order: 'desc'
            };

            const result = await Media.findAll(options);

            // Format response for mobile apps
            const mediaList = result.media.map(media => ({
                id: media.id,
                title: media.title,
                description: media.description,
                media_type: media.media_type,
                scanning_image: media.scanning_image,
                file_path: media.file_path,
                file_size: media.file_size,
                mime_type: media.mime_type,
                created_at: media.created_at,
                // Add full URLs for mobile apps - handle both S3 URLs and local paths
                scanning_image_url: /^https?:\/\//i.test(media.scanning_image) ? 
                    media.scanning_image : 
                    `${process.env.IMAGE_BASE_URL || `http://localhost:${process.env.PORT || 3000}`}/uploads/media/${media.scanning_image}`,
                file_url: /^https?:\/\//i.test(media.file_path) ? 
                    media.file_path : 
                    `${process.env.IMAGE_BASE_URL || `http://localhost:${process.env.PORT || 3000}`}/uploads/media/${media.file_path}`
            }));

            res.json({
                success: true,
                media: mediaList,
                pagination: {
                    currentPage: result.page,
                    totalPages: result.totalPages,
                    totalItems: result.total,
                    hasNext: result.page < result.totalPages,
                    hasPrev: result.page > 1
                }
            });
        } catch (error) {
            console.error('Error getting active media:', error);
            res.status(500).json({
                success: false,
                message: 'Error loading media'
      });
    }
  }

    // Update media
    static async updateMedia(req, res) {
    try {
      const { id } = req.params;
            const { title, description, media_type, is_active } = req.body;
            
            console.log('Update media request:', { id, title, description, media_type, is_active });
            console.log('File uploaded:', req.file ? req.file.filename : 'No file');

            const media = await Media.findById(id);
            if (!media) {
                console.log('Media not found for ID:', id);
                return res.status(404).json({
                    success: false,
                    message: 'Media not found'
                });
            }

            // Prepare update data
            const updateData = {
                title,
                description,
                media_type,
                is_active: is_active === 'true'
            };

            // Handle scanning image upload if provided
            if (req.file) {
                const fs = require('fs').promises;
                const path = require('path');

                try {
                    const imagePath = path.join(__dirname, '..', 'public', 'uploads', 'scanning-images', req.file.filename);
                    
                    // Check if image processing service is available
                    const isServiceHealthy = await smartImageService.isHealthy();
                    if (!isServiceHealthy) {
                        console.error('Image processing service is not available');
                        await fs.unlink(imagePath);
                        return res.status(500).json({
                            success: false,
                            message: 'Image processing service is temporarily unavailable. Please try again later.'
                        });
                    }

                    // Extract features from the new scanning image
                    let descriptors = null;
                    try {
                        const featureResult = await smartImageService.extractFeatures(imagePath);
                        if (featureResult.success) {
                            descriptors = featureResult.descriptors;
                            console.log(`Extracted ${featureResult.featureCount} features from new scanning image using ${featureResult.service} service`);
                        } else {
                            throw new Error(featureResult.error);
                        }
                    } catch (featureError) {
                        console.error('Error extracting features:', featureError);
                        await fs.unlink(imagePath);
                        return res.status(400).json({
                            success: false,
                            message: 'Error processing scanning image. Please try again.'
                        });
                    }

                    // Check for duplicate images using feature matching (excluding current media)
                    try {
                        const existingMedia = await Media.findAllWithDescriptors();
                        const otherMedia = existingMedia.filter(m => m.id !== parseInt(id));
                        
                        if (otherMedia.length > 0) {
                            const duplicateCheck = await smartImageService.checkForDuplicates(
                                imagePath, 
                                otherMedia
                            );

                            if (duplicateCheck.success && duplicateCheck.isDuplicate) {
                                console.log(`Duplicate image detected: ${duplicateCheck.duplicateMedia.title} using ${duplicateCheck.service} service`);
                                await fs.unlink(imagePath);
                                
                                return res.status(400).json({
                                    success: false,
                                    message: `This scanning image is too similar to existing media: "${duplicateCheck.duplicateMedia.title}". Please use a different image.`,
                                    duplicateMedia: {
                                        id: duplicateCheck.duplicateMedia.id,
                                        title: duplicateCheck.duplicateMedia.title,
                                        matchScore: duplicateCheck.matchScore
                                    },
                                    service: duplicateCheck.service
                                });
                            }
                        }
                    } catch (duplicateError) {
                        console.error('Error checking for duplicates:', duplicateError);
                        // Continue with update even if duplicate check fails
                        console.log('Continuing with update despite duplicate check error');
                    }

                    // Delete old scanning image file if it exists
                    if (media.scanning_image) {
                        const oldImagePath = path.join(__dirname, '..', 'public', 'uploads', 'scanning-images', media.scanning_image);
                        try {
                            await fs.unlink(oldImagePath);
                        } catch (error) {
                            console.log('Old scanning image file not found or already deleted:', oldImagePath);
                        }
                    }

                    // Update with new scanning image
                    updateData.scanning_image = req.file.filename;
                    updateData.descriptors = descriptors;
                } catch (error) {
                    console.error('Error processing scanning image:', error);
                    // Delete the uploaded file
                    const imagePath = path.join(__dirname, '..', 'public', 'uploads', 'scanning-images', req.file.filename);
                    await fs.unlink(imagePath);
                    return res.status(500).json({
                        success: false,
                        message: 'Error processing scanning image'
                    });
                }
            }

            const updatedMedia = await media.update(updateData);
            
            console.log('Media updated successfully:', updatedMedia);

            res.json({
                success: true,
                message: 'Media updated successfully',
                media: updatedMedia
      });
    } catch (error) {
            console.error('Error updating media:', error);
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }

    // Toggle media status
    static async toggleMediaStatus(req, res) {
        try {
            const { id } = req.params;
            const media = await Media.findById(id);

            if (!media) {
                return res.status(404).json({
                    success: false,
                    message: 'Media not found'
                });
            }

            const updatedMedia = await media.toggleStatus();

            res.json({
                success: true,
                message: `Media ${updatedMedia.is_active ? 'activated' : 'deactivated'} successfully`,
                media: updatedMedia
      });
    } catch (error) {
            console.error('Error toggling media status:', error);
            res.status(500).json({
                success: false,
                message: 'Error updating media status'
            });
    }
  }

  // Delete media
    static async deleteMedia(req, res) {
    try {
      const { id } = req.params;
            console.log(`🗑️ Attempting to delete media with ID: ${id}`);
            
            const media = await Media.findById(id);

            if (!media) {
                console.log(`❌ Media not found with ID: ${id}`);
                return res.status(404).json({
                    success: false,
                    message: 'Media not found'
                });
            }
            
            console.log(`✅ Found media: ${media.title} (${media.file_path})`);

            // Delete files from S3
            try {
                // Delete the main media file from S3
                if (media.file_path) {
                    const deleteResult = await S3Service.deleteFile(media.file_path);
                    if (deleteResult.success) {
                        console.log(`Deleted media file from S3: ${media.file_path}`);
                    } else {
                        console.log(`Failed to delete media file from S3: ${deleteResult.error}`);
                    }
                }

                // Delete the scanning image file from S3
                if (media.scanning_image) {
                    const deleteResult = await S3Service.deleteFile(media.scanning_image);
                    if (deleteResult.success) {
                        console.log(`Deleted scanning image from S3: ${media.scanning_image}`);
                    } else {
                        console.log(`Failed to delete scanning image from S3: ${deleteResult.error}`);
                    }
                }
            } catch (fileError) {
                console.warn('Error deleting files from S3 (continuing with database deletion):', fileError.message);
                // Continue with database deletion even if S3 deletion fails
            }

      // Delete from database
            console.log(`🗃️ Deleting media from database...`);
            await media.delete();
            console.log(`✅ Media deleted from database successfully`);

            res.json({
                success: true,
                message: 'Media deleted successfully'
            });
    } catch (error) {
            console.error('Error deleting media:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Error deleting media'
            });
        }
    }

    // Generate pagination HTML
    static generatePaginationHtml(currentPage, totalPages, options) {
        if (totalPages <= 1) return '';

        let paginationHtml = '<nav class="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6">';
        paginationHtml += '<div class="flex flex-1 justify-between sm:hidden">';
        
        if (currentPage > 1) {
            paginationHtml += `<button onclick="goToPage(${currentPage - 1})" class="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">Previous</button>`;
        }
        
        if (currentPage < totalPages) {
            paginationHtml += `<button onclick="goToPage(${currentPage + 1})" class="relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">Next</button>`;
        }
        
        paginationHtml += '</div>';
        paginationHtml += '<div class="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">';
        paginationHtml += '<div>';
        paginationHtml += `<p class="text-sm text-gray-700">Showing page <span class="font-medium">${currentPage}</span> of <span class="font-medium">${totalPages}</span></p>`;
        paginationHtml += '</div>';
        paginationHtml += '<div>';
        paginationHtml += '<nav class="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">';
        
        // Previous button
        if (currentPage > 1) {
            paginationHtml += `<button onclick="goToPage(${currentPage - 1})" class="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0">`;
            paginationHtml += '<span class="sr-only">Previous</span>';
            paginationHtml += '<i class="fas fa-chevron-left h-5 w-5"></i>';
            paginationHtml += '</button>';
        }
        
        // Page numbers
        const startPage = Math.max(1, currentPage - 2);
        const endPage = Math.min(totalPages, currentPage + 2);
        
        for (let i = startPage; i <= endPage; i++) {
            if (i === currentPage) {
                paginationHtml += `<button class="relative z-10 inline-flex items-center bg-indigo-600 px-4 py-2 text-sm font-semibold text-white focus:z-20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600">${i}</button>`;
            } else {
                paginationHtml += `<button onclick="goToPage(${i})" class="relative inline-flex items-center px-4 py-2 text-sm font-semibold text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0">${i}</button>`;
            }
        }
        
        // Next button
        if (currentPage < totalPages) {
            paginationHtml += `<button onclick="goToPage(${currentPage + 1})" class="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0">`;
            paginationHtml += '<span class="sr-only">Next</span>';
            paginationHtml += '<i class="fas fa-chevron-right h-5 w-5"></i>';
            paginationHtml += '</button>';
        }
        
        paginationHtml += '</nav>';
        paginationHtml += '</div>';
        paginationHtml += '</div>';
        paginationHtml += '</nav>';

        return paginationHtml;
    }
}

module.exports = MediaController;