from flask import Flask, request, jsonify
import cv2
import numpy as np
import os
import logging
import signal
import sys
import time
import threading
from typing import Optional, List, Dict, Any
from datetime import datetime
import psutil
import json
from ocr_service import ocr_service

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('opencv_service.log'),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

app = Flask(__name__)

# Configuration
class Config:
    def __init__(self):
        self.HOST = os.getenv('OPENCV_HOST', '0.0.0.0')
        self.PORT = int(os.getenv('OPENCV_PORT', 5001))
        self.DEBUG = os.getenv('OPENCV_DEBUG', 'false').lower() == 'true'
        self.ORB_FEATURES = int(os.getenv('ORB_FEATURES', 500))
        self.MAX_FILE_SIZE = int(os.getenv('MAX_FILE_SIZE', 50 * 1024 * 1024))  # 50MB
        self.REQUEST_TIMEOUT = int(os.getenv('REQUEST_TIMEOUT', 30))  # 30 seconds
        self.LOG_LEVEL = os.getenv('LOG_LEVEL', 'INFO')
        self.ENABLE_METRICS = os.getenv('ENABLE_METRICS', 'true').lower() == 'true'

config = Config()

# Initialize ORB detector with configurable features
orb = cv2.ORB_create(nfeatures=config.ORB_FEATURES)

# Metrics tracking
class Metrics:
    def __init__(self):
        self.requests_total = 0
        self.requests_success = 0
        self.requests_error = 0
        self.features_extracted = 0
        self.matches_performed = 0
        self.start_time = time.time()
        self.lock = threading.Lock()
    
    def increment_requests(self, success=True):
        with self.lock:
            self.requests_total += 1
            if success:
                self.requests_success += 1
            else:
                self.requests_error += 1
    
    def increment_features(self, count):
        with self.lock:
            self.features_extracted += count
    
    def increment_matches(self):
        with self.lock:
            self.matches_performed += 1
    
    def get_stats(self):
        with self.lock:
            uptime = time.time() - self.start_time
            return {
                'uptime_seconds': uptime,
                'requests_total': self.requests_total,
                'requests_success': self.requests_success,
                'requests_error': self.requests_error,
                'success_rate': self.requests_success / max(self.requests_total, 1),
                'features_extracted': self.features_extracted,
                'matches_performed': self.matches_performed,
                'memory_usage_mb': psutil.Process().memory_info().rss / 1024 / 1024,
                'cpu_percent': psutil.cpu_percent()
            }

metrics = Metrics() if config.ENABLE_METRICS else None

def extract_features(image_path: str) -> Optional[List[List[int]]]:
    """
    Extract ORB features from an image with enhanced error handling and logging
    """
    start_time = time.time()
    try:
        # Validate file exists and size
        if not os.path.exists(image_path):
            logger.error(f"Image file not found: {image_path}")
            return None
        
        file_size = os.path.getsize(image_path)
        if file_size > config.MAX_FILE_SIZE:
            logger.error(f"Image file too large: {file_size} bytes (max: {config.MAX_FILE_SIZE})")
            return None
        
        # Read image
        img = cv2.imread(image_path, cv2.IMREAD_GRAYSCALE)
        if img is None:
            logger.error(f"Could not read image from {image_path}")
            return None

        # Extract features
        keypoints, descriptors = orb.detectAndCompute(img, None)
        
        processing_time = time.time() - start_time
        
        if descriptors is not None:
            feature_count = len(descriptors)
            logger.info(f"Extracted {feature_count} features from {os.path.basename(image_path)} in {processing_time:.3f}s")
            
            if metrics:
                metrics.increment_features(feature_count)
            
            return descriptors.tolist()
        else:
            logger.warning(f"No features found in image: {image_path}")
            return None

    except Exception as e:
        logger.error(f"Error extracting features from {image_path}: {str(e)}", exc_info=True)
        return None

