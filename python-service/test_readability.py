#!/usr/bin/env python3
"""
Test script for OCR readability improvements
This script demonstrates the enhanced readability features
"""

import requests
import json
import os
import sys
import time
from PIL import Image, ImageDraw, ImageFont, ImageFilter
import tempfile
import numpy as np

# Configuration
BASE_URL = "http://localhost:5001"

def create_test_image_with_issues():
    """Create a test image with common OCR readability issues"""
    try:
        # Create a white image
        img = Image.new('RGB', (600, 400), color='white')
        draw = ImageDraw.Draw(img)
        
        # Try to use a default font, fallback to basic if not available
        try:
            font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 20)
        except:
            font = ImageFont.load_default()
        
        # Add text with various readability challenges
        text_lines = [
            "Lorem ipsum dolor sit amet, consectetur adipiscing elit.",
            "Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
            "Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris.",
            "Duis aute irure dolor in reprehenderit in voluptate velit esse.",
            "Excepteur sint occaecat cupidatat non proident, sunt in culpa."
        ]
        
        y_position = 50
        for line in text_lines:
            draw.text((30, y_position), line, fill='black', font=font)
            y_position += 40
        
        # Add some noise and blur to simulate poor image quality
        img = img.filter(ImageFilter.GaussianBlur(radius=0.5))
        
        # Save to temporary file
        temp_file = tempfile.NamedTemporaryFile(delete=False, suffix='.png')
        img.save(temp_file.name)
        temp_file.close()
        
        print(f"✅ Test image with readability issues created: {temp_file.name}")
        return temp_file.name
    except Exception as e:
        print(f"❌ Failed to create test image: {str(e)}")
        return None

def test_ocr_with_readability_improvements():
    """Test OCR with readability improvements enabled"""
    try:
        print("\n🔍 Testing OCR with readability improvements...")
        
        # Create test image
        image_path = create_test_image_with_issues()
        if not image_path:
            return False
        
        try:
            # Test with readability improvements enabled
            with open(image_path, 'rb') as image_file:
                files = {'image': ('test_readability.png', image_file, 'image/png')}
                data = {
                    'language': 'eng',
                    'preprocess': 'true',
                    'auto_rotate': 'true',
                    'improve_readability': 'true',
                    'post_process': 'true'
                }
                
                response = requests.post(f"{BASE_URL}/ocr/upload-extract", 
                                       files=files, 
                                       data=data,
                                       timeout=30)
            
            if response.status_code == 200:
                result = response.json()
                if result.get('success'):
                    print("✅ OCR with readability improvements successful:")
                    print(f"  - Text: '{result.get('text', '')[:200]}...'")
                    print(f"  - Confidence: {result.get('confidence', 0):.1f}%")
                    print(f"  - Character count: {result.get('character_count', 0)}")
                    print(f"  - Word count: {result.get('word_count', 0)}")
                    print(f"  - Processing time: {result.get('processing_time', 0):.3f}s")
                    return True
                else:
                    print(f"❌ OCR with readability improvements failed: {result.get('error', 'Unknown error')}")
                    return False
            else:
                print(f"❌ OCR with readability improvements request failed with status: {response.status_code}")
                print(f"Response: {response.text}")
                return False
                
        finally:
            # Clean up test image
            try:
                os.unlink(image_path)
            except:
                pass
                
    except Exception as e:
        print(f"❌ OCR with readability improvements test error: {str(e)}")
        return False

