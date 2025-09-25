#!/usr/bin/env python3
"""
Test script specifically for the user's rotated Lorem ipsum image
This script demonstrates how to use the OCR service with different rotation settings
"""

import requests
import json
import os
import sys
import time

# Configuration
BASE_URL = "http://localhost:5001"

def test_ocr_with_different_settings():
    """Test OCR with different settings to find the best approach for rotated text"""
    
    print("🔍 Testing OCR with different settings for rotated text...")
    print("=" * 60)
    
    # Test configurations
    test_configs = [
        {
            "name": "Default (auto_rotate=true)",
            "data": {
                'language': 'eng',
                'preprocess': 'true',
                'auto_rotate': 'true'
            }
        },
        {
            "name": "No auto rotation",
            "data": {
                'language': 'eng',
                'preprocess': 'true',
                'auto_rotate': 'false'
            }
        },
        {
            "name": "No preprocessing",
            "data": {
                'language': 'eng',
                'preprocess': 'false',
                'auto_rotate': 'false'
            }
        },
        {
            "name": "Custom Tesseract config (PSM 6)",
            "data": {
                'language': 'eng',
                'preprocess': 'true',
                'auto_rotate': 'false',
                'config': '--oem 3 --psm 6'
            }
        },
        {
            "name": "Custom Tesseract config (PSM 8)",
            "data": {
                'language': 'eng',
                'preprocess': 'true',
                'auto_rotate': 'false',
                'config': '--oem 3 --psm 8'
            }
        },
        {
            "name": "Custom Tesseract config (PSM 13)",
            "data": {
                'language': 'eng',
                'preprocess': 'true',
                'auto_rotate': 'false',
                'config': '--oem 3 --psm 13'
            }
        }
    ]
    
    results = []
    
    for i, config in enumerate(test_configs, 1):
        print(f"\n{i}. Testing: {config['name']}")
        print("-" * 40)
        
        try:
            # Note: In a real scenario, you would upload your actual image file here
            # For demonstration, we'll show the API call structure
            
            print("API Call Structure:")
            print(f"POST {BASE_URL}/ocr/upload-extract")
            print("Content-Type: multipart/form-data")
            print("Parameters:")
            for key, value in config['data'].items():
                print(f"  {key}: {value}")
            print("Files:")
            print("  image: [your_image_file]")
            
            print("\nTo test with your actual image, use this curl command:")
            curl_cmd = f"curl -X POST {BASE_URL}/ocr/upload-extract"
            for key, value in config['data'].items():
                curl_cmd += f" -F '{key}={value}'"
            curl_cmd += " -F 'image=@your_image_file.png'"
            print(curl_cmd)
            
            results.append({
                "config": config['name'],
                "success": True,
                "note": "API call structure provided"
            })
            
        except Exception as e:
            print(f"❌ Error: {str(e)}")
            results.append({
                "config": config['name'],
                "success": False,
                "error": str(e)
            })
    
    return results

def show_manual_rotation_solution():
    """Show how to manually rotate the image before OCR"""
    
    print("\n" + "=" * 60)
    print("🔄 Manual Rotation Solution")
    print("=" * 60)
    
    print("""
If automatic rotation detection doesn't work well, you can manually rotate your image:

1. **Using ImageMagick (command line):**
   convert your_image.png -rotate -15 corrected_image.png

2. **Using Python PIL:**
   from PIL import Image
   img = Image.open('your_image.png')
   rotated = img.rotate(-15, expand=True, fillcolor='white')
   rotated.save('corrected_image.png')

3. **Using OpenCV:**
   import cv2
   import numpy as np
   
   img = cv2.imread('your_image.png')
   height, width = img.shape[:2]
   center = (width // 2, height // 2)
   
   rotation_matrix = cv2.getRotationMatrix2D(center, -15, 1.0)
   rotated = cv2.warpAffine(img, rotation_matrix, (width, height))
   cv2.imwrite('corrected_image.png', rotated)

4. **Then use the corrected image with OCR:**
   curl -X POST http://localhost:5001/ocr/upload-extract \\
     -F "image=@corrected_image.png" \\
     -F "language=eng" \\
     -F "preprocess=true" \\
     -F "auto_rotate=false"
""")

def show_nodejs_usage():
    """Show how to use the OCR service from Node.js"""
    
    print("\n" + "=" * 60)
    print("📱 Node.js Usage Example")
    print("=" * 60)
    
    print("""
// In your Node.js application:

const ocrService = require('./services/ocrService');

// Method 1: With auto rotation (default)
const result1 = await ocrService.extractTextFromUpload(fileBuffer, 'image.png', {
    language: 'eng',
    preprocess: true,
    auto_rotate: true  // Try automatic rotation correction
});

// Method 2: Without auto rotation
const result2 = await ocrService.extractTextFromUpload(fileBuffer, 'image.png', {
    language: 'eng',
    preprocess: true,
    auto_rotate: false  // Skip rotation correction
});

// Method 3: With custom Tesseract configuration
const result3 = await ocrService.extractTextFromUpload(fileBuffer, 'image.png', {
    language: 'eng',
    preprocess: true,
    auto_rotate: false,
    config: '--oem 3 --psm 8'  // Try different page segmentation modes
});

console.log('Extracted text:', result1.text);
console.log('Confidence:', result1.confidence);
""")

def main():
    """Main function to demonstrate OCR usage for rotated text"""
    
    print("🚀 OCR Service Usage Guide for Rotated Text")
    print("=" * 60)
    
    # Test different configurations
    results = test_ocr_with_different_settings()
    
    # Show manual rotation solution
    show_manual_rotation_solution()
    
    # Show Node.js usage
    show_nodejs_usage()
    
    # Summary
    print("\n" + "=" * 60)
    print("📊 Summary")
    print("=" * 60)
    
    print("""
For your rotated Lorem ipsum image, try these approaches in order:

1. **First, try with auto_rotate=true (default):**
   - This should automatically detect and correct rotation
   - Use: auto_rotate=true

2. **If that doesn't work, try different Tesseract configurations:**
   - PSM 6: --oem 3 --psm 6 (uniform block of text)
   - PSM 8: --oem 3 --psm 8 (single word)
   - PSM 13: --oem 3 --psm 13 (raw line, no specific orientation)

3. **If automatic rotation fails, manually rotate the image:**
   - Rotate by approximately -15 to -20 degrees
   - Then use auto_rotate=false

4. **For your specific image, the expected text should be:**
   "Lorem ipsum dolor sit amet, consectetur adipisicing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum."

The current OCR result shows garbled text, which indicates the rotation correction needs improvement.
""")

if __name__ == "__main__":
    main()
