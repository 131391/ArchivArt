# ArchivArt Enhanced Database Schema Documentation

## Overview

The ArchivArt database has been enhanced to support Google authentication, username identification, and mobile number registration. This document outlines the new schema structure and features.

## New Features

### 1. Username Support
- **Field**: `username` (VARCHAR(50), UNIQUE)
- **Purpose**: Unique identifier for users beyond email
- **Auto-generation**: If not provided, system generates unique username from name
- **Validation**: 3-50 characters, alphanumeric and underscore only

### 2. Mobile Number Support
- **Field**: `mobile` (VARCHAR(20))
- **Format**: International format with country code (e.g., +1234567890)
- **Validation**: Regex pattern `^\+[1-9]\d{1,14}$`
- **Optional**: Users can register without mobile number

### 3. Enhanced Google Authentication
- **Provider Data**: JSON field to store additional Google profile information
- **Profile Picture**: Direct URL storage for Google profile images
- **Seamless Integration**: Existing users can link Google accounts
- **Auto-verification**: Google users are automatically email verified

### 4. User Verification System
- **Email Verification**: `is_verified` boolean field
- **Mobile Verification**: `is_mobile_verified` boolean field
- **Verification Tokens**: Dedicated table for email/mobile/password reset tokens
- **Token Expiry**: Configurable expiration times

### 5. User Preferences System
- **Flexible Storage**: Key-value pairs for user settings
- **Examples**: Theme preferences, notification settings, language
- **Scalable**: Easy to add new preference types

### 6. Activity Logging
- **Comprehensive Tracking**: Login, logout, profile updates, media actions
- **Metadata Support**: JSON field for additional activity data
- **IP and User Agent**: Security and analytics tracking

### 7. Enhanced Security
- **Login Tracking**: Last login time, login count
- **Failed Attempts**: Track and lock accounts after multiple failures
- **Account Lockout**: Temporary lockout mechanism
- **Session Management**: Enhanced session tracking with device info

## Database Schema

### Users Table (Enhanced)

```sql
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    
    -- Basic Information
    name VARCHAR(255) NOT NULL,
    username VARCHAR(50) UNIQUE NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    mobile VARCHAR(20) NULL,
    
    -- Authentication
    password VARCHAR(255) NULL,
    auth_provider ENUM('local', 'google', 'facebook') DEFAULT 'local',
    provider_id VARCHAR(255) NULL,
    provider_data JSON NULL,
    
    -- Status & Permissions
    role ENUM('admin', 'user') DEFAULT 'user',
    is_active BOOLEAN DEFAULT true,
    is_blocked BOOLEAN DEFAULT false,
    is_verified BOOLEAN DEFAULT false,
    is_mobile_verified BOOLEAN DEFAULT false,
    
    -- Profile Information
    profile_picture VARCHAR(500) NULL,
    date_of_birth DATE NULL,
    gender ENUM('male', 'female', 'other', 'prefer_not_to_say') NULL,
    country VARCHAR(100) NULL,
    timezone VARCHAR(50) DEFAULT 'UTC',
    
    -- Security & Tracking
    last_login_at TIMESTAMP NULL,
    login_count INT DEFAULT 0,
    failed_login_attempts INT DEFAULT 0,
    locked_until TIMESTAMP NULL,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

### New Tables

#### User Verification Tokens
```sql
CREATE TABLE user_verification_tokens (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    token_type ENUM('email', 'mobile', 'password_reset') NOT NULL,
    token VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    is_used BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

#### User Preferences
```sql
CREATE TABLE user_preferences (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    preference_key VARCHAR(100) NOT NULL,
    preference_value TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_preference (user_id, preference_key)
);
```

#### User Activity Log
```sql
CREATE TABLE user_activity_log (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    activity_type ENUM('login', 'logout', 'profile_update', 'password_change', 'media_upload', 'media_view') NOT NULL,
    activity_description TEXT,
    ip_address VARCHAR(45) NULL,
    user_agent TEXT NULL,
    metadata JSON NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

## API Endpoints

### Registration (Enhanced)
```http
POST /api/auth/register
Content-Type: application/json

{
    "name": "John Doe",
    "username": "johndoe123",  // Optional
    "email": "john@example.com",
    "password": "password123",
    "mobile": "+1234567890"    // Optional
}
```

### Google Authentication
```http
POST /api/auth/social-login
Content-Type: application/json

{
    "provider": "google",
    "providerId": "google_123456789",
    "name": "John Doe",
    "email": "john@gmail.com",
    "profilePicture": "https://example.com/avatar.jpg",
    "mobile": "+1234567890"    // Optional
}
```

## Migration Guide

### For Existing Installations

1. **Run the migration script**:
   ```bash
   # The migration has already been applied to your database
   # New installations can use the updated_schema.sql file
   ```

2. **Update your application code**:
   - Use the enhanced authentication controller
   - Update API validation rules
   - Implement new features as needed

### For New Installations

Use the `updated_schema.sql` file for a fresh installation with all enhanced features.

## Security Considerations

1. **Username Uniqueness**: Enforced at database level
2. **Mobile Format Validation**: International format required
3. **Provider Data**: JSON field for flexible Google/Facebook data storage
4. **Verification Tokens**: Secure token generation and expiration
5. **Activity Logging**: Comprehensive audit trail
6. **Account Lockout**: Protection against brute force attacks

## Testing

The enhanced schema has been tested with:
- ✅ User registration with username and mobile
- ✅ Google authentication flow
- ✅ User preferences system
- ✅ Verification token system
- ✅ Activity logging
- ✅ Database constraints and indexes

## Current Statistics

- **Total Users**: 17
- **Local Auth Users**: 16
- **Google Auth Users**: 1
- **Users with Username**: 17 (100%)
- **Users with Mobile**: 2
- **Verified Users**: 16

## Next Steps

1. **Implement Frontend**: Update registration/login forms
2. **Google OAuth Setup**: Configure Google OAuth credentials
3. **Email Verification**: Implement email verification flow
4. **Mobile Verification**: Add SMS verification (optional)
5. **User Preferences UI**: Build preferences management interface
6. **Activity Dashboard**: Create admin activity monitoring

## Support

For questions or issues with the enhanced schema, refer to:
- Database migration scripts in `/database/` folder
- Updated authentication controller in `/src/controllers/authController.js`
- API route validation in `/src/routes/api.js`