def test_ocr_without_readability_improvements():
    """Test OCR without readability improvements for comparison"""
    try:
        print("\n🔍 Testing OCR without readability improvements...")
        
        # Create test image
        image_path = create_test_image_with_issues()
        if not image_path:
            return False
        
        try:
            # Test without readability improvements
            with open(image_path, 'rb') as image_file:
                files = {'image': ('test_readability.png', image_file, 'image/png')}
                data = {
                    'language': 'eng',
                    'preprocess': 'true',
                    'auto_rotate': 'true',
                    'improve_readability': 'false',
                    'post_process': 'false'
                }
                
                response = requests.post(f"{BASE_URL}/ocr/upload-extract", 
                                       files=files, 
                                       data=data,
                                       timeout=30)
            
            if response.status_code == 200:
                result = response.json()
                if result.get('success'):
                    print("✅ OCR without readability improvements completed:")
                    print(f"  - Text: '{result.get('text', '')[:200]}...'")
                    print(f"  - Confidence: {result.get('confidence', 0):.1f}%")
                    print(f"  - Character count: {result.get('character_count', 0)}")
                    print(f"  - Word count: {result.get('word_count', 0)}")
                    print(f"  - Processing time: {result.get('processing_time', 0):.3f}s")
                    return True
                else:
                    print(f"❌ OCR without readability improvements failed: {result.get('error', 'Unknown error')}")
                    return False
            else:
                print(f"❌ OCR without readability improvements request failed with status: {response.status_code}")
                print(f"Response: {response.text}")
                return False
                
        finally:
            # Clean up test image
            try:
                os.unlink(image_path)
            except:
                pass
                
    except Exception as e:
        print(f"❌ OCR without readability improvements test error: {str(e)}")
        return False

def test_different_readability_settings():
    """Test different combinations of readability settings"""
    try:
        print("\n🔍 Testing different readability settings...")
        
        # Create test image
        image_path = create_test_image_with_issues()
        if not image_path:
            return False
        
        test_configs = [
            {
                "name": "All improvements enabled",
                "data": {
                    'language': 'eng',
                    'preprocess': 'true',
                    'auto_rotate': 'true',
                    'improve_readability': 'true',
                    'post_process': 'true'
                }
            },
            {
                "name": "Only image preprocessing",
                "data": {
                    'language': 'eng',
                    'preprocess': 'true',
                    'auto_rotate': 'true',
                    'improve_readability': 'true',
                    'post_process': 'false'
                }
            },
            {
                "name": "Only text post-processing",
                "data": {
                    'language': 'eng',
                    'preprocess': 'true',
                    'auto_rotate': 'true',
                    'improve_readability': 'false',
                    'post_process': 'true'
                }
            },
            {
                "name": "Basic processing only",
                "data": {
                    'language': 'eng',
                    'preprocess': 'true',
                    'auto_rotate': 'true',
                    'improve_readability': 'false',
                    'post_process': 'false'
                }
            }
        ]
        
        results = []
        
        for config in test_configs:
            print(f"\n  Testing: {config['name']}")
            try:
                with open(image_path, 'rb') as image_file:
                    files = {'image': ('test_readability.png', image_file, 'image/png')}
                    
                    response = requests.post(f"{BASE_URL}/ocr/upload-extract", 
                                           files=files, 
                                           data=config['data'],
                                           timeout=30)
                
                if response.status_code == 200:
                    result = response.json()
                    if result.get('success'):
                        print(f"    ✅ Success: {result.get('confidence', 0):.1f}% confidence, {result.get('character_count', 0)} chars")
                        results.append({
                            "config": config['name'],
                            "success": True,
                            "confidence": result.get('confidence', 0),
                            "char_count": result.get('character_count', 0)
                        })
                    else:
                        print(f"    ❌ Failed: {result.get('error', 'Unknown error')}")
                        results.append({
                            "config": config['name'],
                            "success": False,
                            "error": result.get('error', 'Unknown error')
                        })
                else:
                    print(f"    ❌ Request failed: {response.status_code}")
                    results.append({
                        "config": config['name'],
                        "success": False,
                        "error": f"HTTP {response.status_code}"
                    })
            except Exception as e:
                print(f"    ❌ Error: {str(e)}")
                results.append({
                    "config": config['name'],
                    "success": False,
                    "error": str(e)
                })
        
        # Clean up test image
        try:
            os.unlink(image_path)
        except:
            pass
        
        return results
        
    except Exception as e:
        print(f"❌ Different readability settings test error: {str(e)}")
        return False

