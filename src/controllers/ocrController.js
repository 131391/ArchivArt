const MediaOcrResult = require('../models/MediaOcrResult');
const db = require('../config/database');

class OcrController {
    static async ensureSettingsOcrColumns() {
        const [existing] = await db.execute(
            `SELECT COLUMN_NAME
             FROM information_schema.COLUMNS
             WHERE TABLE_SCHEMA = DATABASE()
               AND TABLE_NAME = 'settings'
               AND COLUMN_NAME IN ('ocr_provider', 'ocr_fallback_provider')`
        );

        const columns = new Set(existing.map((row) => row.COLUMN_NAME));
        if (!columns.has('ocr_provider')) {
            await db.execute("ALTER TABLE settings ADD COLUMN ocr_provider VARCHAR(20) DEFAULT 'tesseract' AFTER smtp_password");
        }
        if (!columns.has('ocr_fallback_provider')) {
            await db.execute("ALTER TABLE settings ADD COLUMN ocr_fallback_provider VARCHAR(20) DEFAULT NULL AFTER ocr_provider");
        }
    }

    static normalizeProvider(value, allowEmpty = false) {
        const normalized = (value || '').trim().toLowerCase();
        if (allowEmpty && !normalized) return '';
        return normalized === 'google' ? 'google' : 'tesseract';
    }

    static async loadPersistedProviderConfig() {
        await OcrController.ensureSettingsOcrColumns();
        const [rows] = await db.execute(
            'SELECT ocr_provider, ocr_fallback_provider FROM settings ORDER BY id ASC LIMIT 1'
        );

        if (!rows.length) {
            return {
                activeProvider: OcrController.normalizeProvider(process.env.OCR_PROVIDER || 'tesseract'),
                fallbackProvider: ['google', 'tesseract'].includes((process.env.OCR_FALLBACK_PROVIDER || '').trim().toLowerCase())
                    ? (process.env.OCR_FALLBACK_PROVIDER || '').trim().toLowerCase()
                    : ''
            };
        }

        const activeProvider = OcrController.normalizeProvider(rows[0].ocr_provider || process.env.OCR_PROVIDER || 'tesseract');
        const fallbackRaw = (rows[0].ocr_fallback_provider || '').trim().toLowerCase();
        const fallbackProvider = ['google', 'tesseract'].includes(fallbackRaw) ? fallbackRaw : '';

        process.env.OCR_PROVIDER = activeProvider;
        process.env.OCR_FALLBACK_PROVIDER = fallbackProvider;

        return { activeProvider, fallbackProvider };
    }

    static async getOcrList(req, res) {
        try {
            const {
                page = 1,
                limit = 20,
                search = '',
                provider = '',
                status = ''
            } = req.query;

            const result = await MediaOcrResult.findAdminList({
                page,
                limit,
                search,
                provider,
                status
            });

            const stats = await MediaOcrResult.getAdminStats();
            const persistedConfig = await OcrController.loadPersistedProviderConfig();

            res.render('admin/ocr', {
                title: 'OCR Management',
                data: result.rows,
                pagination: {
                    currentPage: result.page,
                    totalPages: result.totalPages,
                    totalItems: result.total,
                    hasPrev: result.page > 1,
                    hasNext: result.page < result.totalPages
                },
                filters: { search, provider, status },
                stats,
                providerConfig: {
                    activeProvider: persistedConfig.activeProvider,
                    fallbackProvider: persistedConfig.fallbackProvider,
                    googleKeyConfigured: Boolean(process.env.GOOGLE_VISION_API_KEY)
                },
                user: req.session.user,
                userPermissions: req.userPermissions || [],
                userPrimaryRole: req.userPrimaryRole || null
            });
        } catch (error) {
            console.error('Error loading OCR list:', error);
            req.flash('error', 'Error loading OCR records');
            res.redirect('/admin/dashboard');
        }
    }

    static async getOcrDetail(req, res) {
        try {
            const id = Number(req.params.id);
            if (!Number.isInteger(id) || id <= 0) {
                req.flash('error_msg', 'Invalid OCR record ID.');
                return res.redirect('/admin/ocr');
            }

            const record = await MediaOcrResult.findAdminDetailById(id);
            if (!record) {
                req.flash('error_msg', 'OCR record not found.');
                return res.redirect('/admin/ocr');
            }

            return res.render('admin/ocr-detail', {
                title: 'OCR Result Details',
                record,
                user: req.session.user,
                userPermissions: req.userPermissions || [],
                userPrimaryRole: req.userPrimaryRole || null
            });
        } catch (error) {
            console.error('Error loading OCR detail:', error);
            req.flash('error_msg', 'Failed to load OCR detail.');
            return res.redirect('/admin/ocr');
        }
    }

    static async updateProviderConfig(req, res) {
        try {
            const activeProviderRaw = (req.body.active_provider || '').trim().toLowerCase();
            const fallbackProviderRaw = (req.body.fallback_provider || '').trim().toLowerCase();

            if (!['google', 'tesseract'].includes(activeProviderRaw)) {
                req.flash('error_msg', 'Invalid active OCR provider selected.');
                return res.redirect('/admin/ocr');
            }

            if (fallbackProviderRaw && !['google', 'tesseract', 'none'].includes(fallbackProviderRaw)) {
                req.flash('error_msg', 'Invalid fallback OCR provider selected.');
                return res.redirect('/admin/ocr');
            }

            const fallbackProvider = fallbackProviderRaw === 'none' ? '' : fallbackProviderRaw;
            if (fallbackProvider && fallbackProvider === activeProviderRaw) {
                req.flash('error_msg', 'Fallback provider must be different from active provider.');
                return res.redirect('/admin/ocr');
            }

            await OcrController.ensureSettingsOcrColumns();
            const [settingsRows] = await db.execute('SELECT id FROM settings ORDER BY id ASC LIMIT 1');
            if (settingsRows.length) {
                await db.execute(
                    `UPDATE settings
                     SET ocr_provider = ?, ocr_fallback_provider = ?, updated_at = CURRENT_TIMESTAMP
                     WHERE id = ?`,
                    [activeProviderRaw, fallbackProvider || null, settingsRows[0].id]
                );
            } else {
                await db.execute(
                    `INSERT INTO settings (ocr_provider, ocr_fallback_provider)
                     VALUES (?, ?)`,
                    [activeProviderRaw, fallbackProvider || null]
                );
            }

            process.env.OCR_PROVIDER = activeProviderRaw;
            process.env.OCR_FALLBACK_PROVIDER = fallbackProvider;

            if (activeProviderRaw === 'google' && !process.env.GOOGLE_VISION_API_KEY) {
                req.flash('error_msg', 'Switched to Google OCR, but GOOGLE_VISION_API_KEY is missing.');
            } else {
                req.flash('success_msg', 'OCR provider configuration updated successfully.');
            }

            return res.redirect('/admin/ocr');
        } catch (error) {
            console.error('Error updating OCR provider config:', error);
            req.flash('error_msg', 'Failed to update OCR provider configuration.');
            return res.redirect('/admin/ocr');
        }
    }
}

module.exports = OcrController;
