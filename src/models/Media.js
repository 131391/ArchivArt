const db = require('../config/database');
const PerceptualHash = require('../utils/perceptualHash');

class Media {
    constructor(data) {
        this.id = data.id;
        this.title = data.title;
        this.description = data.description;
        this.scanning_image = data.scanning_image;
        this.image_hash = data.image_hash; // Perceptual hash for similarity detection
        this.media_type = data.media_type; // 'image', 'video', 'audio'
        this.file_path = data.file_path;
        this.file_size = data.file_size;
        this.mime_type = data.mime_type;
        this.uploaded_by = data.uploaded_by;
        this.is_active = data.is_active;
        this.created_at = data.created_at;
        this.updated_at = data.updated_at;
    }

    // Create new media record
    static async create(mediaData) {
        try {
            const {
                title,
                description,
                scanning_image,
                media_type,
                file_path,
                file_size,
                mime_type,
                uploaded_by,
                image_hash
            } = mediaData;

            // Check if scanning image already exists by filename
            const existingMediaByFilename = await Media.findByScanningImage(scanning_image);
            if (existingMediaByFilename) {
                throw new Error('Scanning image filename already exists. Please use a different image.');
            }

            // Check if scanning image already exists by perceptual hash (similarity detection)
            if (image_hash) {
                // First check for exact matches
                const existingMediaByHash = await Media.findByImageHash(image_hash);
                if (existingMediaByHash) {
                    throw new Error('This scanning image content already exists. Please use a different image.');
                }

                // Then check for similar images (compressed, resized, etc.)
                const similarMedia = await Media.findSimilarByImageHash(image_hash, 5);
                if (similarMedia.length > 0) {
                    const similarTitles = similarMedia.map(m => m.title).join(', ');
                    throw new Error(`A similar scanning image already exists (${similarTitles}). Please use a different image.`);
                }
            }

            const query = `
                INSERT INTO media (
                    title, description, scanning_image, image_hash, media_type, 
                    file_path, file_size, mime_type, uploaded_by, is_active
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
            `;

            const [result] = await db.execute(query, [
                title,
                description,
                scanning_image,
                image_hash,
                media_type,
                file_path,
                file_size,
                mime_type,
                uploaded_by
            ]);

            return await Media.findById(result.insertId);
        } catch (error) {
            throw error;
        }
    }

    // Find media by ID
    static async findById(id) {
        try {
            const query = `
                SELECT m.*, u.name as uploaded_by_name, u.email as uploaded_by_email
                FROM media m
                LEFT JOIN users u ON m.uploaded_by = u.id
                WHERE m.id = ?
            `;
            const [rows] = await db.execute(query, [id]);
            return rows.length > 0 ? new Media(rows[0]) : null;
        } catch (error) {
            throw error;
        }
    }

    // Find media by scanning image
    static async findByScanningImage(scanning_image) {
        try {
            const query = 'SELECT * FROM media WHERE scanning_image = ?';
            const [rows] = await db.execute(query, [scanning_image]);
            return rows.length > 0 ? new Media(rows[0]) : null;
        } catch (error) {
            throw error;
        }
    }

    // Find media by exact image hash match
    static async findByImageHash(image_hash) {
        try {
            const query = 'SELECT * FROM media WHERE image_hash = ?';
            const [rows] = await db.execute(query, [image_hash]);
            return rows.length > 0 ? new Media(rows[0]) : null;
        } catch (error) {
            throw error;
        }
    }

    // Find similar media using perceptual hash comparison
    static async findSimilarByImageHash(image_hash, threshold = 5) {
        try {
            if (!image_hash || !PerceptualHash.isValidHash(image_hash)) {
                return [];
            }

            // Get all media with image hashes
            const query = 'SELECT * FROM media WHERE image_hash IS NOT NULL';
            const [rows] = await db.execute(query);
            
            const similarMedia = [];
            
            for (const row of rows) {
                if (row.image_hash && PerceptualHash.isValidHash(row.image_hash)) {
                    const isSimilar = PerceptualHash.areSimilar(image_hash, row.image_hash, threshold);
                    if (isSimilar) {
                        similarMedia.push(new Media(row));
                    }
                }
            }
            
            return similarMedia;
        } catch (error) {
            console.error('Error finding similar media by hash:', error);
            throw error;
        }
    }

    // Find identical media using perceptual hash (distance = 0)
    static async findIdenticalByImageHash(image_hash) {
        try {
            return await this.findSimilarByImageHash(image_hash, 0);
        } catch (error) {
            throw error;
        }
    }

