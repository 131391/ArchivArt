# Mobile API Documentation

This document describes the public API endpoints for mobile applications to interact with the ArchivArt system.

## Base URL
```
http://localhost:3000/api
```

## Authentication
Currently, the media endpoints are public and do not require authentication. This may change in future versions.

## Endpoints

### 1. Get All Active Media
**GET** `/api/media`

Retrieves all active media items with pagination support.

#### Query Parameters
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20, max: 100)
- `media_type` (optional): Filter by media type ('image', 'video', 'audio')

#### Response
```json
{
  "success": true,
  "media": [
    {
      "id": 1,
      "title": "Sample Media",
      "description": "Media description",
      "media_type": "video",
      "scanning_image": "filename.png",
      "file_path": "filename.mp4",
      "file_size": 1024000,
      "mime_type": "video/mp4",
      "created_at": "2024-01-01T00:00:00.000Z",
      "scanning_image_url": "http://localhost:3000/uploads/media/filename.png",
      "file_url": "http://localhost:3000/uploads/media/filename.mp4"
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 5,
    "totalItems": 100,
    "hasNext": true,
    "hasPrev": false
  }
}
```

### 2. Get Specific Media
**GET** `/api/media/:id`

Retrieves a specific media item by ID.

#### Path Parameters
- `id`: Media ID

#### Response
```json
{
  "success": true,
  "media": {
    "id": 1,
    "title": "Sample Media",
    "description": "Media description",
    "media_type": "video",
    "scanning_image": "filename.png",
    "file_path": "filename.mp4",
    "file_size": 1024000,
    "mime_type": "video/mp4",
    "is_active": true,
    "created_at": "2024-01-01T00:00:00.000Z",
    "updated_at": "2024-01-01T00:00:00.000Z"
  }
}
```

### 3. Match Scanning Image
**POST** `/api/media/match`

Matches an uploaded image against existing media using OpenCV feature matching.

#### Request
- **Content-Type**: `multipart/form-data`
- **Body**:
  - `image` (file): Image file to match
  - `threshold` (optional): Match threshold (default: 50, range: 0-100)

#### Response (Match Found)
```json
{
  "success": true,
  "message": "Match found",
  "match": {
    "id": 1,
    "title": "Matched Media",
    "description": "Media description",
    "media_type": "video",
    "scanning_image": "filename.png",
    "file_path": "filename.mp4",
    "is_active": true,
    "created_at": "2024-01-01T00:00:00.000Z",
    "similarity": {
      "score": 0.95,
      "matchCount": 450,
      "threshold": 50,
      "service": "python-opencv",
      "description": "Very High"
    }
  },
  "service": "python-opencv"
}
```

#### Response (No Match Found)
```json
{
  "success": true,
  "message": "No matching media found",
  "matches": [],
  "service": "python-opencv"
}
```

#### Response (Error)
```json
{
  "success": false,
  "message": "Image file is required. Please upload an image file."
}
```

## Error Responses

All endpoints may return the following error responses:

### 400 Bad Request
```json
{
  "success": false,
  "message": "Error description"
}
```

### 404 Not Found
```json
{
  "success": false,
  "message": "Media not found"
}
```

### 500 Internal Server Error
```json
{
  "success": false,
  "message": "Server error description"
}
```

### 503 Service Unavailable
```json
{
  "success": false,
  "message": "Image processing service is temporarily unavailable. Please try again later."
}
```

## Image Processing Services

The system uses a smart image processing service that automatically selects the best available service:

1. **Python OpenCV** (Primary): High-accuracy feature matching using ORB descriptors
2. **Node.js OpenCV** (Secondary): Alternative OpenCV implementation
3. **Fallback** (Tertiary): Basic image processing when OpenCV is unavailable

The response includes the `service` field indicating which service was used for processing.

## Similarity Scoring

The similarity score ranges from 0.0 to 1.0:
- **0.8-1.0**: Very High similarity
- **0.6-0.8**: High similarity  
- **0.4-0.6**: Medium similarity
- **0.0-0.4**: Low similarity

## Example Usage

### JavaScript/React Native
```javascript
// Get all active media
const response = await fetch('http://localhost:3000/api/media');
const data = await response.json();

// Match an image
const formData = new FormData();
formData.append('image', {
  uri: 'file://path/to/image.jpg',
  type: 'image/jpeg',
  name: 'image.jpg'
});
formData.append('threshold', '50');

const matchResponse = await fetch('http://localhost:3000/api/media/match', {
  method: 'POST',
  body: formData,
  headers: {
    'Content-Type': 'multipart/form-data',
  },
});
const matchData = await matchResponse.json();
```

### cURL
```bash
# Get all media
curl -X GET "http://localhost:3000/api/media"

# Match image
curl -X POST "http://localhost:3000/api/media/match" \
  -F "image=@/path/to/image.jpg" \
  -F "threshold=50"
```

## Rate Limiting

Currently, there are no rate limits implemented. This may be added in future versions.

## CORS

The API supports CORS for cross-origin requests from mobile applications.
