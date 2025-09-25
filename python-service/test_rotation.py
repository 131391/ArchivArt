#!/usr/bin/env python3
"""
Test script for OCR rotation correction functionality
"""

import requests
import json
import os
import sys
import time
from PIL import Image, ImageDraw, ImageFont
import tempfile
import numpy as np
import cv2

# Configuration
BASE_URL = "http://localhost:5001"

def create_rotated_test_image(angle=15):
    """Create a test image with rotated text"""
    try:
        # Create a white image
        img = Image.new('RGB', (600, 300), color='white')
        draw = ImageDraw.Draw(img)
        
        # Try to use a default font, fallback to basic if not available
        try:
            font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 24)
        except:
            font = ImageFont.load_default()
        
        # Add text to the image
        text = "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua."
        draw.text((50, 100), text, fill='black', font=font)
        
        # Rotate the image
        rotated_img = img.rotate(angle, expand=True, fillcolor='white')
        
        # Save to temporary file
        temp_file = tempfile.NamedTemporaryFile(delete=False, suffix='.png')
        rotated_img.save(temp_file.name)
        temp_file.close()
        
        print(f"✅ Rotated test image created: {temp_file.name} (angle: {angle}°)")
        return temp_file.name
    except Exception as e:
        print(f"❌ Failed to create rotated test image: {str(e)}")
        return None

def test_ocr_with_rotation_correction():
    """Test OCR with rotation correction enabled"""
    try:
        print("\n🔍 Testing OCR with rotation correction...")
        
        # Create rotated test image
        image_path = create_rotated_test_image(15)  # 15 degree rotation
        if not image_path:
            return False
        
        try:
            # Test with auto_rotate enabled
            with open(image_path, 'rb') as image_file:
                files = {'image': ('rotated_test.png', image_file, 'image/png')}
                data = {
                    'language': 'eng',
                    'preprocess': 'true',
                    'auto_rotate': 'true'
                }
                
                response = requests.post(f"{BASE_URL}/ocr/upload-extract", 
                                       files=files, 
                                       data=data,
                                       timeout=30)
            
            if response.status_code == 200:
                result = response.json()
                if result.get('success'):
                    print("✅ OCR with rotation correction successful:")
                    print(f"  - Text: '{result.get('text', '')[:100]}...'")
                    print(f"  - Confidence: {result.get('confidence', 0):.1f}%")
                    print(f"  - Character count: {result.get('character_count', 0)}")
                    print(f"  - Word count: {result.get('word_count', 0)}")
                    print(f"  - Processing time: {result.get('processing_time', 0):.3f}s")
                    return True
                else:
                    print(f"❌ OCR with rotation correction failed: {result.get('error', 'Unknown error')}")
                    return False
            else:
                print(f"❌ OCR with rotation correction request failed with status: {response.status_code}")
                print(f"Response: {response.text}")
                return False
                
        finally:
            # Clean up test image
            try:
                os.unlink(image_path)
            except:
                pass
                
    except Exception as e:
        print(f"❌ OCR with rotation correction test error: {str(e)}")
        return False

def test_ocr_without_rotation_correction():
    """Test OCR without rotation correction"""
    try:
        print("\n🔍 Testing OCR without rotation correction...")
        
        # Create rotated test image
        image_path = create_rotated_test_image(15)  # 15 degree rotation
        if not image_path:
            return False
        
        try:
            # Test with auto_rotate disabled
            with open(image_path, 'rb') as image_file:
                files = {'image': ('rotated_test.png', image_file, 'image/png')}
                data = {
                    'language': 'eng',
                    'preprocess': 'true',
                    'auto_rotate': 'false'
                }
                
                response = requests.post(f"{BASE_URL}/ocr/upload-extract", 
                                       files=files, 
                                       data=data,
                                       timeout=30)
            
            if response.status_code == 200:
                result = response.json()
                if result.get('success'):
                    print("✅ OCR without rotation correction completed:")
                    print(f"  - Text: '{result.get('text', '')[:100]}...'")
                    print(f"  - Confidence: {result.get('confidence', 0):.1f}%")
                    print(f"  - Character count: {result.get('character_count', 0)}")
                    print(f"  - Word count: {result.get('word_count', 0)}")
                    print(f"  - Processing time: {result.get('processing_time', 0):.3f}s")
                    return True
                else:
                    print(f"❌ OCR without rotation correction failed: {result.get('error', 'Unknown error')}")
                    return False
            else:
                print(f"❌ OCR without rotation correction request failed with status: {response.status_code}")
                print(f"Response: {response.text}")
                return False
                
        finally:
            # Clean up test image
            try:
                os.unlink(image_path)
            except:
                pass
                
    except Exception as e:
        print(f"❌ OCR without rotation correction test error: {str(e)}")
        return False

def test_rotation_detection():
    """Test the rotation detection algorithm directly"""
    try:
        print("\n🔍 Testing rotation detection algorithm...")
        
        # Create rotated test image
        image_path = create_rotated_test_image(25)  # 25 degree rotation
        if not image_path:
            return False
        
        try:
            # Read image and test rotation detection
            img = cv2.imread(image_path)
            gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
            
            # Apply edge detection
            edges = cv2.Canny(gray, 50, 150, apertureSize=3)
            
            # Apply Hough line transform
            lines = cv2.HoughLines(edges, 1, np.pi/180, threshold=100)
            
            if lines is not None:
                angles = []
                for line in lines:
                    rho, theta = line[0]
                    # Convert to degrees
                    angle = np.degrees(theta)
                    # Normalize angle to -90 to 90 degrees
                    if angle > 90:
                        angle = angle - 180
                    angles.append(angle)
                
                if angles:
                    # Use median angle for robustness
                    median_angle = np.median(angles)
                    print(f"✅ Rotation detection successful:")
                    print(f"  - Detected angle: {median_angle:.2f} degrees")
                    print(f"  - Expected angle: 25.0 degrees")
                    print(f"  - Difference: {abs(median_angle - 25.0):.2f} degrees")
                    
                    # Consider it successful if within 5 degrees
                    if abs(median_angle - 25.0) < 5.0:
                        return True
                    else:
                        print("⚠️ Detected angle is not close to expected angle")
                        return False
                else:
                    print("❌ No angles detected")
                    return False
            else:
                print("❌ No lines detected for rotation analysis")
                return False
                
        finally:
            # Clean up test image
            try:
                os.unlink(image_path)
            except:
                pass
                
    except Exception as e:
        print(f"❌ Rotation detection test error: {str(e)}")
        return False

def main():
    """Run all rotation correction tests"""
    print("🚀 Starting OCR Rotation Correction Tests")
    print("=" * 50)
    
    # Test results
    tests = [
        ("Rotation Detection Algorithm", test_rotation_detection),
        ("OCR with Rotation Correction", test_ocr_with_rotation_correction),
        ("OCR without Rotation Correction", test_ocr_without_rotation_correction)
    ]
    
    results = []
    
    for test_name, test_func in tests:
        try:
            result = test_func()
            results.append((test_name, result))
        except Exception as e:
            print(f"❌ {test_name} test crashed: {str(e)}")
            results.append((test_name, False))
    
    # Summary
    print("\n" + "=" * 50)
    print("📊 Test Results Summary:")
    print("=" * 50)
    
    passed = 0
    total = len(results)
    
    for test_name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"  {test_name}: {status}")
        if result:
            passed += 1
    
    print(f"\n🎯 Overall: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 All rotation correction tests passed!")
        return 0
    else:
        print("⚠️ Some rotation correction tests failed.")
        return 1

if __name__ == "__main__":
    exit_code = main()
    sys.exit(exit_code)
