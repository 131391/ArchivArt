#!/usr/bin/env python3
"""
Test script for OCR functionality
This script tests the OCR service endpoints
"""

import requests
import json
import os
import sys
import time
from PIL import Image, ImageDraw, ImageFont
import numpy as np

# Configuration
BASE_URL = "http://localhost:5001"
TEST_IMAGE_PATH = "/tmp/test_ocr_image.png"

def create_test_image():
    """Create a test image with text for OCR testing"""
    try:
        # Create a white image
        img = Image.new('RGB', (400, 200), color='white')
        draw = ImageDraw.Draw(img)
        
        # Try to use a default font, fallback to basic if not available
        try:
            font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 24)
        except:
            font = ImageFont.load_default()
        
        # Add text to the image
        text = "Hello World!\nThis is a test image\nfor OCR functionality."
        draw.text((20, 50), text, fill='black', font=font)
        
        # Save the image
        img.save(TEST_IMAGE_PATH)
        print(f"✅ Test image created: {TEST_IMAGE_PATH}")
        return True
    except Exception as e:
        print(f"❌ Failed to create test image: {str(e)}")
        return False

def test_ocr_info():
    """Test OCR info endpoint"""
    try:
        print("\n🔍 Testing OCR info endpoint...")
        response = requests.get(f"{BASE_URL}/ocr/info", timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            if data.get('success'):
                print("✅ OCR info retrieved successfully:")
                print(f"  - Tesseract version: {data.get('version', 'Unknown')}")
                print(f"  - Supported languages: {', '.join(data.get('supported_languages', []))}")
                print(f"  - Default language: {data.get('default_language', 'Unknown')}")
                return True
            else:
                print(f"❌ OCR info failed: {data.get('error', 'Unknown error')}")
                return False
        else:
            print(f"❌ OCR info request failed with status: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ OCR info test error: {str(e)}")
        return False

def test_ocr_languages():
    """Test OCR languages endpoint"""
    try:
        print("\n🔍 Testing OCR languages endpoint...")
        response = requests.get(f"{BASE_URL}/ocr/languages", timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            if data.get('success'):
                print("✅ OCR languages retrieved successfully:")
                print(f"  - Languages: {', '.join(data.get('languages', []))}")
                print(f"  - Default: {data.get('default_language', 'Unknown')}")
                return True
            else:
                print(f"❌ OCR languages failed: {data.get('error', 'Unknown error')}")
                return False
        else:
            print(f"❌ OCR languages request failed with status: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ OCR languages test error: {str(e)}")
        return False

def test_ocr_extract():
    """Test OCR text extraction"""
    try:
        print("\n🔍 Testing OCR text extraction...")
        
        if not os.path.exists(TEST_IMAGE_PATH):
            print("❌ Test image not found, creating one...")
            if not create_test_image():
                return False
        
        payload = {
            "image_path": TEST_IMAGE_PATH,
            "language": "eng",
            "preprocess": True
        }
        
        response = requests.post(f"{BASE_URL}/ocr/extract", 
                               json=payload, 
                               timeout=30)
        
        if response.status_code == 200:
            data = response.json()
            if data.get('success'):
                print("✅ OCR text extraction successful:")
                print(f"  - Text: '{data.get('text', '')}'")
                print(f"  - Confidence: {data.get('confidence', 0):.1f}%")
                print(f"  - Character count: {data.get('character_count', 0)}")
                print(f"  - Word count: {data.get('word_count', 0)}")
                print(f"  - Processing time: {data.get('processing_time', 0):.3f}s")
                return True
            else:
                print(f"❌ OCR text extraction failed: {data.get('error', 'Unknown error')}")
                return False
        else:
            print(f"❌ OCR text extraction request failed with status: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ OCR text extraction test error: {str(e)}")
        return False

def test_ocr_extract_with_boxes():
    """Test OCR text extraction with bounding boxes"""
    try:
        print("\n🔍 Testing OCR text extraction with boxes...")
        
        if not os.path.exists(TEST_IMAGE_PATH):
            print("❌ Test image not found, creating one...")
            if not create_test_image():
                return False
        
        payload = {
            "image_path": TEST_IMAGE_PATH,
            "language": "eng",
            "preprocess": True
        }
        
        response = requests.post(f"{BASE_URL}/ocr/extract-with-boxes", 
                               json=payload, 
                               timeout=30)
        
        if response.status_code == 200:
            data = response.json()
            if data.get('success'):
                print("✅ OCR text extraction with boxes successful:")
                print(f"  - Text: '{data.get('text', '')}'")
                print(f"  - Text regions: {len(data.get('boxes', []))}")
                print(f"  - Character count: {data.get('character_count', 0)}")
                print(f"  - Processing time: {data.get('processing_time', 0):.3f}s")
                
                # Show first few boxes
                boxes = data.get('boxes', [])
                if boxes:
                    print("  - First few text regions:")
                    for i, box in enumerate(boxes[:3]):
                        print(f"    {i+1}. '{box.get('text', '')}' (conf: {box.get('confidence', 0)}%, pos: {box.get('left', 0)},{box.get('top', 0)})")
                
                return True
            else:
                print(f"❌ OCR text extraction with boxes failed: {data.get('error', 'Unknown error')}")
                return False
        else:
            print(f"❌ OCR text extraction with boxes request failed with status: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ OCR text extraction with boxes test error: {str(e)}")
        return False

def test_service_health():
    """Test overall service health"""
    try:
        print("\n🔍 Testing service health...")
        response = requests.get(f"{BASE_URL}/health", timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            print("✅ Service health check successful:")
            print(f"  - Status: {data.get('status', 'Unknown')}")
            print(f"  - Service: {data.get('service', 'Unknown')}")
            print(f"  - Version: {data.get('version', 'Unknown')}")
            return True
        else:
            print(f"❌ Service health check failed with status: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Service health test error: {str(e)}")
        return False

def cleanup():
    """Clean up test files"""
    try:
        if os.path.exists(TEST_IMAGE_PATH):
            os.remove(TEST_IMAGE_PATH)
            print(f"🧹 Cleaned up test image: {TEST_IMAGE_PATH}")
    except Exception as e:
        print(f"⚠️ Failed to cleanup test image: {str(e)}")

def main():
    """Run all OCR tests"""
    print("🚀 Starting OCR Integration Tests")
    print("=" * 50)
    
    # Test results
    tests = [
        ("Service Health", test_service_health),
        ("OCR Info", test_ocr_info),
        ("OCR Languages", test_ocr_languages),
        ("OCR Text Extraction", test_ocr_extract),
        ("OCR Text Extraction with Boxes", test_ocr_extract_with_boxes)
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
        print("🎉 All tests passed! OCR integration is working correctly.")
        return 0
    else:
        print("⚠️ Some tests failed. Please check the service configuration.")
        return 1

if __name__ == "__main__":
    try:
        exit_code = main()
    finally:
        cleanup()
    sys.exit(exit_code)
