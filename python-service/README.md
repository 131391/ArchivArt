# OpenCV Feature Matching Microservice

This Python microservice provides OpenCV-based feature matching capabilities for the ArchivArt application. It replaces perceptual hashing with more robust ORB (Oriented FAST and Rotated BRIEF) feature detection and matching.

## Features

- **ORB Feature Extraction**: Extract keypoints and descriptors from images
- **Feature Matching**: Compare images using BFMatcher with Hamming distance
- **Duplicate Detection**: Identify similar/duplicate images during upload
- **Scan Matching**: Match scanned images against stored media
- **RESTful API**: Clean HTTP endpoints for integration with Node.js backend

## Installation

1. **Install Python Dependencies**:
   ```bash
   cd python-service
   pip install -r requirements.txt
   ```

2. **Start the Service**:
   ```bash
   python app.py
   ```

The service will run on `http://localhost:5001`

## API Endpoints

### Health Check
- **GET** `/health` - Service health status

### Feature Extraction
- **POST** `/extract` - Extract ORB features from an image
  ```json
  {
    "image_path": "/path/to/image.jpg"
  }
  ```

### Feature Matching
- **POST** `/match` - Match two descriptor sets
  ```json
  {
    "query_desc": [[...], [...], ...],
    "stored_desc": [[...], [...], ...]
  }
  ```

### Image Comparison
- **POST** `/compare` - Compare query image against multiple stored descriptors
  ```json
  {
    "query_image_path": "/path/to/query.jpg",
    "stored_descriptors": [
      {
        "id": "media_id_1",
        "descriptors": [[...], [...], ...]
      }
    ],
    "threshold": 50
  }
  ```

## Integration with Node.js

The Node.js backend communicates with this service via HTTP requests:

1. **Media Upload**: Extract features and check for duplicates
2. **Scan Matching**: Match scanned images against stored media
3. **Duplicate Detection**: Prevent duplicate image uploads

## Configuration

- **Port**: 5001 (configurable in app.py)
- **ORB Features**: 2000 keypoints (configurable)
- **Match Threshold**: 50 (configurable per request)
- **Host**: 0.0.0.0 (accessible from other services)

## Error Handling

The service includes comprehensive error handling:
- File not found errors
- Feature extraction failures
- Invalid descriptor formats
- Network communication errors

## Performance

- **Feature Extraction**: ~100-500ms per image (depending on size)
- **Feature Matching**: ~10-50ms per comparison
- **Memory Usage**: ~50-100MB (depending on image count)
- **Concurrent Requests**: Supports multiple simultaneous requests

## Development

To run in development mode:
```bash
export FLASK_ENV=development
python app.py
```

## Production Deployment

For production deployment:
1. Use a WSGI server like Gunicorn
2. Set up proper logging
3. Configure reverse proxy (nginx)
4. Set up monitoring and health checks