def match_features(query_desc: List[List[int]], stored_desc: List[List[int]]) -> Dict[str, Any]:
    """
    Match features using Lowe's ratio test and return normalized similarity.
    """
    start_time = time.time()
    try:
        query_desc = np.array(query_desc, dtype=np.uint8)
        stored_desc = np.array(stored_desc, dtype=np.uint8)

        if len(query_desc) < 2 or len(stored_desc) < 2:
            logger.warning("Not enough descriptors to compare")
            return {
                "success": False,
                "error": "Not enough descriptors to compare",
                "similarity": 0.0,
                "match_count": 0
            }

        bf = cv2.BFMatcher(cv2.NORM_HAMMING, crossCheck=False)
        matches = bf.knnMatch(query_desc, stored_desc, k=2)

        good_matches = []
        for m, n in matches:
            if m.distance < 0.75 * n.distance:  # Lowe's ratio test
                good_matches.append(m)

        similarity = len(good_matches) / max(len(query_desc), len(stored_desc))
        processing_time = time.time() - start_time
        
        logger.info(f"Feature matching completed: {len(good_matches)} matches, similarity: {similarity:.3f}, time: {processing_time:.3f}s")
        
        if metrics:
            metrics.increment_matches()

        return {
            "success": True,
            "similarity": float(similarity),
            "match_count": len(good_matches)
        }

    except Exception as e:
        logger.error(f"Error matching features: {str(e)}", exc_info=True)
        return {
            "success": False,
            "error": str(e),
            "similarity": 0.0,
            "match_count": 0
        }

@app.route('/health', methods=['GET'])
def health_check():
    """Enhanced health check endpoint with system information"""
    try:
        health_data = {
            "status": "healthy",
            "service": "opencv-feature-matching",
            "version": "2.0.0",
            "timestamp": datetime.utcnow().isoformat(),
            "opencv_version": cv2.__version__,
            "python_version": sys.version.split()[0],
            "config": {
                "orb_features": config.ORB_FEATURES,
                "max_file_size_mb": config.MAX_FILE_SIZE // (1024 * 1024),
                "request_timeout": config.REQUEST_TIMEOUT
            }
        }
        
        if metrics:
            health_data["metrics"] = metrics.get_stats()
        
        return jsonify(health_data)
    except Exception as e:
        logger.error(f"Health check failed: {str(e)}")
        return jsonify({
            "status": "unhealthy",
            "error": str(e),
            "timestamp": datetime.utcnow().isoformat()
        }), 500

