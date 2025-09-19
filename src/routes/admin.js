const express = require('express');
const router = express.Router();
const { body, param } = require('express-validator');
const { requireAuth, requireAdminWeb, redirectIfAuthenticated } = require('../middleware/auth');
const { loadSettings } = require('../middleware/settings');
const authController = require('../controllers/authController');
const adminController = require('../controllers/adminController');
const mediaController = require('../controllers/mediaController');
const { 
  authRateLimit, 
  strictRateLimit,
  validateInput, 
  commonValidations, 
  preventSQLInjection,
  ipWhitelist 
} = require('../middleware/security');

// Root admin route - redirect to dashboard
router.get('/', (req, res) => {
  if (req.session.user) {
    res.redirect('/admin/dashboard');
  } else {
    res.redirect('/admin/login');
  }
});

// Login routes
router.get('/login', redirectIfAuthenticated, loadSettings, (req, res) => {
  res.render('admin/login', { 
    title: 'Login',
    email: req.query.email || '',
    layout: false
  });
});

router.post('/login', [
  authRateLimit,
  preventSQLInjection,
  commonValidations.email,
  body('password').notEmpty().withMessage('Password is required'),
  validateInput
], authController.webLogin);

router.get('/logout', authController.webLogout);

// Dashboard
router.get('/dashboard', requireAdminWeb, loadSettings, adminController.dashboard);

// User management routes with enhanced security
router.get('/users', [
  requireAdminWeb, 
  loadSettings, 
  preventSQLInjection
], adminController.getUsers);

router.get('/users/data', [
  requireAdminWeb, 
  preventSQLInjection
], adminController.getUsersData);

router.get('/users/:id', [
  requireAdminWeb, 
  preventSQLInjection,
  param('id').custom((value) => {
    if (!value || isNaN(value) || parseInt(value) < 1) {
      throw new Error('Valid user ID is required');
    }
    return true;
  }),
  validateInput
], adminController.getUser);

router.put('/users/:id', [
  requireAdminWeb, 
  preventSQLInjection,
  body('id').isInt({ min: 1 }).withMessage('Valid user ID is required'),
  commonValidations.name,
  commonValidations.email,
  validateInput
], adminController.updateUser);

router.post('/users/:id/block', [
  requireAdminWeb, 
  strictRateLimit,
  preventSQLInjection,
  body('id').isInt({ min: 1 }).withMessage('Valid user ID is required'),
  validateInput
], adminController.blockUser);

router.post('/users/:id/unblock', [
  requireAdminWeb, 
  strictRateLimit,
  preventSQLInjection,
  body('id').isInt({ min: 1 }).withMessage('Valid user ID is required'),
  validateInput
], adminController.unblockUser);

router.delete('/users/:id', [
  requireAdminWeb, 
  strictRateLimit,
  preventSQLInjection,
  body('id').isInt({ min: 1 }).withMessage('Valid user ID is required'),
  validateInput
], adminController.deleteUser);

// Media management routes
router.use('/media', require('./media'));

// Settings
router.get('/settings', [
  requireAdminWeb, 
  loadSettings, 
  preventSQLInjection
], adminController.settings);

router.post('/settings', [
  requireAdminWeb, 
  strictRateLimit,
  preventSQLInjection,
  validateInput
], adminController.updateSettings);

// Profile
router.get('/profile', [
  requireAdminWeb, 
  loadSettings, 
  preventSQLInjection
], adminController.profile);

router.post('/profile', [
  requireAdminWeb, 
  preventSQLInjection,
  commonValidations.name,
  commonValidations.email,
  validateInput
], adminController.updateProfile);

// Security Dashboard
router.get('/security', [
  requireAdminWeb, 
  loadSettings, 
  preventSQLInjection
], (req, res) => {
  res.render('admin/security', { 
    title: 'Security Dashboard',
    layout: false
  });
});

// Security API routes
router.get('/api/security/stats', [
  requireAdminWeb, 
  preventSQLInjection
], async (req, res) => {
  try {
    const SecurityService = require('../services/securityService');
    const stats = await SecurityService.getSecurityStats(7);
    const report = await SecurityService.generateSecurityReport(1);
    
    // Process stats for charts
    const chartData = {
      dates: [],
      securityEvents: [],
      failedLogins: []
    };
    
    // Group stats by date
    const statsByDate = {};
    stats.forEach(stat => {
      if (!statsByDate[stat.date]) {
        statsByDate[stat.date] = { securityEvents: 0, failedLogins: 0 };
      }
      if (stat.metric === 'security_events') {
        statsByDate[stat.date].securityEvents = stat.count;
      } else if (stat.metric === 'failed_logins') {
        statsByDate[stat.date].failedLogins = stat.count;
      }
    });
    
    // Convert to arrays for charts
    Object.keys(statsByDate).sort().forEach(date => {
      chartData.dates.push(new Date(date).toLocaleDateString());
      chartData.securityEvents.push(statsByDate[date].securityEvents);
      chartData.failedLogins.push(statsByDate[date].failedLogins);
    });
    
    res.json({
      failedLogins24h: report.find(r => r.metric === 'Total Failed Logins')?.value || 0,
      securityEvents24h: report.find(r => r.metric === 'Total Security Events')?.value || 0,
      blockedIPs: report.find(r => r.metric === 'Blocked IPs')?.value || 0,
      activeSessions: report.find(r => r.metric === 'Active Sessions')?.value || 0,
      chartData
    });
  } catch (error) {
    console.error('Error getting security stats:', error);
    res.status(500).json({ error: 'Failed to get security stats' });
  }
});

router.get('/api/security/events', [
  requireAdminWeb, 
  preventSQLInjection
], async (req, res) => {
  try {
    const SecurityService = require('../services/securityService');
    const events = await SecurityService.getRecentSecurityEvents(50);
    res.json(events);
  } catch (error) {
    console.error('Error getting security events:', error);
    res.status(500).json({ error: 'Failed to get security events' });
  }
});

router.get('/api/security/blocked-ips', [
  requireAdminWeb, 
  preventSQLInjection
], async (req, res) => {
  try {
    const SecurityService = require('../services/securityService');
    const blockedIPs = await SecurityService.getBlockedIPs();
    res.json(blockedIPs);
  } catch (error) {
    console.error('Error getting blocked IPs:', error);
    res.status(500).json({ error: 'Failed to get blocked IPs' });
  }
});

router.post('/api/security/unblock-ip', [
  requireAdminWeb, 
  strictRateLimit,
  preventSQLInjection,
  body('ip').isIP().withMessage('Valid IP address is required'),
  validateInput
], async (req, res) => {
  try {
    const SecurityService = require('../services/securityService');
    const { ip } = req.body;
    
    await SecurityService.unblockIP(ip);
    
    // Log security event
    await SecurityService.logSecurityEvent('ip_unblocked', req, { ip });
    
    res.json({ message: 'IP address unblocked successfully' });
  } catch (error) {
    console.error('Error unblocking IP:', error);
    res.status(500).json({ error: 'Failed to unblock IP address' });
  }
});

router.get('/api/security/export-report', [
  requireAdminWeb, 
  preventSQLInjection
], async (req, res) => {
  try {
    const SecurityService = require('../services/securityService');
    const report = await SecurityService.generateSecurityReport(30);
    
    // For now, return JSON. In production, you might want to generate a PDF
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="security-report-${new Date().toISOString().split('T')[0]}.json"`);
    res.json(report);
  } catch (error) {
    console.error('Error exporting security report:', error);
    res.status(500).json({ error: 'Failed to export security report' });
  }
});

module.exports = router;
