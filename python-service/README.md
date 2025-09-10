# OpenCV Feature Matching Service v2.0.0

A production-ready Python microservice for image feature extraction and matching using OpenCV's ORB (Oriented FAST and Rotated BRIEF) algorithm.

## 🚀 Features

- **High-Performance Feature Extraction**: Extract ORB features from images with configurable parameters
- **Advanced Feature Matching**: Compare features between images using Lowe's ratio test
- **Batch Image Comparison**: Compare a query image against multiple stored descriptors
- **Production-Ready**: Comprehensive logging, metrics, health checks, and graceful shutdown
- **RESTful API**: Simple HTTP endpoints for all operations
- **Docker Support**: Containerized deployment with Docker and Docker Compose
- **Monitoring**: Built-in metrics and health monitoring
- **Configurable**: Environment-based configuration for different deployment scenarios

## 📡 API Endpoints

### Health & Monitoring
- **GET** `/health` - Enhanced health check with system information
- **GET** `/metrics` - Detailed service metrics and performance data
- **GET** `/info` - Service information and configuration

### Core Operations
- **POST** `/extract` - Extract ORB features from an image
- **POST** `/match` - Match features between two descriptor sets
- **POST** `/compare` - Compare a query image against stored descriptors

## 🛠️ Installation & Setup

### Development Mode

1. **Install Python 3.8+**
2. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```
3. **Run the service**:
   ```bash
   python app.py
   ```

### Production Mode

#### Option 1: Direct Production Setup
```bash
# Start production service
./start-production.sh

# Check status
./status-production.sh

# Stop service
./stop-production.sh
```

#### Option 2: Docker Deployment
```bash
# Build and run with Docker Compose
docker-compose up -d

# Check logs
docker-compose logs -f

# Stop service
docker-compose down
```

#### Option 3: Manual Gunicorn
```bash
# Activate virtual environment
source venv/bin/activate

# Start with Gunicorn
gunicorn --config gunicorn.conf.py app:app
```

## ⚙️ Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `OPENCV_HOST` | `0.0.0.0` | Server host address |
| `OPENCV_PORT` | `5001` | Server port |
| `OPENCV_DEBUG` | `false` | Debug mode |
| `ORB_FEATURES` | `500` | Number of ORB features to extract |
| `MAX_FILE_SIZE` | `52428800` | Maximum file size (50MB) |
| `REQUEST_TIMEOUT` | `30` | Request timeout in seconds |
| `LOG_LEVEL` | `INFO` | Logging level |
| `ENABLE_METRICS` | `true` | Enable metrics collection |

### Configuration File
Copy `env.example` to `.env` and customize:
```bash
cp env.example .env
```

## 📊 Monitoring & Metrics

### Health Check
```bash
curl http://localhost:5001/health
```

### Metrics
```bash
curl http://localhost:5001/metrics
```

### Service Information
```bash
curl http://localhost:5001/info
```

## 🐳 Docker Deployment

### Build Image
```bash
docker build -t opencv-feature-matching .
```

### Run Container
```bash
docker run -d \
  --name opencv-service \
  -p 5001:5001 \
  -e OPENCV_DEBUG=false \
  -e ENABLE_METRICS=true \
  opencv-feature-matching
```

### Docker Compose
```bash
# Start services
docker-compose up -d

# View logs
docker-compose logs -f opencv-service

# Scale service
docker-compose up -d --scale opencv-service=3
```

## 🔧 Production Features

### Logging
- **Structured Logging**: JSON-formatted logs with timestamps
- **Log Rotation**: Automatic log file management
- **Multiple Levels**: DEBUG, INFO, WARNING, ERROR, CRITICAL

### Performance
- **Multi-Worker**: Gunicorn with multiple worker processes
- **Connection Pooling**: Efficient request handling
- **Memory Management**: Automatic worker recycling
- **Caching**: Optimized OpenCV operations

### Security
- **Non-Root User**: Container runs as non-privileged user
- **Input Validation**: Comprehensive request validation
- **File Size Limits**: Configurable file size restrictions
- **Timeout Protection**: Request timeout handling

### Monitoring
- **Health Checks**: Comprehensive health monitoring
- **Metrics Collection**: Performance and usage metrics
- **System Information**: CPU, memory, and process stats
- **Graceful Shutdown**: Proper signal handling

## 📈 Performance Tuning

### Gunicorn Configuration
- **Workers**: Set to `2 * CPU cores + 1`
- **Worker Class**: `sync` for CPU-bound tasks
- **Max Requests**: 1000 requests per worker
- **Timeout**: 30 seconds for image processing

### OpenCV Optimization
- **Feature Count**: Adjust `ORB_FEATURES` based on needs
- **Image Size**: Limit `MAX_FILE_SIZE` for performance
- **Memory**: Use shared memory for temporary files

## 🚨 Troubleshooting

### Common Issues

1. **Service Won't Start**
   ```bash
   # Check logs
   tail -f logs/opencv_service.log
   
   # Verify dependencies
   python -c "import cv2; print(cv2.__version__)"
   ```

2. **High Memory Usage**
   ```bash
   # Reduce ORB features
   export ORB_FEATURES=250
   
   # Restart service
   ./stop-production.sh && ./start-production.sh
   ```

3. **Slow Performance**
   ```bash
   # Increase workers
   export GUNICORN_WORKERS=8
   
   # Check system resources
   ./status-production.sh
   ```

### Log Analysis
```bash
# View recent errors
grep "ERROR" logs/opencv_service.log | tail -20

# Monitor real-time logs
tail -f logs/opencv_service.log

# Check metrics
curl -s http://localhost:5001/metrics | jq
```

## 🔄 Integration

This service is designed to work with the ArchivArt Node.js application for:
- **Image Duplicate Detection**: Prevent duplicate media uploads
- **Content Matching**: Find similar images in the database
- **Mobile API**: Support mobile app image recognition

## 📝 API Examples

### Extract Features
```bash
curl -X POST http://localhost:5001/extract \
  -H "Content-Type: application/json" \
  -d '{"image_path": "/path/to/image.jpg"}'
```

### Compare Images
```bash
curl -X POST http://localhost:5001/compare \
  -H "Content-Type: application/json" \
  -d '{
    "query_image_path": "/path/to/query.jpg",
    "stored_descriptors": [
      {"id": 1, "descriptors": [[...]]}
    ],
    "threshold": 0.5
  }'
```

## 📄 License

This service is part of the ArchivArt project and follows the same licensing terms.