@app.route('/metrics', methods=['GET'])
def get_metrics():
    """Get detailed service metrics"""
    if not metrics:
        return jsonify({"error": "Metrics disabled"}), 404
    
    try:
        return jsonify(metrics.get_stats())
    except Exception as e:
        logger.error(f"Metrics retrieval failed: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/info', methods=['GET'])
def get_info():
    """Get service information and configuration"""
    return jsonify({
        "service": "opencv-feature-matching",
        "version": "2.0.0",
        "description": "OpenCV-based image feature extraction and matching service",
        "endpoints": {
            "health": "GET /health",
            "metrics": "GET /metrics", 
            "info": "GET /info",
            "extract": "POST /extract",
            "match": "POST /match",
            "compare": "POST /compare",
            "ocr_extract": "POST /ocr/extract",
            "ocr_extract_with_boxes": "POST /ocr/extract-with-boxes",
            "ocr_languages": "GET /ocr/languages",
            "ocr_info": "GET /ocr/info"
        },
        "config": {
            "orb_features": config.ORB_FEATURES,
            "max_file_size_mb": config.MAX_FILE_SIZE // (1024 * 1024),
            "request_timeout": config.REQUEST_TIMEOUT,
            "debug_mode": config.DEBUG,
            "metrics_enabled": config.ENABLE_METRICS
        }
    })

@app.route('/extract', methods=['POST'])
def extract():
    """Extract ORB features from an image"""
    start_time = time.time()
    success = False
    
    try:
        data = request.get_json()
        if not data or 'image_path' not in data:
            logger.warning("Extract request missing image_path")
            return jsonify({"success": False, "error": "Missing image_path in request"}), 400

        image_path = data['image_path']
        logger.info(f"Feature extraction request for: {os.path.basename(image_path)}")
        
        descriptors = extract_features(image_path)
        if descriptors is None:
            logger.error(f"Feature extraction failed for: {image_path}")
            return jsonify({"success": False, "error": "No features could be extracted"}), 500

        processing_time = time.time() - start_time
        success = True
        
        logger.info(f"Feature extraction completed: {len(descriptors)} features in {processing_time:.3f}s")
        
        return jsonify({
            "success": True,
            "descriptors": descriptors,
            "feature_count": len(descriptors),
            "processing_time": processing_time
        })

    except Exception as e:
        logger.error(f"Extract endpoint error: {str(e)}", exc_info=True)
        return jsonify({"success": False, "error": f"Internal server error: {str(e)}"}), 500
    finally:
        if metrics:
            metrics.increment_requests(success)

@app.route('/match', methods=['POST'])
def match():
    """Match features between two descriptor sets"""
    start_time = time.time()
    success = False
    
    try:
        data = request.get_json()
        if not data or 'query_desc' not in data or 'stored_desc' not in data:
            logger.warning("Match request missing descriptors")
            return jsonify({"success": False, "error": "Missing query_desc or stored_desc"}), 400

        query_desc = data['query_desc']
        stored_desc = data['stored_desc']

        if not query_desc or not stored_desc:
            logger.warning("Empty descriptors provided")
            return jsonify({"success": False, "error": "Empty descriptors provided"}), 400

        logger.info(f"Feature matching request: {len(query_desc)} vs {len(stored_desc)} descriptors")
        
        result = match_features(query_desc, stored_desc)
        success = result.get('success', False)
        
        processing_time = time.time() - start_time
        result['processing_time'] = processing_time
        
        return jsonify(result)

    except Exception as e:
        logger.error(f"Match endpoint error: {str(e)}", exc_info=True)
        return jsonify({"success": False, "error": f"Internal server error: {str(e)}"}), 500
    finally:
        if metrics:
            metrics.increment_requests(success)

@app.route('/compare', methods=['POST'])
def compare():
    """Compare a query image against multiple stored descriptors"""
    start_time = time.time()
    success = False
    
    try:
        data = request.get_json()
        if not data or 'query_image_path' not in data or 'stored_descriptors' not in data:
            logger.warning("Compare request missing required fields")
            return jsonify({"success": False, "error": "Missing query_image_path or stored_descriptors"}), 400

        query_image_path = data['query_image_path']
        stored_descriptors = data['stored_descriptors']
        threshold = data.get('threshold', 0.2)  # similarity threshold (20%)

        logger.info(f"Image comparison request: {os.path.basename(query_image_path)} vs {len(stored_descriptors)} stored descriptors")

        query_desc = extract_features(query_image_path)
        if query_desc is None:
            logger.error(f"No features extracted from query image: {query_image_path}")
            return jsonify({"success": False, "error": "No features extracted from query image"}), 500

        best_match = None
        best_score = -1.0
        all_matches = []

        for stored in stored_descriptors:
            if 'id' not in stored or 'descriptors' not in stored:
                continue

            result = match_features(query_desc, stored['descriptors'])
            if result['success']:
                sim = result['similarity']
                all_matches.append({
                    "id": stored['id'],
                    "similarity": sim,
                    "match_count": result['match_count']
                })

                if sim > best_score:
                    best_score = sim
                    best_match = {
                        "id": stored['id'],
                        "similarity": sim,
                        "match_count": result['match_count']
                    }

        processing_time = time.time() - start_time
        success = True
        
        if best_match and best_score >= threshold:
            logger.info(f"Match found: ID {best_match['id']} with similarity {best_score:.3f} in {processing_time:.3f}s")
            return jsonify({
                "success": True,
                "best_match": best_match,
                "all_matches": all_matches,
                "threshold": threshold,
                "processing_time": processing_time
            })
        else:
            logger.info(f"No match found above threshold {threshold} in {processing_time:.3f}s")
            return jsonify({
                "success": True,
                "best_match": None,
                "all_matches": all_matches,
                "threshold": threshold,
                "message": "No match found above threshold",
                "processing_time": processing_time
            })

    except Exception as e:
        logger.error(f"Compare endpoint error: {str(e)}", exc_info=True)
        return jsonify({"success": False, "error": f"Internal server error: {str(e)}"}), 500
    finally:
        if metrics:
            metrics.increment_requests(success)

@app.route('/ocr/extract', methods=['POST'])
def ocr_extract():
    """Extract text from image using OCR"""
    start_time = time.time()
    success = False
    
    try:
        data = request.get_json()
        if not data or 'image_path' not in data:
            logger.warning("OCR extract request missing image_path")
            return jsonify({"success": False, "error": "Missing image_path in request"}), 400

        image_path = data['image_path']
        language = data.get('language', 'eng')
        preprocess = data.get('preprocess', True)
        config = data.get('config', None)
        
        logger.info(f"OCR text extraction request for: {os.path.basename(image_path)} (lang: {language})")
        
        result = ocr_service.extract_text(image_path, language, preprocess, config)
        success = result.get('success', False)
        
        processing_time = time.time() - start_time
        result['total_processing_time'] = processing_time
        
        if success:
            logger.info(f"OCR extraction completed: {result['character_count']} characters, confidence: {result['confidence']:.1f}%")
        else:
            logger.error(f"OCR extraction failed: {result.get('error', 'Unknown error')}")
        
        return jsonify(result)

    except Exception as e:
        logger.error(f"OCR extract endpoint error: {str(e)}", exc_info=True)
        return jsonify({"success": False, "error": f"Internal server error: {str(e)}"}), 500
    finally:
        if metrics:
            metrics.increment_requests(success)

@app.route('/ocr/extract-with-boxes', methods=['POST'])
def ocr_extract_with_boxes():
    """Extract text with bounding boxes from image using OCR"""
    start_time = time.time()
    success = False
    
    try:
        data = request.get_json()
        if not data or 'image_path' not in data:
            logger.warning("OCR extract-with-boxes request missing image_path")
            return jsonify({"success": False, "error": "Missing image_path in request"}), 400

        image_path = data['image_path']
        language = data.get('language', 'eng')
        preprocess = data.get('preprocess', True)
        config = data.get('config', None)
        
        logger.info(f"OCR text extraction with boxes request for: {os.path.basename(image_path)} (lang: {language})")
        
        result = ocr_service.extract_text_with_boxes(image_path, language, preprocess, config)
        success = result.get('success', False)
        
        processing_time = time.time() - start_time
        result['total_processing_time'] = processing_time
        
        if success:
            logger.info(f"OCR extraction with boxes completed: {len(result['boxes'])} text regions, {result['character_count']} characters")
        else:
            logger.error(f"OCR extraction with boxes failed: {result.get('error', 'Unknown error')}")
        
        return jsonify(result)

    except Exception as e:
        logger.error(f"OCR extract-with-boxes endpoint error: {str(e)}", exc_info=True)
        return jsonify({"success": False, "error": f"Internal server error: {str(e)}"}), 500
    finally:
        if metrics:
            metrics.increment_requests(success)

@app.route('/ocr/languages', methods=['GET'])
def ocr_languages():
    """Get supported OCR languages"""
    try:
        languages = ocr_service.get_supported_languages()
        return jsonify({
            "success": True,
            "languages": languages,
            "default_language": ocr_service.default_language
        })
    except Exception as e:
        logger.error(f"OCR languages endpoint error: {str(e)}", exc_info=True)
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/ocr/info', methods=['GET'])
def ocr_info():
    """Get OCR service information"""
    try:
        info = ocr_service.get_tesseract_info()
        return jsonify(info)
    except Exception as e:
        logger.error(f"OCR info endpoint error: {str(e)}", exc_info=True)
        return jsonify({"success": False, "error": str(e)}), 500

# Graceful shutdown handler
def signal_handler(signum, frame):
    logger.info(f"Received signal {signum}, shutting down gracefully...")
    sys.exit(0)

signal.signal(signal.SIGINT, signal_handler)
signal.signal(signal.SIGTERM, signal_handler)

if __name__ == "__main__":
    logger.info("🚀 Starting OpenCV Feature Matching Service v2.0.0...")
    logger.info(f"📡 Service running at: http://{config.HOST}:{config.PORT}")
    logger.info(f"🔧 Configuration:")
    logger.info(f"  - ORB Features: {config.ORB_FEATURES}")
    logger.info(f"  - Max File Size: {config.MAX_FILE_SIZE // (1024*1024)}MB")
    logger.info(f"  - Request Timeout: {config.REQUEST_TIMEOUT}s")
    logger.info(f"  - Debug Mode: {config.DEBUG}")
    logger.info(f"  - Metrics Enabled: {config.ENABLE_METRICS}")
    logger.info(f"🔍 Available Endpoints:")
    logger.info(f"  - GET  /health - Health check with system info")
    logger.info(f"  - GET  /metrics - Service metrics")
    logger.info(f"  - GET  /info - Service information")
    logger.info(f"  - POST /extract - Extract features from image")
    logger.info(f"  - POST /match - Match two descriptor sets")
    logger.info(f"  - POST /compare - Compare image against stored descriptors")
    logger.info(f"  - POST /ocr/extract - Extract text from image using OCR")
    logger.info(f"  - POST /ocr/extract-with-boxes - Extract text with bounding boxes")
    logger.info(f"  - GET  /ocr/languages - Get supported OCR languages")
    logger.info(f"  - GET  /ocr/info - Get OCR service information")
    logger.info(f"📊 OpenCV Version: {cv2.__version__}")
    logger.info(f"🐍 Python Version: {sys.version.split()[0]}")
    logger.info("=" * 60)

    try:
        app.run(
            host=config.HOST,
            port=config.PORT,
            debug=config.DEBUG,
            threaded=True,
            use_reloader=False  # Disable reloader in production
        )
    except Exception as e:
        logger.error(f"Failed to start service: {str(e)}", exc_info=True)
        sys.exit(1)
