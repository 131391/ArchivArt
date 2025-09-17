const crypto = require('crypto');

// Security configuration
const securityConfig = {
  // JWT Configuration
  jwt: {
    accessTokenExpiry: '15m',
    refreshTokenExpiry: '30d',
    algorithm: 'HS256',
    issuer: 'archivart',
    audience: 'archivart-users'
  },

  // Password Configuration
  password: {
    minLength: 8,
    maxLength: 128,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: true,
    saltRounds: 12,
    maxAge: 90, // days
    historyCount: 5 // remember last 5 passwords
  },

  // Session Configuration
  session: {
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'strict',
    name: 'archivart.sid'
  },

  // Rate Limiting Configuration
  rateLimiting: {
    auth: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 5, // 5 attempts per window
      message: 'Too many authentication attempts, please try again later'
    },
    api: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // 100 requests per window
      message: 'Too many API requests, please try again later'
    },
    upload: {
      windowMs: 60 * 60 * 1000, // 1 hour
      max: 10, // 10 uploads per hour
      message: 'Too many file uploads, please try again later'
    },
    strict: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 3, // 3 attempts per window
      message: 'Too many requests, please try again later'
    }
  },

  // File Upload Configuration
  fileUpload: {
    maxFileSize: 50 * 1024 * 1024, // 50MB
    allowedImageTypes: [
      'image/jpeg',
      'image/jpg', 
      'image/png',
      'image/gif',
      'image/webp'
    ],
    allowedMediaTypes: [
      'video/mp4',
      'video/webm',
      'video/ogg',
      'audio/mpeg',
      'audio/wav',
      'audio/ogg'
    ],
    maliciousExtensions: [
      '.exe', '.bat', '.cmd', '.com', '.pif', '.scr', '.vbs', 
      '.js', '.jar', '.php', '.asp', '.aspx', '.jsp'
    ],
    scanForMalware: true
  },

  // Security Headers Configuration
  securityHeaders: {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.tailwindcss.com", "https://cdnjs.cloudflare.com"],
        scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.tailwindcss.com"],
        imgSrc: ["'self'", "data:", "https:", "blob:"],
        connectSrc: ["'self'"],
        fontSrc: ["'self'", "https://cdnjs.cloudflare.com"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'", "https:", "blob:"],
        frameSrc: ["'none'"]
      }
    },
    hsts: {
      maxAge: 31536000, // 1 year
      includeSubDomains: true,
      preload: true
    }
  },

  // CORS Configuration
  cors: {
    allowedOrigins: [
      'http://localhost:3000',
      'http://localhost:3001',
      'https://archivart.vercel.app',
      'https://archivart.netlify.app'
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    exposedHeaders: ['X-Total-Count', 'X-Page-Count']
  },

  // Account Security Configuration
  accountSecurity: {
    maxFailedLoginAttempts: 5,
    lockoutDuration: 30, // minutes
    passwordResetExpiry: 60, // minutes
    emailVerificationExpiry: 24, // hours
    twoFactorEnabled: false,
    requireEmailVerification: true
  },

  // Logging Configuration
  logging: {
    securityEvents: true,
    failedLogins: true,
    apiUsage: true,
    retentionDays: 90,
    logLevel: process.env.NODE_ENV === 'production' ? 'warn' : 'info'
  },

  // IP Security Configuration
  ipSecurity: {
    whitelistEnabled: false,
    whitelistIPs: [],
    blacklistEnabled: true,
    maxRequestsPerMinute: 60,
    suspiciousActivityThreshold: 10
  },

  // Encryption Configuration
  encryption: {
    algorithm: 'aes-256-gcm',
    keyLength: 32,
    ivLength: 16,
    tagLength: 16
  }
};

