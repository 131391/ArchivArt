const MediaOcrResult = require('../models/MediaOcrResult');

class OcrController {
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
}

module.exports = OcrController;
