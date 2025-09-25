const db = require('../config/database');
const { securityUtils } = require('../config/security');
const crypto = require('crypto');

class SecurityService {
  // Log security event
  static async logSecurityEvent(eventType, req, additionalData = {}) {
    try {
      const eventData = {
        ip: securityUtils.getClientIP(req),
        userAgent: req.get('User-Agent'),
        userId: req.user?.id || req.session?.user?.id,
        endpoint: req.originalUrl,
        method: req.method,
        ...additionalData
      };

      await db.execute(
        `INSERT INTO security_events (event_type, user_id, ip_address, user_agent, event_data, severity) 
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          eventType,
          eventData.userId,
          eventData.ip,
          eventData.userAgent,
          JSON.stringify(eventData),
          this.getSeverityLevel(eventType)
        ]
      );

      console.warn(`Security Event: ${eventType}`, eventData);
    } catch (error) {
      console.error('Error logging security event:', error);
    }
  }

  // Get severity level for event type
  static getSeverityLevel(eventType) {
    const severityMap = {
      'failed_login': 'medium',
      'suspicious_input': 'high',
      'sql_injection_attempt': 'critical',
      'xss_attempt': 'critical',
      'rate_limit_exceeded': 'medium',
      'unauthorized_access': 'high',
      'password_changed': 'medium',
      'user_status_changed': 'high',
      'token_revoked': 'medium',
      'file_upload_blocked': 'medium',
      'ip_blocked': 'high',
      'admin_action': 'low'
    };

    return severityMap[eventType] || 'medium';
  }

  // Record failed login attempt
  static async recordFailedLogin(email, req) {
    try {
      const ip = securityUtils.getClientIP(req);
      const userAgent = req.get('User-Agent');

      // Check if record exists
      const [existing] = await db.execute(
        'SELECT * FROM failed_login_attempts WHERE email = ? AND ip_address = ?',
        [email, ip]
      );

      if (existing.length > 0) {
        const attempt = existing[0];
        const newCount = attempt.attempt_count + 1;
        const isBlocked = newCount >= 5; // Max 5 attempts
        const blockedUntil = isBlocked ? new Date(Date.now() + 30 * 60 * 1000) : null; // 30 minutes

        await db.execute(
          `UPDATE failed_login_attempts 
           SET attempt_count = ?, last_attempt = CURRENT_TIMESTAMP, is_blocked = ?, blocked_until = ?
           WHERE id = ?`,
          [newCount, isBlocked, blockedUntil, attempt.id]
        );

        if (isBlocked) {
          await this.logSecurityEvent('ip_blocked', req, {
            email,
            attemptCount: newCount,
            blockedUntil
          });
        }
      } else {
        await db.execute(
          `INSERT INTO failed_login_attempts (email, ip_address, user_agent, attempt_count, is_blocked, blocked_until)
           VALUES (?, ?, ?, 1, FALSE, NULL)`,
          [email, ip, userAgent]
        );
      }

      await this.logSecurityEvent('failed_login', req, { email });
    } catch (error) {
      console.error('Error recording failed login:', error);
    }
  }

  // Clear failed login attempts
  static async clearFailedLogins(email, ip) {
    try {
      await db.execute(
        'DELETE FROM failed_login_attempts WHERE email = ? AND ip_address = ?',
        [email, ip]
      );
    } catch (error) {
      console.error('Error clearing failed logins:', error);
    }
  }

  // Check if IP is blocked
  static async isIPBlocked(ip) {
    try {
      const [blocked] = await db.execute(
        'SELECT COUNT(*) as count FROM failed_login_attempts WHERE ip_address = ? AND is_blocked = TRUE AND blocked_until > NOW()',
        [ip]
      );

      return blocked[0].count > 0;
    } catch (error) {
      console.error('Error checking IP block status:', error);
      return false;
    }
  }

  // Check if email is blocked
  static async isEmailBlocked(email) {
    try {
      const [blocked] = await db.execute(
        'SELECT COUNT(*) as count FROM failed_login_attempts WHERE email = ? AND is_blocked = TRUE AND blocked_until > NOW()',
        [email]
      );

      return blocked[0].count > 0;
    } catch (error) {
      console.error('Error checking email block status:', error);
      return false;
    }
  }

  // Blacklist token
  static async blacklistToken(token, userId, reason = 'logout') {
    try {
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

      await db.execute(
        'INSERT INTO blacklisted_tokens (token_hash, user_id, reason, expires_at) VALUES (?, ?, ?, ?)',
        [tokenHash, userId, reason, expiresAt]
      );
    } catch (error) {
      console.error('Error blacklisting token:', error);
    }
  }

  // Check if token is blacklisted
  static async isTokenBlacklisted(token) {
    try {
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
      const [blacklisted] = await db.execute(
        'SELECT COUNT(*) as count FROM blacklisted_tokens WHERE token_hash = ? AND expires_at > NOW()',
        [tokenHash]
      );

      return blacklisted[0].count > 0;
    } catch (error) {
      console.error('Error checking token blacklist:', error);
      return false;
    }
  }

  // Log API usage
  static async logAPIUsage(req, res, responseTime) {
    try {
      const requestSize = JSON.stringify(req.body).length;
      const responseSize = res.get('Content-Length') || 0;

      await db.execute(
        `INSERT INTO api_usage (user_id, endpoint, method, ip_address, user_agent, response_status, response_time_ms, request_size_bytes, response_size_bytes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          req.user?.id || null,
          req.originalUrl,
          req.method,
          securityUtils.getClientIP(req),
          req.get('User-Agent'),
          res.statusCode,
          responseTime,
          requestSize,
          responseSize
        ]
      );
    } catch (error) {
      console.error('Error logging API usage:', error);
    }
  }

