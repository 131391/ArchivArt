# ArchivArt API Documentation

## Authentication Endpoints

### Base URL
```
http://localhost:3000/api
```

### Content Type
All requests should include:
```
Content-Type: application/json
```

---

## 🔐 Authentication Endpoints

### 1. User Registration

**Endpoint:** `POST /api/auth/register`

**Description:** Register a new user account

**Rate Limiting:** 5 requests per 15 minutes per IP

**Request Body:**
```json
{
  "name": "John Doe",
  "username": "johndoe", // Optional - auto-generated if not provided
  "email": "john@example.com",
  "password": "SecurePass123!",
  "mobile": "+1234567890", // Optional - international format
  "role": "user" // Optional - defaults to "user", only "user" allowed via API
}
```

**Validation Rules:**
- `name`: 2-100 characters, letters, spaces, hyphens, apostrophes, periods only
- `username`: 3-50 characters, alphanumeric and underscores only (optional)
- `email`: Valid email format, max 255 characters
- `password`: 8-128 characters, must contain uppercase, lowercase, number, and special character
- `mobile`: International format with country code (optional)
- `role`: Only "user" allowed via API

**Success Response (201):**
```json
{
  "message": "User registered successfully",
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": 900,
  "user": {
    "id": 15,
    "name": "John Doe",
    "username": "johndoe",
    "email": "john@example.com",
    "mobile": "+1234567890",
    "role": "user",
    "is_verified": false
  }
}
```

**Error Responses:**

**400 - Validation Error:**
```json
{
  "error": "Validation failed",
  "details": [
    {
      "field": "email",
      "message": "Valid email is required",
      "value": "invalid-email"
    }
  ]
}
```

**400 - User Already Exists:**
```json
{
  "error": "User already exists with this email"
}
```

**400 - Username Taken:**
```json
{
  "error": "Username is already taken"
}
```

**400 - Mobile Already Registered:**
```json
{
  "error": "Mobile number is already registered"
}
```

**400 - Password Requirements:**
```json
{
  "error": "Password does not meet security requirements",
  "details": [
    "Password must contain at least one uppercase letter",
    "Password must contain at least one special character"
  ]
}
```

**429 - Rate Limited:**
```json
{
  "error": "Too many authentication attempts, please try again later",
  "retryAfter": 900,
  "timestamp": "2025-09-18T10:30:00.000Z"
}
```

---

### 2. User Login

**Endpoint:** `POST /api/auth/login`

**Description:** Authenticate user and receive JWT tokens

**Rate Limiting:** 5 requests per 15 minutes per IP

