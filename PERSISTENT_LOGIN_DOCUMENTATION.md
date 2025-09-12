# ArchivArt Persistent Login System Documentation

## Overview

The ArchivArt application now implements a robust persistent login system that allows users to stay logged in for extended periods (30 days) without requiring frequent re-authentication. This system uses JWT access tokens and refresh tokens to provide a seamless user experience while maintaining security.

## Key Features

### 🔐 **Persistent Authentication**
- **30-day session duration**: Users stay logged in for 30 days
- **Automatic token refresh**: Access tokens refresh every 15 minutes
- **Seamless experience**: No interruption to user workflow
- **Secure storage**: Tokens stored with SHA-256 hashing

### 🛡️ **Security Features**
- **Short-lived access tokens**: 15-minute expiration for security
- **Long-lived refresh tokens**: 30-day expiration for convenience
- **Token invalidation**: Immediate logout capability
- **Session tracking**: Monitor active sessions and device info
- **Automatic cleanup**: Expired sessions are automatically invalidated

## System Architecture

### Token Structure

#### Access Token (15 minutes)
```json
{
  "userId": 123,
  "email": "user@example.com",
  "role": "user",
  "username": "johndoe",
  "iat": 1694567890,
  "exp": 1694568790
}
```

#### Refresh Token (30 days)
```json
{
  "userId": 123,
  "type": "refresh",
  "iat": 1694567890,
  "exp": 1697159890
}
```

### Database Schema

#### Enhanced user_sessions Table
```sql
CREATE TABLE user_sessions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    session_token VARCHAR(255) NOT NULL,        -- SHA-256 hash of access token
    refresh_token VARCHAR(255) NULL,            -- SHA-256 hash of refresh token
    device_info JSON NULL,                      -- Device information
    ip_address VARCHAR(45) NULL,                -- IPv4 or IPv6 address
    user_agent TEXT NULL,                       -- Browser/device info
    is_active BOOLEAN DEFAULT true,             -- Session status
    last_activity_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,              -- Refresh token expiration
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

## API Endpoints

### Authentication Endpoints

#### 1. User Registration
```http
POST /api/auth/register
Content-Type: application/json

{
    "name": "John Doe",
    "username": "johndoe",
    "email": "john@example.com",
    "password": "password123",
    "mobile": "+1234567890"
}
```

**Response:**
```json
{
    "message": "User registered successfully",
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": 900,
    "user": {
        "id": 123,
        "name": "John Doe",
        "username": "johndoe",
        "email": "john@example.com",
        "mobile": "+1234567890",
        "role": "user",
        "is_verified": false
    }
}
```

#### 2. User Login
```http
POST /api/auth/login
Content-Type: application/json

{
    "email": "john@example.com",
    "password": "password123"
}
```

**Response:** Same as registration response

#### 3. Google Authentication
```http
POST /api/auth/social-login
Content-Type: application/json

{
    "provider": "google",
    "providerId": "google_123456789",
    "name": "John Doe",
    "email": "john@gmail.com",
    "profilePicture": "https://example.com/avatar.jpg",
    "mobile": "+1234567890"
}
```

**Response:** Same as registration response

#### 4. Token Refresh
```http
POST /api/auth/refresh
Content-Type: application/json

{
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response:**
```json
{
    "message": "Token refreshed successfully",
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": 900,
    "user": {
        "id": 123,
        "name": "John Doe",
        "username": "johndoe",
        "email": "john@example.com",
        "mobile": "+1234567890",
        "role": "user",
        "is_verified": true
    }
}
```

#### 5. Logout
```http
POST /api/auth/logout
Content-Type: application/json

{
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response:**
```json
{
    "message": "Logout successful"
}
```

### Protected Endpoints

#### Using Access Token
```http
GET /api/auth/profile
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### Using Automatic Refresh (Recommended)
```http
GET /api/auth/profile
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
X-Refresh-Token: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Response Headers (when token is refreshed):**
```
X-New-Access-Token: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
X-Token-Expires-In: 900
```

## Client Implementation

### Mobile App (React Native/Flutter)

#### 1. Store Tokens Securely
```javascript
// Store tokens in secure storage
import AsyncStorage from '@react-native-async-storage/async-storage';

const storeTokens = async (accessToken, refreshToken) => {
    await AsyncStorage.setItem('accessToken', accessToken);
    await AsyncStorage.setItem('refreshToken', refreshToken);
};
```

#### 2. Automatic Token Refresh
```javascript
// API client with automatic token refresh
const apiClient = axios.create({
    baseURL: 'https://your-api.com/api',
});

// Request interceptor to add tokens
apiClient.interceptors.request.use(async (config) => {
    const accessToken = await AsyncStorage.getItem('accessToken');
    const refreshToken = await AsyncStorage.getItem('refreshToken');
    
    if (accessToken) {
        config.headers.Authorization = `Bearer ${accessToken}`;
    }
    
    if (refreshToken) {
        config.headers['X-Refresh-Token'] = refreshToken;
    }
    
    return config;
});

// Response interceptor to handle token refresh
apiClient.interceptors.response.use(
    (response) => {
        // Check for new access token in response headers
        const newAccessToken = response.headers['x-new-access-token'];
        if (newAccessToken) {
            AsyncStorage.setItem('accessToken', newAccessToken);
        }
        return response;
    },
    async (error) => {
        if (error.response?.status === 401 && error.response?.data?.code === 'TOKEN_EXPIRED') {
            // Try to refresh token
            const refreshToken = await AsyncStorage.getItem('refreshToken');
            if (refreshToken) {
                try {
                    const response = await axios.post('/api/auth/refresh', {
                        refreshToken
                    });
                    
                    await storeTokens(response.data.accessToken, refreshToken);
                    
                    // Retry original request
                    return apiClient.request(error.config);
                } catch (refreshError) {
                    // Refresh failed, redirect to login
                    await AsyncStorage.multiRemove(['accessToken', 'refreshToken']);
                    // Navigate to login screen
                }
            }
        }
        return Promise.reject(error);
    }
);
```

#### 3. Login Implementation
```javascript
const login = async (email, password) => {
    try {
        const response = await apiClient.post('/auth/login', {
            email,
            password
        });
        
        await storeTokens(response.data.accessToken, response.data.refreshToken);
        
        // Navigate to main app
        navigation.navigate('MainApp');
    } catch (error) {
        console.error('Login failed:', error);
    }
};
```

#### 4. Logout Implementation
```javascript
const logout = async () => {
    try {
        const refreshToken = await AsyncStorage.getItem('refreshToken');
        
        if (refreshToken) {
            await apiClient.post('/auth/logout', { refreshToken });
        }
        
        await AsyncStorage.multiRemove(['accessToken', 'refreshToken']);
        
        // Navigate to login screen
        navigation.navigate('Login');
    } catch (error) {
        console.error('Logout failed:', error);
    }
};
```

### Web Application

#### 1. Store Tokens in HTTP-Only Cookies (Recommended)
```javascript
// Server-side cookie setting
res.cookie('accessToken', accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 15 * 60 * 1000 // 15 minutes
});

