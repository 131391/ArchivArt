# OCR Integration with Tesseract

This document describes the OCR (Optical Character Recognition) integration added to the Python microservice using Tesseract OCR.

## Overview

The OCR functionality has been integrated into the existing OpenCV Python microservice, providing text extraction capabilities from images using the open-source Tesseract OCR engine.

## Features

- **Text Extraction**: Extract text from images with confidence scores
- **Bounding Box Detection**: Get text regions with their positions and dimensions
- **Multi-language Support**: Support for 10+ languages including English, French, German, Spanish, etc.
- **Image Preprocessing**: Automatic image enhancement for better OCR results
- **Configurable Options**: Customizable Tesseract configuration and language settings

## API Endpoints

### 1. OCR Text Extraction (File Path)
```
POST /ocr/extract
```

**Request Body:**
```json
{
  "image_path": "/path/to/image.jpg",
  "language": "eng",
  "preprocess": true,
  "config": "--oem 3 --psm 6"
}
```

**Response:**
```json
{
  "success": true,
  "text": "Extracted text content",
  "confidence": 85.5,
  "language": "eng",
  "word_count": 10,
  "character_count": 50,
  "processing_time": 1.234,
  "total_processing_time": 1.456
}
```

### 2. OCR Text Extraction (File Upload)
```
POST /ocr/upload-extract
```

**Request:** Multipart form data
- `image`: Image file (required)
- `language`: Language code (optional, default: 'eng')
- `preprocess`: Boolean (optional, default: true)
- `config`: Custom Tesseract config (optional)

**Response:**
```json
{
  "success": true,
  "text": "Extracted text content",
  "confidence": 85.5,
  "language": "eng",
  "word_count": 10,
  "character_count": 50,
  "processing_time": 1.234,
  "total_processing_time": 1.456,
  "original_filename": "uploaded_image.jpg"
}
```

### 3. OCR Text Extraction with Bounding Boxes (File Path)
```
POST /ocr/extract-with-boxes
```

**Request Body:**
```json
{
  "image_path": "/path/to/image.jpg",
  "language": "eng",
  "preprocess": true
}
```

**Response:**
```json
{
  "success": true,
  "text": "Extracted text content",
  "boxes": [
    {
      "text": "Hello",
      "confidence": 95,
      "left": 10,
      "top": 20,
      "width": 50,
      "height": 25
    }
  ],
  "language": "eng",
  "word_count": 10,
  "character_count": 50,
  "processing_time": 1.234
}
```

### 4. OCR Text Extraction with Bounding Boxes (File Upload)
```
POST /ocr/upload-extract-with-boxes
```

**Request:** Multipart form data
- `image`: Image file (required)
- `language`: Language code (optional, default: 'eng')
- `preprocess`: Boolean (optional, default: true)
- `config`: Custom Tesseract config (optional)

**Response:**
```json
{
  "success": true,
  "text": "Extracted text content",
  "boxes": [
    {
      "text": "Hello",
      "confidence": 95,
      "left": 10,
      "top": 20,
      "width": 50,
      "height": 25
    }
  ],
  "language": "eng",
  "word_count": 10,
  "character_count": 50,
  "processing_time": 1.234,
  "original_filename": "uploaded_image.jpg"
}
```

### 5. Get Supported Languages
```
GET /ocr/languages
```

**Response:**
```json
{
  "success": true,
  "languages": ["eng", "fra", "deu", "spa", "ita", "por", "rus", "ara", "chi_sim", "chi_tra"],
  "default_language": "eng"
}
```

### 6. Get OCR Service Information
```
GET /ocr/info
```

**Response:**
```json
{
  "success": true,
  "version": "5.0.0",
  "supported_languages": ["eng", "fra", "deu", ...],
  "default_language": "eng",
  "default_config": "--oem 3 --psm 6"
}
```

## Node.js Integration