def show_readability_usage_guide():
    """Show usage guide for readability improvements"""
    
    print("\n" + "=" * 60)
    print("📖 OCR Readability Improvements Usage Guide")
    print("=" * 60)
    
    print("""
The OCR service now includes advanced readability improvements:

🔧 **Image Preprocessing Enhancements:**
- Bilateral filtering for noise reduction while preserving edges
- Morphological operations to clean up text
- Gamma correction for better contrast
- Edge sharpening for clearer text
- Adaptive thresholding for varying lighting conditions

📝 **Text Post-Processing:**
- Fix common OCR character recognition errors
- Improve punctuation and spacing
- Fix line breaks and formatting
- Remove excessive whitespace
- Capitalize sentences properly

🎛️ **New Parameters:**
- improve_readability: Enable/disable advanced image preprocessing (default: true)
- post_process: Enable/disable text post-processing (default: true)

📱 **Usage Examples:**

1. **Maximum Readability (Recommended):**
   curl -X POST http://localhost:5001/ocr/upload-extract \\
     -F "image=@your_image.png" \\
     -F "language=eng" \\
     -F "preprocess=true" \\
     -F "auto_rotate=true" \\
     -F "improve_readability=true" \\
     -F "post_process=true"

2. **Fast Processing (Basic):**
   curl -X POST http://localhost:5001/ocr/upload-extract \\
     -F "image=@your_image.png" \\
     -F "language=eng" \\
     -F "preprocess=true" \\
     -F "auto_rotate=true" \\
     -F "improve_readability=false" \\
     -F "post_process=false"

3. **Node.js Usage:**
   const result = await ocrService.extractTextFromUpload(fileBuffer, 'image.png', {
       language: 'eng',
       preprocess: true,
       auto_rotate: true,
       improve_readability: true,  // Advanced image preprocessing
       post_process: true          // Text post-processing
   });

🎯 **When to Use Each Setting:**
- improve_readability=true: For poor quality, blurry, or low-contrast images
- post_process=true: For documents with formatting issues or OCR errors
- Both enabled: For maximum accuracy and readability (recommended)
- Both disabled: For fastest processing when image quality is already good
""")

def main():
    """Run all readability improvement tests"""
    print("🚀 Starting OCR Readability Improvement Tests")
    print("=" * 60)
    
    # Test results
    tests = [
        ("OCR with Readability Improvements", test_ocr_with_readability_improvements),
        ("OCR without Readability Improvements", test_ocr_without_readability_improvements),
        ("Different Readability Settings", test_different_readability_settings)
    ]
    
    results = []
    
    for test_name, test_func in tests:
        try:
            result = test_func()
            results.append((test_name, result))
        except Exception as e:
            print(f"❌ {test_name} test crashed: {str(e)}")
            results.append((test_name, False))
    
    # Show usage guide
    show_readability_usage_guide()
    
    # Summary
    print("\n" + "=" * 60)
    print("📊 Test Results Summary:")
    print("=" * 60)
    
    passed = 0
    total = len(results)
    
    for test_name, result in results:
        if isinstance(result, list):
            # Handle the different readability settings test
            successful_configs = [r for r in result if r.get('success')]
            print(f"  {test_name}: {len(successful_configs)}/{len(result)} configurations successful")
            if len(successful_configs) == len(result):
                passed += 1
        else:
            status = "✅ PASS" if result else "❌ FAIL"
            print(f"  {test_name}: {status}")
            if result:
                passed += 1
    
    print(f"\n🎯 Overall: {passed}/{total} test categories passed")
    
    if passed == total:
        print("🎉 All readability improvement tests passed!")
        return 0
    else:
        print("⚠️ Some readability improvement tests failed.")
        return 1

if __name__ == "__main__":
    exit_code = main()
    sys.exit(exit_code)
