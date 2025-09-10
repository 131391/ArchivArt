# 📡 ArchivArt API - Curl Commands Reference

## 🌐 Base URLs
- **Production**: `https://archivart.onrender.com`
- **Local Development**: `http://localhost:3000`

---

## 🔐 Authentication APIs

### 1. User Registration
```bash
curl -X POST https://archivart.onrender.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "password": "password123",
    "role": "user"
  }'
```

### 2. User Login
```bash
curl -X POST https://archivart.onrender.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "password123"
  }'
```

### 3. Social Login (Google/Facebook)
```bash
curl -X POST https://archivart.onrender.com/api/auth/social-login \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "google",
    "providerId": "google_user_id_123",
    "name": "John Doe",
    "email": "john@example.com"
  }'
```

### 4. Get User Profile
```bash
curl -X GET https://archivart.onrender.com/api/auth/profile \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 5. Update User Profile
```bash
curl -X PUT https://archivart.onrender.com/api/auth/profile \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Smith",
    "email": "johnsmith@example.com"
  }'
```

---

## 📸 Media APIs

### 6. Match Scanning Image (Upload File)
```bash
curl -X POST https://archivart.onrender.com/api/media/match \
  -F "image=@/path/to/your/image.jpg" \
  -F "threshold=5"
```

### 7. Match Scanning Image (JSON Hash)
```bash
curl -X POST https://archivart.onrender.com/api/media/match \
  -H "Content-Type: application/json" \
  -d '{
    "hash": "a1b2c3d4e5f6...",
    "threshold": 5
  }'
```

### 8. Get Media by ID
```bash
curl -X GET https://archivart.onrender.com/api/media/123
```

### 9. Get All Active Media
```bash
curl -X GET https://archivart.onrender.com/api/media
```

---

## 🛠️ Admin APIs (Require Authentication)

### 10. Admin Login (Web)
```bash
curl -X POST https://archivart.onrender.com/admin/login \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "email=admin@example.com&password=admin123"
```

### 11. Get Users Data
```bash
curl -X GET https://archivart.onrender.com/admin/users/data \
  -H "Cookie: connect.sid=YOUR_SESSION_COOKIE"
```

### 12. Get Single User
```bash
curl -X GET https://archivart.onrender.com/admin/users/123 \
  -H "Cookie: connect.sid=YOUR_SESSION_COOKIE"
```

### 13. Update User
```bash
curl -X PUT https://archivart.onrender.com/admin/users/123 \
  -H "Cookie: connect.sid=YOUR_SESSION_COOKIE" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Updated Name",
    "email": "updated@example.com",
    "role": "admin"
  }'
```

### 14. Block User
```bash
curl -X POST https://archivart.onrender.com/admin/users/123/block \
  -H "Cookie: connect.sid=YOUR_SESSION_COOKIE"
```

### 15. Unblock User
```bash
curl -X POST https://archivart.onrender.com/admin/users/123/unblock \
  -H "Cookie: connect.sid=YOUR_SESSION_COOKIE"
```

### 16. Delete User
```bash
curl -X DELETE https://archivart.onrender.com/admin/users/123 \
  -H "Cookie: connect.sid=YOUR_SESSION_COOKIE"
```

---

## 📁 Media Management APIs (Admin)

### 17. Get Media Data
```bash
curl -X GET https://archivart.onrender.com/admin/media/data \
  -H "Cookie: connect.sid=YOUR_SESSION_COOKIE"
```

### 18. Upload Media
```bash
curl -X POST https://archivart.onrender.com/admin/media/upload \
  -H "Cookie: connect.sid=YOUR_SESSION_COOKIE" \
  -F "title=My Image" \
  -F "description=Image description" \
  -F "category=artwork" \
  -F "tags=art,digital" \
  -F "image=@/path/to/image.jpg"
```

### 19. Get Single Media
```bash
curl -X GET https://archivart.onrender.com/admin/media/123 \
  -H "Cookie: connect.sid=YOUR_SESSION_COOKIE"
```

### 20. Update Media
```bash
curl -X PUT https://archivart.onrender.com/admin/media/123 \
  -H "Cookie: connect.sid=YOUR_SESSION_COOKIE" \
  -F "title=Updated Title" \
  -F "description=Updated description" \
  -F "category=photography" \
  -F "tags=photo,updated" \
  -F "image=@/path/to/new-image.jpg"
```

### 21. Toggle Media Status
```bash
curl -X PATCH https://archivart.onrender.com/admin/media/123/toggle \
  -H "Cookie: connect.sid=YOUR_SESSION_COOKIE"
```

### 22. Delete Media
```bash
curl -X DELETE https://archivart.onrender.com/admin/media/123 \
  -H "Cookie: connect.sid=YOUR_SESSION_COOKIE"
```

---

## ⚙️ System APIs

### 23. Health Check
```bash
curl -X GET https://archivart.onrender.com/health
```

### 24. API Documentation
```bash
curl -X GET https://archivart.onrender.com/api-docs
```

### 25. Admin Dashboard
```bash
curl -X GET https://archivart.onrender.com/admin/dashboard \
  -H "Cookie: connect.sid=YOUR_SESSION_COOKIE"
```

### 26. Admin Settings
```bash
curl -X GET https://archivart.onrender.com/admin/settings \
  -H "Cookie: connect.sid=YOUR_SESSION_COOKIE"
```

### 27. Update Settings
```bash
curl -X POST https://archivart.onrender.com/admin/settings \
  -H "Cookie: connect.sid=YOUR_SESSION_COOKIE" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "max_file_size=50&max_uploads_per_day=100&duplicate_threshold=5"
```

---

## 🔍 Python OpenCV Service APIs (Internal)

### 28. OpenCV Health Check
```bash
# Note: This is internal only, not accessible externally
curl -X GET http://127.0.0.1:5001/health
```

### 29. Extract Features
```bash
# Note: This is internal only, not accessible externally
curl -X POST http://127.0.0.1:5001/extract \
  -F "image=@/path/to/image.jpg"
```

### 30. Compare Images
```bash
# Note: This is internal only, not accessible externally
curl -X POST http://127.0.0.1:5001/compare \
  -H "Content-Type: application/json" \
  -d '{
    "query_image_path": "/path/to/query.jpg",
    "stored_descriptors": [...],
    "threshold": 0.5
  }'
```

---

## 📝 Notes

### Authentication Methods:
1. **JWT Token**: For API endpoints (`/api/*`)
2. **Session Cookie**: For admin web endpoints (`/admin/*`)

### File Upload:
- Use `multipart/form-data` for file uploads
- Maximum file size: 50MB (configurable)
- Supported formats: JPG, PNG, GIF, WebP

### Error Responses:
```json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": "Additional details"
}
```

### Success Responses:
```json
{
  "success": true,
  "data": {...},
  "message": "Success message"
}
```

---

## 🧪 Testing Examples

### Test Health Check:
```bash
curl -s https://archivart.onrender.com/health | jq .
```

### Test Image Upload:
```bash
curl -X POST https://archivart.onrender.com/api/media/match \
  -F "image=@test-image.jpg" \
  -F "threshold=5" \
  -v
```

### Test Authentication:
```bash
# Login and get token
TOKEN=$(curl -s -X POST https://archivart.onrender.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}' | jq -r '.token')

# Use token for authenticated request
curl -X GET https://archivart.onrender.com/api/auth/profile \
  -H "Authorization: Bearer $TOKEN"
```