// Security utility functions
const securityUtils = {
  // Generate secure random string
  generateSecureToken: (length = 32) => {
    return crypto.randomBytes(length).toString('hex');
  },

  // Generate secure random number
  generateSecureNumber: (min = 100000, max = 999999) => {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  },

  // Hash sensitive data
  hashSensitiveData: (data) => {
    return crypto.createHash('sha256').update(data).digest('hex');
  },

  // Encrypt sensitive data
  encryptData: (data, key) => {
    const iv = crypto.randomBytes(securityConfig.encryption.ivLength);
    const cipher = crypto.createCipher(securityConfig.encryption.algorithm, key);
    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
  },

  // Decrypt sensitive data
  decryptData: (encryptedData, key) => {
    const parts = encryptedData.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = parts[1];
    const decipher = crypto.createDecipher(securityConfig.encryption.algorithm, key);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  },

  // Validate password strength
  validatePasswordStrength: (password) => {
    const errors = [];
    
    if (password.length < securityConfig.password.minLength) {
      errors.push(`Password must be at least ${securityConfig.password.minLength} characters long`);
    }
    
    if (password.length > securityConfig.password.maxLength) {
      errors.push(`Password must be less than ${securityConfig.password.maxLength} characters long`);
    }
    
    if (securityConfig.password.requireUppercase && !/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }
    
    if (securityConfig.password.requireLowercase && !/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }
    
    if (securityConfig.password.requireNumbers && !/\d/.test(password)) {
      errors.push('Password must contain at least one number');
    }
    
    if (securityConfig.password.requireSpecialChars && !/[@$!%*?&]/.test(password)) {
      errors.push('Password must contain at least one special character (@$!%*?&)');
    }
    
    // Check for common weak passwords
    const commonPasswords = [
      'password', '123456', 'password123', 'admin', 'qwerty',
      'letmein', 'welcome', 'monkey', '1234567890', 'abc123'
    ];
    
    if (commonPasswords.includes(password.toLowerCase())) {
      errors.push('Password is too common, please choose a stronger password');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  },

  // Sanitize input
  sanitizeInput: (input) => {
    if (typeof input !== 'string') return input;
    
    return input
      .trim()
      .replace(/[<>]/g, '') // Remove potential HTML tags
      .replace(/javascript:/gi, '') // Remove javascript: protocol
      .replace(/on\w+=/gi, '') // Remove event handlers
      .substring(0, 1000); // Limit length
  },

  // Check for SQL injection patterns
  detectSQLInjection: (input) => {
    const sqlPatterns = [
      /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b)/i,
      /(\b(OR|AND)\s+\d+\s*=\s*\d+)/i,
      /(\b(OR|AND)\s+['"]\s*=\s*['"])/i,
      /(\bUNION\s+SELECT\b)/i,
      /(\bDROP\s+TABLE\b)/i,
      /(\bINSERT\s+INTO\b)/i,
      /(\bDELETE\s+FROM\b)/i,
      /(\bUPDATE\s+SET\b)/i
    ];
    
    return sqlPatterns.some(pattern => pattern.test(input));
  },

  // Check for XSS patterns
  detectXSS: (input) => {
    const xssPatterns = [
      /<script[^>]*>.*?<\/script>/gi,
      /<iframe[^>]*>.*?<\/iframe>/gi,
      /<object[^>]*>.*?<\/object>/gi,
      /<embed[^>]*>.*?<\/embed>/gi,
      /<link[^>]*>.*?<\/link>/gi,
      /<meta[^>]*>.*?<\/meta>/gi,
      /javascript:/gi,
      /vbscript:/gi,
      /onload=/gi,
      /onerror=/gi,
      /onclick=/gi
    ];
    
    return xssPatterns.some(pattern => pattern.test(input));
  },

  // Generate secure filename
  generateSecureFilename: (originalName) => {
    const ext = originalName.split('.').pop();
    const timestamp = Date.now();
    const random = crypto.randomBytes(16).toString('hex');
    return `${timestamp}-${random}.${ext}`;
  },

  // Validate file type
  validateFileType: (filename, allowedTypes) => {
    const ext = filename.split('.').pop().toLowerCase();
    return allowedTypes.includes(ext);
  },

  // Get client IP address
  getClientIP: (req) => {
    return req.ip || 
           req.connection.remoteAddress || 
           req.socket.remoteAddress ||
           (req.connection.socket ? req.connection.socket.remoteAddress : null) ||
           req.headers['x-forwarded-for']?.split(',')[0] ||
           'unknown';
  },

  // Check if request is from a bot
  isBotRequest: (userAgent) => {
    const botPatterns = [
      /bot/i, /crawler/i, /spider/i, /scraper/i,
      /curl/i, /wget/i, /python/i, /java/i,
      /postman/i, /insomnia/i
    ];
    
    return botPatterns.some(pattern => pattern.test(userAgent));
  }
};

module.exports = {
  securityConfig,
  securityUtils
};
