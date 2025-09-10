from flask import Flask, request, jsonify
import cv2
import numpy as np
import os
from typing import Optional, List, Dict, Any

app = Flask(__name__)

# Initialize ORB detector with reduced features for better performance
orb = cv2.ORB_create(nfeatures=500)

def extract_features(image_path: str) -> Optional[List[List[int]]]:
    """
    Extract ORB features from an image
    """
    try:
        img = cv2.imread(image_path, cv2.IMREAD_GRAYSCALE)
        if img is None:
            print(f"Error: Could not read image from {image_path}")
            return None

        keypoints, descriptors = orb.detectAndCompute(img, None)

        if descriptors is not None:
            return descriptors.tolist()
        else:
            print(f"No features found in image: {image_path}")
            return None

    except Exception as e:
        print(f"Error extracting features from {image_path}: {str(e)}")
        return None

def match_features(query_desc: List[List[int]], stored_desc: List[List[int]]) -> Dict[str, Any]:
    """
    Match features using Lowe's ratio test and return normalized similarity.
    """
    try:
        query_desc = np.array(query_desc, dtype=np.uint8)
        stored_desc = np.array(stored_desc, dtype=np.uint8)

        if len(query_desc) < 2 or len(stored_desc) < 2:
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

        return {
            "success": True,
            "similarity": float(similarity),
            "match_count": len(good_matches)
        }

    except Exception as e:
        print(f"Error matching features: {str(e)}")
        return {
            "success": False,
            "error": str(e),
            "similarity": 0.0,
            "match_count": 0
        }

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({
        "status": "healthy",
        "service": "opencv-feature-matching",
        "version": "1.1.0"
    })

@app.route('/extract', methods=['POST'])
def extract():
    try:
        data = request.get_json()
        if not data or 'image_path' not in data:
            return jsonify({"success": False, "error": "Missing image_path in request"}), 400

        image_path = data['image_path']
        if not os.path.exists(image_path):
            return jsonify({"success": False, "error": f"Image file not found: {image_path}"}), 404

        descriptors = extract_features(image_path)
        if descriptors is None:
            return jsonify({"success": False, "error": "No features could be extracted"}), 500

        return jsonify({
            "success": True,
            "descriptors": descriptors,
            "feature_count": len(descriptors)
        })

    except Exception as e:
        return jsonify({"success": False, "error": f"Internal server error: {str(e)}"}), 500

@app.route('/match', methods=['POST'])
def match():
    try:
        data = request.get_json()
        if not data or 'query_desc' not in data or 'stored_desc' not in data:
            return jsonify({"success": False, "error": "Missing query_desc or stored_desc"}), 400

        query_desc = data['query_desc']
        stored_desc = data['stored_desc']

        if not query_desc or not stored_desc:
            return jsonify({"success": False, "error": "Empty descriptors provided"}), 400

        result = match_features(query_desc, stored_desc)
        return jsonify(result)

    except Exception as e:
        return jsonify({"success": False, "error": f"Internal server error: {str(e)}"}), 500

@app.route('/compare', methods=['POST'])
def compare():
    try:
        data = request.get_json()
        if not data or 'query_image_path' not in data or 'stored_descriptors' not in data:
            return jsonify({"success": False, "error": "Missing query_image_path or stored_descriptors"}), 400

        query_image_path = data['query_image_path']
        stored_descriptors = data['stored_descriptors']
        threshold = data.get('threshold', 0.2)  # similarity threshold (20%)

        if not os.path.exists(query_image_path):
            return jsonify({"success": False, "error": f"Query image not found: {query_image_path}"}), 404

        query_desc = extract_features(query_image_path)
        if query_desc is None:
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

        if best_match and best_score >= threshold:
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
                "message": "No match found above threshold"
            })

    except Exception as e:
        return jsonify({"success": False, "error": f"Internal server error: {str(e)}"}), 500

if __name__ == "__main__":
    print("🚀 Starting OpenCV Feature Matching Service...")
    print("📡 Service running at: http://localhost:5001")
    print("🔍 Endpoints:")
    print("  - GET  /health")
    print("  - POST /extract")
    print("  - POST /match")
    print("  - POST /compare")

    app.run(host='0.0.0.0', port=5001, debug=True)
