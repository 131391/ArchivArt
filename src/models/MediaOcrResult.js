const db = require('../config/database');

class MediaOcrResult {
    static async create(data) {
        const {
            media_id,
            provider = null,
            extracted_text = null,
            confidence = null,
            language = null,
            status = 'success',
            error_message = null,
            processed_at = new Date()
        } = data;

        const query = `
            INSERT INTO media_ocr_results (
                media_id, provider, extracted_text, confidence, language, status, error_message, processed_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const [result] = await db.execute(query, [
            media_id,
            provider,
            extracted_text,
            confidence,
            language,
            status,
            error_message,
            processed_at
        ]);

        return this.findById(result.insertId);
    }

    static async findById(id) {
        const [rows] = await db.execute('SELECT * FROM media_ocr_results WHERE id = ?', [id]);
        return rows[0] || null;
    }

    static async findLatestByMediaId(mediaId) {
        const query = `
            SELECT *
            FROM media_ocr_results
            WHERE media_id = ?
            ORDER BY processed_at DESC, id DESC
            LIMIT 1
        `;
        const [rows] = await db.execute(query, [mediaId]);
        return rows[0] || null;
    }

    static async findLatestByMediaIds(mediaIds = []) {
        if (!mediaIds.length) {
            return new Map();
        }

        const placeholders = mediaIds.map(() => '?').join(',');
        const query = `
            SELECT r.*
            FROM media_ocr_results r
            INNER JOIN (
                SELECT media_id, MAX(id) AS latest_id
                FROM media_ocr_results
                WHERE media_id IN (${placeholders})
                GROUP BY media_id
            ) latest ON latest.latest_id = r.id
        `;

        const [rows] = await db.execute(query, mediaIds);
        const byMediaId = new Map();
        for (const row of rows) {
            byMediaId.set(row.media_id, row);
        }
        return byMediaId;
    }

    static async findAdminList(options = {}) {
        const page = Math.max(parseInt(options.page, 10) || 1, 1);
        const limit = Math.min(Math.max(parseInt(options.limit, 10) || 20, 1), 100);
        const offset = (page - 1) * limit;
        const search = (options.search || '').trim();
        const provider = (options.provider || '').trim();
        const status = (options.status || '').trim();

        const whereClauses = [];
        const params = [];

        if (search) {
            whereClauses.push('(m.title LIKE ? OR r.extracted_text LIKE ?)');
            const likeSearch = `%${search}%`;
            params.push(likeSearch, likeSearch);
        }

        if (provider) {
            whereClauses.push('r.provider = ?');
            params.push(provider);
        }

        if (status) {
            whereClauses.push('r.status = ?');
            params.push(status);
        }

        const whereSql = whereClauses.length ? `WHERE ${whereClauses.join(' AND ')}` : '';
        const fromSql = `
            FROM media_ocr_results r
            INNER JOIN media m ON m.id = r.media_id
            ${whereSql}
        `;

        const [countRows] = await db.execute(
            `SELECT COUNT(*) AS total ${fromSql}`,
            params
        );
        const total = countRows[0]?.total || 0;

        const safeLimit = Number.isFinite(limit) ? limit : 20;
        const safeOffset = Number.isFinite(offset) ? offset : 0;
        const [rows] = await db.execute(
            `
            SELECT
                r.*,
                m.title AS media_title,
                m.media_type,
                m.is_active AS media_is_active
            ${fromSql}
            ORDER BY r.processed_at DESC, r.id DESC
            LIMIT ${safeLimit} OFFSET ${safeOffset}
            `,
            params
        );

        return {
            rows,
            total,
            page,
            limit,
            totalPages: Math.max(Math.ceil(total / limit), 1)
        };
    }

    static async getAdminStats() {
        const [rows] = await db.execute(`
            SELECT
                COUNT(*) AS total,
                SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) AS success_count,
                SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) AS failed_count,
                SUM(CASE WHEN provider = 'google' THEN 1 ELSE 0 END) AS google_count,
                SUM(CASE WHEN provider = 'tesseract' THEN 1 ELSE 0 END) AS tesseract_count
            FROM media_ocr_results
        `);

        return rows[0] || {
            total: 0,
            success_count: 0,
            failed_count: 0,
            google_count: 0,
            tesseract_count: 0
        };
    }
}

module.exports = MediaOcrResult;