    // Get all media with pagination
    static async findAll(options = {}) {
        try {
            console.log('Media.findAll called with options:', options);
            const {
                page = 1,
                limit = 10,
                search = '',
                media_type = '',
                is_active = '',
                sort = 'created_at',
                order = 'desc'
            } = options;

            // Validate sort column to prevent SQL injection
            const allowedSortColumns = ['id', 'title', 'description', 'media_type', 'is_active', 'created_at', 'updated_at'];
            const validSort = allowedSortColumns.includes(sort) ? sort : 'created_at';
            
            // Validate order direction
            const validOrder = ['asc', 'desc'].includes(order.toLowerCase()) ? order.toUpperCase() : 'DESC';

            const offset = (page - 1) * limit;
            let whereConditions = [];
            let queryParams = [];

            // Search functionality
            if (search) {
                whereConditions.push('(m.title LIKE ? OR m.description LIKE ?)');
                queryParams.push(`%${search}%`, `%${search}%`);
            }

            // Filter by media type
            if (media_type) {
                whereConditions.push('m.media_type = ?');
                queryParams.push(media_type);
            }

            // Filter by active status
            if (is_active !== '') {
                whereConditions.push('m.is_active = ?');
                queryParams.push(is_active);
            }

            const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

            // Get total count
            const countQuery = `
                SELECT COUNT(*) as total
                FROM media m
                ${whereClause}
            `;
            const [countResult] = await db.execute(countQuery, queryParams);
            const total = countResult[0].total;

            // Get media with pagination
            const query = `
                SELECT m.*, u.name as uploaded_by_name, u.email as uploaded_by_email
                FROM media m
                LEFT JOIN users u ON m.uploaded_by = u.id
                ${whereClause}
                ORDER BY m.${validSort} ${validOrder}
                LIMIT ${limit} OFFSET ${offset}
            `;

            console.log('Executing query:', query);
            console.log('Query params:', queryParams);
            
            const [rows] = await db.execute(query, queryParams);
            console.log('Query executed successfully, rows count:', rows.length);

            return {
                media: rows.map(row => new Media(row)),
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            };
        } catch (error) {
            console.error('Error in Media.findAll:', error);
            throw error;
        }
    }

    // Update media
    async update(updateData) {
        try {
            const {
                title,
                description,
                scanning_image,
                image_hash,
                media_type,
                is_active
            } = updateData;

            // Check if scanning image is being changed and if it already exists
            if (scanning_image && scanning_image !== this.scanning_image) {
                const existingMedia = await Media.findByScanningImage(scanning_image);
                if (existingMedia && existingMedia.id !== this.id) {
                    throw new Error('Scanning image already exists. Please use a different image.');
                }
            }

            const query = `
                UPDATE media 
                SET title = ?, description = ?, scanning_image = ?, image_hash = ?,
                    media_type = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `;

            await db.execute(query, [
                title,
                description,
                scanning_image || this.scanning_image,
                image_hash || this.image_hash,
                media_type,
                is_active,
                this.id
            ]);

            return await Media.findById(this.id);
        } catch (error) {
            throw error;
        }
    }

    // Delete media
    async delete() {
        try {
            const query = 'DELETE FROM media WHERE id = ?';
            await db.execute(query, [this.id]);
            return true;
        } catch (error) {
            throw error;
        }
    }

    // Toggle active status
    async toggleStatus() {
        try {
            const query = `
                UPDATE media 
                SET is_active = NOT is_active, updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `;
            await db.execute(query, [this.id]);
            return await Media.findById(this.id);
        } catch (error) {
            throw error;
        }
    }

    // Get media statistics
    static async getStats() {
        try {
            const query = `
                SELECT 
                    COUNT(*) as total_media,
                    COUNT(CASE WHEN is_active = 1 THEN 1 END) as active_media,
                    COUNT(CASE WHEN media_type = 'image' THEN 1 END) as image_count,
                    COUNT(CASE WHEN media_type = 'video' THEN 1 END) as video_count,
                    COUNT(CASE WHEN media_type = 'audio' THEN 1 END) as audio_count,
                    SUM(file_size) as total_size
                FROM media
            `;
            const [rows] = await db.execute(query);
            return rows[0];
        } catch (error) {
            throw error;
        }
    }

    // Check if scanning image exists (for validation)
    static async isScanningImageUnique(scanning_image, excludeId = null) {
        try {
            let query = 'SELECT id FROM media WHERE scanning_image = ?';
            let params = [scanning_image];

            if (excludeId) {
                query += ' AND id != ?';
                params.push(excludeId);
            }

            const [rows] = await db.execute(query, params);
            return rows.length === 0;
        } catch (error) {
            throw error;
        }
    }
}

module.exports = Media;
