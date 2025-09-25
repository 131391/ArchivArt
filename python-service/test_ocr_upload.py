#!/usr/bin/env python3
"""
Test script for OCR upload functionality
This script tests the OCR service endpoints with file uploads
"""

import requests
import json
import os
import sys
import time
from PIL import Image, ImageDraw, ImageFont
import tempfile

# Configuration
BASE_URL = "http://localhost:5001"

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
        text = "Hello World!\nThis is a test image\nfor OCR upload functionality."
        draw.text((20, 50), text, fill='black', font=font)
        
        # Save to temporary file
        temp_file = tempfile.NamedTemporaryFile(delete=False, suffix='.png')
        img.save(temp_file.name)
        temp_file.close()
        
        print(f"✅ Test image created: {temp_file.name}")
        return temp_file.name
    except Exception as e:
        print(f"❌ Failed to create test image: {str(e)}")
        return None

def test_ocr_upload_extract():
    """Test OCR text extraction with file upload"""
    try:
        print("\n🔍 Testing OCR upload text extraction...")
        
        # Create test image
        image_path = create_test_image()
        if not image_path:
            return False
        
        try:
            # Prepare file upload
            with open(image_path, 'rb') as image_file:
                files = {'image': ('test_image.png', image_file, 'image/png')}
                data = {
                    'language': 'eng',
                    'preprocess': 'true'
                }
                
                response = requests.post(f"{BASE_URL}/ocr/upload-extract", 
                                       files=files, 
                                       data=data,
                                       timeout=30)
            
            if response.status_code == 200:
                result = response.json()
                if result.get('success'):
                    print("✅ OCR upload text extraction successful:")
                    print(f"  - Text: '{result.get('text', '')}'")
                    print(f"  - Confidence: {result.get('confidence', 0):.1f}%")
                    print(f"  - Character count: {result.get('character_count', 0)}")
                    print(f"  - Word count: {result.get('word_count', 0)}")
                    print(f"  - Processing time: {result.get('processing_time', 0):.3f}s")
                    print(f"  - Original filename: {result.get('original_filename', 'Unknown')}")
                    return True
                else:
                    print(f"❌ OCR upload text extraction failed: {result.get('error', 'Unknown error')}")
                    return False
            else:
                print(f"❌ OCR upload text extraction request failed with status: {response.status_code}")
                print(f"Response: {response.text}")
                return False
                
        finally:
            # Clean up test image
            try:
                os.unlink(image_path)
            except:
                pass
                
    except Exception as e:
        print(f"❌ OCR upload text extraction test error: {str(e)}")
        return False

def test_ocr_upload_extract_with_boxes():
    """Test OCR text extraction with bounding boxes and file upload"""
    try:
        print("\n🔍 Testing OCR upload text extraction with boxes...")
        
        # Create test image
        image_path = create_test_image()
        if not image_path:
            return False
        
        try:
            # Prepare file upload
            with open(image_path, 'rb') as image_file:
                files = {'image': ('test_image.png', image_file, 'image/png')}
                data = {
                    'language': 'eng',
                    'preprocess': 'true'
                }
                
                response = requests.post(f"{BASE_URL}/ocr/upload-extract-with-boxes", 
                                       files=files, 
                                       data=data,
                                       timeout=30)
            
            if response.status_code == 200:
                result = response.json()
                if result.get('success'):
                    print("✅ OCR upload text extraction with boxes successful:")
                    print(f"  - Text: '{result.get('text', '')}'")
                    print(f"  - Text regions: {len(result.get('boxes', []))}")
                    print(f"  - Character count: {result.get('character_count', 0)}")
                    print(f"  - Processing time: {result.get('processing_time', 0):.3f}s")
                    print(f"  - Original filename: {result.get('original_filename', 'Unknown')}")
                    
                    # Show first few boxes
                    boxes = result.get('boxes', [])
                    if boxes:
                        print("  - First few text regions:")
                        for i, box in enumerate(boxes[:3]):
                            print(f"    {i+1}. '{box.get('text', '')}' (conf: {box.get('confidence', 0)}%, pos: {box.get('left', 0)},{box.get('top', 0)})")
                    
                    return True
                else:
                    print(f"❌ OCR upload text extraction with boxes failed: {result.get('error', 'Unknown error')}")
                    return False
            else:
                print(f"❌ OCR upload text extraction with boxes request failed with status: {response.status_code}")
                print(f"Response: {response.text}")
                return False
                
        finally:
            # Clean up test image
            try:
                os.unlink(image_path)
            except:
                pass
                
    except Exception as e:
        print(f"❌ OCR upload text extraction with boxes test error: {str(e)}")
        return False

def test_invalid_file_upload():
    """Test OCR with invalid file upload"""
    try:
        print("\n🔍 Testing OCR with invalid file upload...")
        
        # Create a text file instead of image
        temp_file = tempfile.NamedTemporaryFile(delete=False, suffix='.txt', mode='w')
        temp_file.write("This is not an image file")
        temp_file.close()
        
        try:
            # Try to upload text file as image
            with open(temp_file.name, 'rb') as file:
                files = {'image': ('test.txt', file, 'text/plain')}
                data = {'language': 'eng'}
                
                response = requests.post(f"{BASE_URL}/ocr/upload-extract", 
                                       files=files, 
                                       data=data,
                                       timeout=30)
            
            if response.status_code == 400:
                result = response.json()
                if not result.get('success'):
                    print("✅ Invalid file upload correctly rejected:")
                    print(f"  - Error: {result.get('error', 'Unknown error')}")
                    return True
                else:
                    print("❌ Invalid file upload should have been rejected")
                    return False
            else:
                print(f"❌ Expected 400 status for invalid file, got: {response.status_code}")
                return False
                
        finally:
            # Clean up test file
            try:
                os.unlink(temp_file.name)
            except:
                pass
                
    except Exception as e:
        print(f"❌ Invalid file upload test error: {str(e)}")
        return False

def test_missing_file_upload():
    """Test OCR with missing file upload"""
    try:
        print("\n🔍 Testing OCR with missing file upload...")
        
        # Send request without file
        data = {'language': 'eng'}
        response = requests.post(f"{BASE_URL}/ocr/upload-extract", 
                               data=data,
                               timeout=30)
        
        if response.status_code == 400:
            result = response.json()
            if not result.get('success'):
                print("✅ Missing file upload correctly rejected:")
                print(f"  - Error: {result.get('error', 'Unknown error')}")
                return True
            else:
                print("❌ Missing file upload should have been rejected")
                return False
        else:
            print(f"❌ Expected 400 status for missing file, got: {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ Missing file upload test error: {str(e)}")
        return False

def main():
    """Run all OCR upload tests"""
    print("🚀 Starting OCR Upload Integration Tests")
    print("=" * 50)
    
    # Test results
    tests = [
        ("OCR Upload Text Extraction", test_ocr_upload_extract),
        ("OCR Upload Text Extraction with Boxes", test_ocr_upload_extract_with_boxes),
        ("Invalid File Upload", test_invalid_file_upload),
        ("Missing File Upload", test_missing_file_upload)
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
        print("🎉 All upload tests passed! OCR upload functionality is working correctly.")
        return 0
    else:
        print("⚠️ Some upload tests failed. Please check the service configuration.")
        return 1

if __name__ == "__main__":
    exit_code = main()
    sys.exit(exit_code)