  // Get security statistics
  static async getSecurityStats(days = 30) {
    try {
      const [stats] = await db.execute(`
        SELECT 
          'failed_logins' as metric,
          COUNT(*) as count,
          DATE(created_at) as date
        FROM failed_login_attempts 
        WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
        GROUP BY DATE(created_at)
        
        UNION ALL
        
        SELECT 
          'security_events' as metric,
          COUNT(*) as count,
          DATE(created_at) as date
        FROM security_events 
        WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
        GROUP BY DATE(created_at)
        
        UNION ALL
        
        SELECT 
          'api_requests' as metric,
          COUNT(*) as count,
          DATE(created_at) as date
        FROM api_usage 
        WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
        GROUP BY DATE(created_at)
        
        ORDER BY date DESC
      `, [days, days, days]);

      return stats;
    } catch (error) {
      console.error('Error getting security stats:', error);
      return [];
    }
  }

  // Get recent security events
  static async getRecentSecurityEvents(limit = 50) {
    try {
      const [events] = await db.execute(`
        SELECT 
          se.*,
          u.name as user_name,
          u.email as user_email
        FROM security_events se
        LEFT JOIN users u ON se.user_id = u.id
        ORDER BY se.created_at DESC
        LIMIT ?
      `, [limit]);

      return events;
    } catch (error) {
      console.error('Error getting recent security events:', error);
      return [];
    }
  }

  // Get blocked IPs
  static async getBlockedIPs() {
    try {
      const [blocked] = await db.execute(`
        SELECT 
          ip_address,
          email,
          attempt_count,
          last_attempt,
          blocked_until
        FROM failed_login_attempts 
        WHERE is_blocked = TRUE AND blocked_until > NOW()
        ORDER BY last_attempt DESC
      `);

      return blocked;
    } catch (error) {
      console.error('Error getting blocked IPs:', error);
      return [];
    }
  }

  // Unblock IP
  static async unblockIP(ip) {
    try {
      await db.execute(
        'UPDATE failed_login_attempts SET is_blocked = FALSE, blocked_until = NULL WHERE ip_address = ?',
        [ip]
      );

      await this.logSecurityEvent('ip_unblocked', { ip }, { ip });
    } catch (error) {
      console.error('Error unblocking IP:', error);
    }
  }

  // Clean up expired data
  static async cleanupExpiredData() {
    try {
      // Clean up expired blacklisted tokens
      await db.execute('DELETE FROM blacklisted_tokens WHERE expires_at < NOW()');
      
      // Clean up expired user sessions
      await db.execute('UPDATE user_sessions SET is_active = FALSE WHERE expires_at < NOW()');
      
      // Clean up old security events (older than 90 days)
      await db.execute('DELETE FROM security_events WHERE created_at < DATE_SUB(NOW(), INTERVAL 90 DAY)');
      
      // Clean up old API usage logs (older than 30 days)
      await db.execute('DELETE FROM api_usage WHERE created_at < DATE_SUB(NOW(), INTERVAL 30 DAY)');
      
      // Clean up old failed login attempts (older than 7 days)
      await db.execute('DELETE FROM failed_login_attempts WHERE last_attempt < DATE_SUB(NOW(), INTERVAL 7 DAY)');
    } catch (error) {
      console.error('Error during security data cleanup:', error);
    }
  }

  // Validate file upload security
  static validateFileUpload(file, allowedTypes, maxSize) {
    const errors = [];

    // Check file size
    if (file.size > maxSize) {
      errors.push(`File size exceeds maximum allowed size of ${maxSize / (1024 * 1024)}MB`);
    }

    // Check file type
    if (!allowedTypes.includes(file.mimetype)) {
      errors.push(`File type ${file.mimetype} is not allowed`);
    }

    // Check for malicious extensions
    const maliciousExtensions = ['.exe', '.bat', '.cmd', '.com', '.pif', '.scr', '.vbs', '.js', '.jar'];
    const fileExtension = file.originalname.split('.').pop().toLowerCase();
    if (maliciousExtensions.includes(`.${fileExtension}`)) {
      errors.push(`File extension .${fileExtension} is not allowed`);
    }

    // Check filename for suspicious patterns
    if (securityUtils.detectXSS(file.originalname) || securityUtils.detectSQLInjection(file.originalname)) {
      errors.push('Filename contains suspicious content');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Generate security report
  static async generateSecurityReport(days = 7) {
    try {
      const [report] = await db.execute(`
        SELECT 
          'Total Failed Logins' as metric,
          COUNT(*) as value
        FROM failed_login_attempts 
        WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
        
        UNION ALL
        
        SELECT 
          'Total Security Events' as metric,
          COUNT(*) as value
        FROM security_events 
        WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
        
        UNION ALL
        
        SELECT 
          'Critical Security Events' as metric,
          COUNT(*) as value
        FROM security_events 
        WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY) AND severity = 'critical'
        
        UNION ALL
        
        SELECT 
          'Blocked IPs' as metric,
          COUNT(*) as value
        FROM failed_login_attempts 
        WHERE is_blocked = TRUE AND blocked_until > NOW()
        
        UNION ALL
        
        SELECT 
          'Active Sessions' as metric,
          COUNT(*) as value
        FROM user_sessions 
        WHERE is_active = TRUE AND expires_at > NOW()
      `, [days, days, days]);

      return report;
    } catch (error) {
      console.error('Error generating security report:', error);
      return [];
    }
  }
}

module.exports = SecurityService;