**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "SecurePass123!"
}
```

**Validation Rules:**
- `email`: Valid email format, required
- `password`: Required, not empty

**Success Response (200):**
```json
{
  "message": "Login successful",
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": 900,
  "user": {
    "id": 15,
    "name": "John Doe",
    "username": "johndoe",
    "email": "john@example.com",
    "mobile": "+1234567890",
    "role": "user",
    "is_verified": false
  }
}
```

**Error Responses:**

**400 - Validation Error:**
```json
{
  "error": "Validation failed",
  "details": [
    {
      "field": "email",
      "message": "Valid email is required",
      "value": "invalid-email"
    }
  ]
}
```

**401 - Invalid Credentials:**
```json
{
  "error": "Invalid credentials"
}
```

**401 - Account Inactive:**
```json
{
  "error": "Account is inactive or blocked"
}
```

**403 - IP Blocked:**
```json
{
  "error": "Access denied - IP address is blocked",
  "timestamp": "2025-09-18T10:30:00.000Z"
}
```

**403 - Email Blocked:**
```json
{
  "error": "Access denied - Email address is blocked",
  "timestamp": "2025-09-18T10:30:00.000Z"
}
```

**429 - Rate Limited:**
```json
{
  "error": "Too many authentication attempts, please try again later",
  "retryAfter": 900,
  "timestamp": "2025-09-18T10:30:00.000Z"
}
```

---

### 3. Social Login

**Endpoint:** `POST /api/auth/social-login`

**Description:** Authenticate user via Google or Facebook

**Rate Limiting:** 5 requests per 15 minutes per IP

**Request Body:**
```json
{
  "provider": "google", // or "facebook"
  "providerId": "google_user_id_123",
  "name": "John Doe",
  "email": "john@example.com",
  "profilePicture": "https://example.com/photo.jpg", // Optional
  "mobile": "+1234567890" // Optional
}
```

**Validation Rules:**
- `provider`: Must be "google" or "facebook"
- `providerId`: Required, not empty
- `name`: 2-100 characters, letters, spaces, hyphens, apostrophes, periods only
- `email`: Valid email format, max 255 characters
- `profilePicture`: Valid URL (optional)
- `mobile`: International format with country code (optional)

**Success Response (200):**
```json
{
  "message": "Social login successful",
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": 900,
  "user": {
    "id": 15,
    "name": "John Doe",
    "username": "johndoe",
    "email": "john@example.com",
    "mobile": "+1234567890",
    "role": "user",
    "is_verified": true
  }
}
```

---

### 4. Refresh Token

**Endpoint:** `POST /api/auth/refresh`

**Description:** Get new access token using refresh token

**Rate Limiting:** 3 requests per 15 minutes per IP

**Request Body:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Success Response (200):**
```json
{
  "message": "Token refreshed successfully",
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": 900
}
```

**Error Responses:**

**401 - Invalid Refresh Token:**
```json
{
  "error": "Invalid or expired refresh token"
}
```

---

### 5. Logout

**Endpoint:** `POST /api/auth/logout`

**Description:** Logout user and invalidate tokens

**Rate Limiting:** 3 requests per 15 minutes per IP

**Headers:**
```
Authorization: Bearer <access_token>
```

**Request Body:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Success Response (200):**
```json
{
  "message": "Logged out successfully"
}
```

---

### 6. Get User Profile

**Endpoint:** `GET /api/auth/profile`

**Description:** Get current user's profile information

**Authentication:** Required (Bearer token)

**Headers:**
```
Authorization: Bearer <access_token>
```

**Success Response (200):**
```json
{
  "user": {
    "id": 15,
    "name": "John Doe",
    "username": "johndoe",
    "email": "john@example.com",
    "mobile": "+1234567890",
    "role": "user",
    "is_verified": false,
    "created_at": "2025-09-18T10:00:00.000Z",
    "last_login_at": "2025-09-18T10:30:00.000Z"
  }
}
```

---

### 7. Update User Profile

**Endpoint:** `PUT /api/auth/profile`

**Description:** Update current user's profile information

**Authentication:** Required (Bearer token)

**Headers:**
```
Authorization: Bearer <access_token>
```

**Request Body:**
```json
{
  "name": "John Smith",
  "email": "johnsmith@example.com",
  "mobile": "+1987654321"
}
```

**Success Response (200):**
```json
{
  "message": "Profile updated successfully",
  "user": {
    "id": 15,
    "name": "John Smith",
    "username": "johndoe",
    "email": "johnsmith@example.com",
    "mobile": "+1987654321",
    "role": "user",
    "is_verified": false
  }
}
```

---

## 🔒 Security Features

### Rate Limiting
- **Authentication endpoints**: 5 requests per 15 minutes per IP
- **Refresh/Logout**: 3 requests per 15 minutes per IP
- **General API**: 100 requests per 15 minutes per IP

### Security Measures
- **Password hashing**: bcrypt with 12 salt rounds
- **JWT tokens**: Short-lived access tokens (15 minutes) + long-lived refresh tokens (30 days)
- **IP blocking**: Automatic blocking after multiple failed attempts
- **Email blocking**: Account-specific blocking
- **SQL injection prevention**: Input sanitization and validation
- **Security logging**: All authentication events are logged

### Token Management
- **Access Token**: 15 minutes expiry, used for API requests
- **Refresh Token**: 30 days expiry, used to get new access tokens
- **Token blacklisting**: Tokens can be revoked and blacklisted
- **Session tracking**: All sessions are tracked in database

---

## 📱 Mobile App Integration

### Example Login Flow

```javascript
// 1. Login
const loginResponse = await fetch('http://localhost:3000/api/auth/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'password123'
  })
});

const loginData = await loginResponse.json();

// 2. Store tokens securely
const { accessToken, refreshToken } = loginData;

// 3. Use access token for API requests
const profileResponse = await fetch('http://localhost:3000/api/auth/profile', {
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json'
  }
});

// 4. Refresh token when access token expires
const refreshResponse = await fetch('http://localhost:3000/api/auth/refresh', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    refreshToken: refreshToken
  })
});
```

### Error Handling

```javascript
try {
  const response = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(credentials)
  });

  if (!response.ok) {
    const errorData = await response.json();
    
    switch (response.status) {
      case 400:
        console.log('Validation error:', errorData.details);
        break;
      case 401:
        console.log('Invalid credentials');
        break;
      case 403:
        console.log('Access denied:', errorData.error);
        break;
      case 429:
        console.log('Rate limited, retry after:', errorData.retryAfter, 'seconds');
        break;
      default:
        console.log('Server error:', errorData.error);
    }
    return;
  }

  const data = await response.json();
  // Handle successful login
} catch (error) {
  console.error('Network error:', error);
}
```

---

## 🧪 Testing

### Test Credentials

After running the database migration, you can use these test credentials:

**Admin User:**
- Email: `admin@archivart.com`
- Password: `password`

**Regular Users:**
- Email: `john.smith@example.com`
- Password: `password`

### cURL Examples

**Register User:**
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "password": "TestPass123!",
    "mobile": "+1234567890"
  }'
```

**Login:**
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPass123!"
  }'
```

**Get Profile:**
```bash
curl -X GET http://localhost:3000/api/auth/profile \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

---

## 📋 Response Codes

| Code | Description |
|------|-------------|
| 200 | Success |
| 201 | Created (Registration) |
| 400 | Bad Request (Validation Error) |
| 401 | Unauthorized (Invalid Credentials) |
| 403 | Forbidden (Blocked IP/Email) |
| 429 | Too Many Requests (Rate Limited) |
| 500 | Internal Server Error |

---

## 🔧 Environment Variables

Make sure these environment variables are set in your `.env` file:

```env
JWT_SECRET=your_jwt_secret_key_here
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=archivart
NODE_ENV=development
```

---

## 📞 Support

For API support or questions:
- Check the server logs for detailed error information
- Verify your environment variables are correctly set
- Ensure the database migration has been run
- Check rate limiting if you're getting 429 errors
