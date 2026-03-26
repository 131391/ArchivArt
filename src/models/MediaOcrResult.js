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
}

module.exports = MediaOcrResult;
