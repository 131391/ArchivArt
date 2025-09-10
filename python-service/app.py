from flask import Flask, request, jsonify
import cv2
import numpy as np
import base64
import os
import json
from typing import Optional, List, Dict, Any

app = Flask(__name__)

# Initialize ORB detector
orb = cv2.ORB_create(nfeatures=2000)

def extract_features(image_path: str) -> Optional[List[List[int]]]:
    """
    Extract ORB features from an image
    
    Args:
        image_path: Path to the image file
        
    Returns:
        List of descriptors or None if extraction fails
    """
    try:
        # Read image in grayscale
        img = cv2.imread(image_path, cv2.IMREAD_GRAYSCALE)
        if img is None:
            print(f"Error: Could not read image from {image_path}")
            return None
            
        # Extract keypoints and descriptors
        keypoints, descriptors = orb.detectAndCompute(img, None)
        
        if descriptors is not None:
            # Convert numpy array to list for JSON serialization
            return descriptors.tolist()
        else:
            print(f"No features found in image: {image_path}")
            return None
            
    except Exception as e:
        print(f"Error extracting features from {image_path}: {str(e)}")
        return None

def match_features(query_desc: List[List[int]], stored_desc: List[List[int]]) -> Dict[str, Any]:
    """
    Match features between query and stored descriptors
    
    Args:
        query_desc: Query image descriptors
        stored_desc: Stored image descriptors
        
    Returns:
        Dictionary with match results
    """
    try:
        # Convert lists back to numpy arrays
        query_desc = np.array(query_desc, dtype=np.uint8)
        stored_desc = np.array(stored_desc, dtype=np.uint8)
        
        # Create BFMatcher
        bf = cv2.BFMatcher(cv2.NORM_HAMMING, crossCheck=True)
        
        # Find matches
        matches = bf.match(query_desc, stored_desc)
        matches = sorted(matches, key=lambda x: x.distance)
        
        # Calculate match score (lower is better)
        if matches:
            # Use average distance as score
            score = sum([m.distance for m in matches]) / len(matches)
            match_count = len(matches)
        else:
            score = 9999
            match_count = 0
            
        return {
            "success": True,
            "score": float(score),
            "match_count": match_count,
            "matches": len(matches)
        }
        
    except Exception as e:
        print(f"Error matching features: {str(e)}")
        return {
            "success": False,
            "error": str(e),
            "score": 9999,
            "match_count": 0
        }

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        "status": "healthy",
        "service": "opencv-feature-matching",
        "version": "1.0.0"
    })

@app.route('/extract', methods=['POST'])
def extract():
    """
    Extract ORB features from an image
    
    Expected JSON:
    {
        "image_path": "/path/to/image.jpg"
    }
    
    Returns:
    {
        "success": true/false,
        "descriptors": [[...], [...], ...] or null,
        "error": "error message" (if success is false)
    }
    """
    try:
        data = request.get_json()
        if not data or 'image_path' not in data:
            return jsonify({
                "success": False,
                "error": "Missing image_path in request"
            }), 400
            
        image_path = data['image_path']
        
        # Check if file exists
        if not os.path.exists(image_path):
            return jsonify({
                "success": False,
                "error": f"Image file not found: {image_path}"
            }), 404
            
        # Extract features
        descriptors = extract_features(image_path)
        
        if descriptors is None:
            return jsonify({
                "success": False,
                "error": "No features could be extracted from the image"
            }), 500
            
        return jsonify({
            "success": True,
            "descriptors": descriptors,
            "feature_count": len(descriptors)
        })
        
    except Exception as e:
        return jsonify({
            "success": False,
            "error": f"Internal server error: {str(e)}"
        }), 500

@app.route('/match', methods=['POST'])
def match():
    """
    Match features between query and stored descriptors
    
    Expected JSON:
    {
        "query_desc": [[...], [...], ...],
        "stored_desc": [[...], [...], ...]
    }
    
    Returns:
    {
        "success": true/false,
        "score": float,
        "match_count": int,
        "matches": int
    }
    """
    try:
        data = request.get_json()
        if not data or 'query_desc' not in data or 'stored_desc' not in data:
            return jsonify({
                "success": False,
                "error": "Missing query_desc or stored_desc in request"
            }), 400
            
        query_desc = data['query_desc']
        stored_desc = data['stored_desc']
        
        # Validate descriptors
        if not query_desc or not stored_desc:
            return jsonify({
                "success": False,
                "error": "Empty descriptors provided"
            }), 400
            
        # Match features
        result = match_features(query_desc, stored_desc)
        
        return jsonify(result)
        
    except Exception as e:
        return jsonify({
            "success": False,
            "error": f"Internal server error: {str(e)}"
        }), 500

@app.route('/compare', methods=['POST'])
def compare():
    """
    Compare a query image against multiple stored descriptors
    
    Expected JSON:
    {
        "query_image_path": "/path/to/query.jpg",
        "stored_descriptors": [
            {
                "id": "media_id_1",
                "descriptors": [[...], [...], ...]
            },
            {
                "id": "media_id_2", 
                "descriptors": [[...], [...], ...]
            }
        ],
        "threshold": 50 (optional, default 50)
    }
    
    Returns:
    {
        "success": true/false,
        "best_match": {
            "id": "media_id",
            "score": float,
            "match_count": int
        } or null,
        "all_matches": [...]
    }
    """
    try:
        data = request.get_json()
        if not data or 'query_image_path' not in data or 'stored_descriptors' not in data:
            return jsonify({
                "success": False,
                "error": "Missing query_image_path or stored_descriptors in request"
            }), 400
            
        query_image_path = data['query_image_path']
        stored_descriptors = data['stored_descriptors']
        threshold = data.get('threshold', 50)
        
        # Check if query image exists
        if not os.path.exists(query_image_path):
            return jsonify({
                "success": False,
                "error": f"Query image file not found: {query_image_path}"
            }), 404
            
        # Extract features from query image
        query_desc = extract_features(query_image_path)
        if query_desc is None:
            return jsonify({
                "success": False,
                "error": "No features could be extracted from query image"
            }), 500
            
        # Compare with all stored descriptors
        best_match = None
        best_score = 9999
        all_matches = []
        
        for stored in stored_descriptors:
            if 'id' not in stored or 'descriptors' not in stored:
                continue
                
            result = match_features(query_desc, stored['descriptors'])
            if result['success']:
                score = result['score']
                all_matches.append({
                    "id": stored['id'],
                    "score": score,
                    "match_count": result['match_count']
                })
                
                if score < best_score:
                    best_score = score
                    best_match = {
                        "id": stored['id'],
                        "score": score,
                        "match_count": result['match_count']
                    }
        
        # Check if best match is below threshold
        if best_match and best_score <= threshold:
            return jsonify({
                "success": True,
                "best_match": best_match,
                "all_matches": all_matches,
                "threshold": threshold
            })
        else:
            return jsonify({
                "success": True,
                "best_match": None,
                "all_matches": all_matches,
                "threshold": threshold,
                "message": "No match found below threshold"
            })
            
    except Exception as e:
        return jsonify({
            "success": False,
            "error": f"Internal server error: {str(e)}"
        }), 500

if __name__ == "__main__":
    print("🚀 Starting OpenCV Feature Matching Service...")
    print("📡 Service will be available at: http://localhost:5001")
    print("🔍 Endpoints:")
    print("  - GET  /health - Health check")
    print("  - POST /extract - Extract features from image")
    print("  - POST /match - Match two descriptor sets")
    print("  - POST /compare - Compare query image against multiple stored descriptors")
    
    app.run(host='0.0.0.0', port=5001, debug=True)