res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
});
```

#### 2. Automatic Token Refresh
```javascript
// Axios interceptor for web
axios.interceptors.response.use(
    (response) => response,
    async (error) => {
        if (error.response?.status === 401 && error.response?.data?.code === 'TOKEN_EXPIRED') {
            try {
                const response = await axios.post('/api/auth/refresh');
                
                // Update cookies
                document.cookie = `accessToken=${response.data.accessToken}; path=/`;
                
                // Retry original request
                return axios.request(error.config);
            } catch (refreshError) {
                // Redirect to login
                window.location.href = '/login';
            }
        }
        return Promise.reject(error);
    }
);
```

## Security Considerations

### 1. Token Storage
- **Mobile**: Use secure storage (Keychain/Keystore)
- **Web**: Use HTTP-only cookies when possible
- **Never store tokens in localStorage** (web) or plain text (mobile)

### 2. Token Rotation
- Access tokens are rotated every 15 minutes
- Refresh tokens can be rotated on each refresh for enhanced security
- Implement token blacklisting for compromised tokens

### 3. Session Management
- Track device information and IP addresses
- Implement session limits per user
- Monitor for suspicious activity

### 4. Logout Security
- Invalidate all tokens on logout
- Clear client-side storage
- Implement "logout from all devices" functionality

## Testing

### Test Scenarios

1. **Login Flow**
   - User logs in successfully
   - Tokens are generated and stored
   - User can access protected resources

2. **Token Refresh**
   - Access token expires after 15 minutes
   - Refresh token automatically generates new access token
   - User experience is uninterrupted

3. **Logout Flow**
   - User logs out manually
   - All tokens are invalidated
   - User cannot access protected resources

4. **Session Persistence**
   - User closes and reopens app
   - User remains logged in
   - Tokens are automatically refreshed

5. **Security Tests**
   - Expired tokens are rejected
   - Invalid tokens are rejected
   - Refresh tokens expire after 30 days

## Monitoring and Analytics

### Session Statistics
```sql
-- Active sessions count
SELECT COUNT(*) as active_sessions 
FROM user_sessions 
WHERE is_active = true AND expires_at > NOW();

-- Sessions by user
SELECT user_id, COUNT(*) as session_count 
FROM user_sessions 
WHERE is_active = true 
GROUP BY user_id;

-- Expired sessions cleanup
DELETE FROM user_sessions 
WHERE expires_at <= NOW() OR is_active = false;
```

### User Activity Tracking
- Login/logout events
- Token refresh frequency
- Session duration
- Device information
- Geographic location (IP-based)

## Troubleshooting

### Common Issues

1. **Token Expired Errors**
   - Check if refresh token is valid
   - Verify token expiration times
   - Ensure proper token storage

2. **Refresh Token Invalid**
   - Check if refresh token exists in database
   - Verify token hasn't expired
   - Check if session is active

3. **Session Not Persisting**
   - Verify token storage mechanism
   - Check if tokens are being cleared
   - Ensure proper cookie settings (web)

### Debug Mode
Enable debug logging to troubleshoot token issues:
```javascript
// Add to your API client
if (process.env.NODE_ENV === 'development') {
    console.log('Access Token:', accessToken);
    console.log('Refresh Token:', refreshToken);
    console.log('Token Expiry:', new Date(decoded.exp * 1000));
}
```

## Performance Optimization

### 1. Token Caching
- Cache user information with tokens
- Reduce database queries for user data
- Implement token validation caching

### 2. Session Cleanup
- Regular cleanup of expired sessions
- Batch delete operations
- Monitor database performance

### 3. Rate Limiting
- Implement rate limiting for token refresh
- Prevent token abuse
- Monitor for suspicious patterns

## Conclusion

The persistent login system provides a secure, user-friendly authentication experience that balances convenience with security. Users can stay logged in for extended periods while maintaining strong security through short-lived access tokens and secure refresh mechanisms.

For questions or support, refer to the API documentation or contact the development team.