A Node.js service (`src/services/ocrService.js`) has been created to interface with the Python OCR endpoints:

```javascript
const ocrService = require('./services/ocrService');

// Extract text from image file path
const result = await ocrService.extractText('/path/to/image.jpg', {
  language: 'eng',
  preprocess: true
});

// Extract text from uploaded file
const uploadResult = await ocrService.extractTextFromUpload(fileBuffer, 'image.jpg', {
  language: 'eng',
  preprocess: true
});

// Extract text with bounding boxes from upload
const boxesResult = await ocrService.extractTextWithBoxesFromUpload(fileBuffer, 'image.jpg');

// Search for specific text
const searchResult = await ocrService.searchTextInImage('/path/to/image.jpg', 'search term');

// Extract from multiple images
const results = await ocrService.extractTextFromMultiple(['/path1.jpg', '/path2.jpg']);
```

## Supported Languages

- **eng**: English
- **fra**: French
- **deu**: German
- **spa**: Spanish
- **ita**: Italian
- **por**: Portuguese
- **rus**: Russian
- **ara**: Arabic
- **chi_sim**: Chinese (Simplified)
- **chi_tra**: Chinese (Traditional)

## Installation

### Docker (Recommended)

The Dockerfile has been updated to include Tesseract OCR and language packs:

```bash
# Build the Docker image
docker build -t archivart-opencv-ocr .

# Run the container
docker run -p 5001:5001 archivart-opencv-ocr
```

### Manual Installation

1. Install Tesseract OCR:
```bash
# Ubuntu/Debian
sudo apt-get install tesseract-ocr tesseract-ocr-eng tesseract-ocr-fra

# macOS
brew install tesseract tesseract-lang

# Windows
# Download from: https://github.com/UB-Mannheim/tesseract/wiki
```

2. Install Python dependencies:
```bash
pip install -r requirements.txt
```

## Configuration

### Environment Variables

- `OPENCV_HOST`: Service host (default: 0.0.0.0)
- `OPENCV_PORT`: Service port (default: 5001)
- `OPENCV_DEBUG`: Debug mode (default: false)
- `ENABLE_METRICS`: Enable metrics collection (default: true)

### Tesseract Configuration

The service uses the following default Tesseract configuration:
- `--oem 3`: OCR Engine Mode 3 (Default, based on what is available)
- `--psm 6`: Page Segmentation Mode 6 (Uniform block of text)

You can override this by passing a custom `config` parameter in API requests.

## Testing

Run the test script to verify OCR functionality:

```bash
# Make sure the Python service is running
python test_ocr.py
```

The test script will:
1. Check service health
2. Verify OCR info and supported languages
3. Create a test image with text
4. Test text extraction
5. Test text extraction with bounding boxes

## Performance Considerations

- **Image Preprocessing**: Enabled by default, improves accuracy but adds processing time
- **Language Selection**: Use specific language codes for better accuracy
- **Image Quality**: Higher resolution and contrast images produce better results
- **Timeout**: OCR requests have a 60-second timeout (longer than feature matching)

## Error Handling

The service provides comprehensive error handling:

- File not found errors
- Invalid image format errors
- Tesseract processing errors
- Network timeout errors

All errors are logged and returned in a structured format with the `success: false` flag.

## Integration with ArchivArt

The OCR functionality integrates seamlessly with the existing ArchivArt application:

1. **Media Upload**: Extract text from uploaded images for search indexing
2. **Document Processing**: Process scanned documents and extract metadata
3. **Search Enhancement**: Enable text-based search within images
4. **Content Analysis**: Analyze image content for categorization

## Future Enhancements

Potential improvements for future versions:

- **Batch Processing**: Process multiple images in a single request
- **Custom Training**: Support for custom Tesseract models
- **Advanced Preprocessing**: More sophisticated image enhancement options
- **Caching**: Cache OCR results for frequently accessed images
- **Webhook Support**: Asynchronous processing with webhook notifications
