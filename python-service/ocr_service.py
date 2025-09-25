"""
OCR Service Module for Tesseract OCR Integration
Provides text extraction from images using pytesseract
"""

import cv2
import numpy as np
import pytesseract
import logging
import time
from typing import Optional, Dict, Any, List
from PIL import Image
import os

logger = logging.getLogger(__name__)

class OCRService:
    def __init__(self):
        """Initialize OCR service with Tesseract configuration"""
        self.supported_languages = ['eng', 'fra', 'deu', 'spa', 'ita', 'por', 'rus', 'ara', 'chi_sim', 'chi_tra']
        self.default_language = 'eng'
        self.default_config = '--oem 3 --psm 6'  # OCR Engine Mode 3, Page Segmentation Mode 6
        
        # Try to detect Tesseract installation
        try:
            pytesseract.get_tesseract_version()
            logger.info(f"Tesseract OCR initialized successfully")
        except Exception as e:
            logger.error(f"Tesseract OCR not found or not properly installed: {str(e)}")
            logger.error("Please install Tesseract OCR: https://github.com/tesseract-ocr/tesseract")
    
    def detect_text_rotation(self, image: np.ndarray) -> float:
        """
        Detect the rotation angle of text in the image using multiple methods
        """
        try:
            # Method 1: Try Tesseract's orientation detection
            try:
                from PIL import Image
                pil_image = Image.fromarray(image)
                osd = pytesseract.image_to_osd(pil_image, output_type=pytesseract.Output.DICT)
                if 'orientation' in osd:
                    orientation = osd['orientation']
                    # Convert Tesseract orientation to rotation angle
                    rotation_angle = 0
                    if orientation == 1:
                        rotation_angle = 90
                    elif orientation == 2:
                        rotation_angle = 180
                    elif orientation == 3:
                        rotation_angle = 270
                    
                    if rotation_angle != 0:
                        logger.info(f"Tesseract detected orientation: {orientation} (rotation: {rotation_angle}°)")
                        return rotation_angle
            except Exception as e:
                logger.debug(f"Tesseract orientation detection failed: {str(e)}")
            
            # Method 2: Hough line transform with improved parameters
            try:
                # Apply edge detection with better parameters
                edges = cv2.Canny(image, 30, 100, apertureSize=3)
                
                # Apply Hough line transform with lower threshold
                lines = cv2.HoughLines(edges, 1, np.pi/180, threshold=50)
                
                if lines is not None and len(lines) > 5:
                    angles = []
                    for line in lines:
                        rho, theta = line[0]
                        # Convert to degrees
                        angle = np.degrees(theta)
                        # Normalize angle to -90 to 90 degrees
                        if angle > 90:
                            angle = angle - 180
                        elif angle < -90:
                            angle = angle + 180
                        angles.append(angle)
                    
                    if angles:
                        # Filter out angles that are too close to 0 or 90 degrees
                        filtered_angles = [a for a in angles if abs(a) > 2 and abs(a) < 88]
                        if filtered_angles:
                            # Use median angle for robustness
                            median_angle = np.median(filtered_angles)
                            logger.info(f"Hough lines detected text rotation angle: {median_angle:.2f} degrees")
                            return median_angle
            except Exception as e:
                logger.debug(f"Hough line detection failed: {str(e)}")
            
            # Method 3: Try different rotation angles and find the best one
            try:
                best_angle = 0
                best_confidence = 0
                
                # Test rotation angles from -45 to 45 degrees in 5-degree steps
                for test_angle in range(-45, 46, 5):
                    if test_angle == 0:
                        continue
                    
                    # Rotate image
                    rotated = self.rotate_image(image, test_angle)
                    
                    # Quick OCR test to get confidence
                    try:
                        from PIL import Image
                        pil_rotated = Image.fromarray(rotated)
                        data = pytesseract.image_to_data(pil_rotated, output_type=pytesseract.Output.DICT)
                        
                        # Calculate average confidence
                        confidences = [int(conf) for conf in data['conf'] if int(conf) > 0]
                        if confidences:
                            avg_confidence = sum(confidences) / len(confidences)
                            if avg_confidence > best_confidence:
                                best_confidence = avg_confidence
                                best_angle = test_angle
                    except:
                        continue
                
                if best_confidence > 30:  # Only use if confidence is reasonable
                    logger.info(f"Best rotation angle found: {best_angle}° (confidence: {best_confidence:.1f}%)")
                    return best_angle
                    
            except Exception as e:
                logger.debug(f"Rotation testing failed: {str(e)}")
            
            return 0.0
            
        except Exception as e:
            logger.warning(f"Could not detect text rotation: {str(e)}")
            return 0.0
    
    def rotate_image(self, image: np.ndarray, angle: float) -> np.ndarray:
        """
        Rotate image by the specified angle
        """
        try:
            if abs(angle) < 1.0:  # Skip rotation for very small angles
                return image
            
            # Get image dimensions
            height, width = image.shape[:2]
            center = (width // 2, height // 2)
            
            # Create rotation matrix
            rotation_matrix = cv2.getRotationMatrix2D(center, -angle, 1.0)
            
            # Calculate new dimensions to avoid cropping
            cos_angle = abs(rotation_matrix[0, 0])
            sin_angle = abs(rotation_matrix[0, 1])
            new_width = int((height * sin_angle) + (width * cos_angle))
            new_height = int((height * cos_angle) + (width * sin_angle))
            
            # Adjust rotation matrix for new dimensions
            rotation_matrix[0, 2] += (new_width / 2) - center[0]
            rotation_matrix[1, 2] += (new_height / 2) - center[1]
            
            # Rotate the image
            rotated = cv2.warpAffine(image, rotation_matrix, (new_width, new_height), 
                                   borderValue=(255, 255, 255) if len(image.shape) == 3 else 255)
            
            logger.info(f"Rotated image by {angle:.2f} degrees")
            return rotated
            
        except Exception as e:
            logger.error(f"Error rotating image: {str(e)}")
            return image

    def preprocess_image(self, image_path: str, enhance_contrast: bool = True, denoise: bool = True, 
                        auto_rotate: bool = True) -> Optional[np.ndarray]:
        """
        Preprocess image for better OCR results with optional rotation correction
        """
        try:
            # Read image
            img = cv2.imread(image_path)
            if img is None:
                logger.error(f"Could not read image: {image_path}")
                return None
            
            # Convert to grayscale
            gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
            
            # Auto-rotate if requested
            if auto_rotate:
                rotation_angle = self.detect_text_rotation(gray)
                if abs(rotation_angle) > 1.0:  # Only rotate if angle is significant
                    gray = self.rotate_image(gray, rotation_angle)
            
            # Enhance contrast if requested
            if enhance_contrast:
                # Apply CLAHE (Contrast Limited Adaptive Histogram Equalization)
                clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8,8))
                gray = clahe.apply(gray)
            
            # Denoise if requested
            if denoise:
                gray = cv2.medianBlur(gray, 3)
            
            # Apply threshold to get binary image
            _, binary = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
            
            return binary
            
        except Exception as e:
            logger.error(f"Error preprocessing image {image_path}: {str(e)}")
            return None
    
    def extract_text(self, image_path: str, language: str = None, 
                    preprocess: bool = True, config: str = None, auto_rotate: bool = True) -> Dict[str, Any]:
        """
        Extract text from image using Tesseract OCR
        
        Args:
            image_path: Path to the image file
            language: Language code for OCR (default: 'eng')
            preprocess: Whether to preprocess image for better results
            config: Custom Tesseract configuration
            auto_rotate: Whether to automatically detect and correct text rotation
            
        Returns:
            Dictionary with extracted text and metadata
        """
        start_time = time.time()
        
        try:
            # Validate file exists
            if not os.path.exists(image_path):
                return {
                    "success": False,
                    "error": f"Image file not found: {image_path}",
                    "text": "",
                    "confidence": 0.0,
                    "processing_time": 0.0
                }
            
            # Set language
            if language is None:
                language = self.default_language
            
            if language not in self.supported_languages:
                logger.warning(f"Language '{language}' not in supported languages, using default")
                language = self.default_language
            
            # Set configuration
            if config is None:
                config = self.default_config
            
            # Preprocess image if requested
            if preprocess:
                processed_img = self.preprocess_image(image_path, auto_rotate=auto_rotate)
                if processed_img is None:
                    return {
                        "success": False,
                        "error": "Failed to preprocess image",
                        "text": "",
                        "confidence": 0.0,
                        "processing_time": 0.0
                    }
                # Convert numpy array to PIL Image
                pil_image = Image.fromarray(processed_img)
            else:
                # Use original image
                pil_image = Image.open(image_path)
            
            # Extract text with confidence scores
            data = pytesseract.image_to_data(pil_image, lang=language, config=config, output_type=pytesseract.Output.DICT)
            
            # Extract text
            text = pytesseract.image_to_string(pil_image, lang=language, config=config)
            
            # Calculate average confidence
            confidences = [int(conf) for conf in data['conf'] if int(conf) > 0]
            avg_confidence = sum(confidences) / len(confidences) if confidences else 0.0
            
            processing_time = time.time() - start_time
            
            logger.info(f"OCR completed for {os.path.basename(image_path)}: {len(text)} characters, confidence: {avg_confidence:.1f}%, time: {processing_time:.3f}s")
            
            return {
                "success": True,
                "text": text.strip(),
                "confidence": avg_confidence,
                "language": language,
                "word_count": len(text.split()),
                "character_count": len(text),
                "processing_time": processing_time,
                "raw_data": data
            }
            
        except Exception as e:
            processing_time = time.time() - start_time
            logger.error(f"OCR error for {image_path}: {str(e)}", exc_info=True)
            return {
                "success": False,
                "error": str(e),
                "text": "",
                "confidence": 0.0,
                "processing_time": processing_time
            }
    
    def extract_text_with_boxes(self, image_path: str, language: str = None, 
                               preprocess: bool = True, config: str = None, auto_rotate: bool = True) -> Dict[str, Any]:
        """
        Extract text with bounding box information
        
        Args:
            image_path: Path to the image file
            language: Language code for OCR (default: 'eng')
            preprocess: Whether to preprocess image for better results
            config: Custom Tesseract configuration
            auto_rotate: Whether to automatically detect and correct text rotation
        
        Returns:
            Dictionary with text, bounding boxes, and metadata
        """
        start_time = time.time()
        
        try:
            # Validate file exists
            if not os.path.exists(image_path):
                return {
                    "success": False,
                    "error": f"Image file not found: {image_path}",
                    "text": "",
                    "boxes": [],
                    "processing_time": 0.0
                }
            
            # Set language
            if language is None:
                language = self.default_language
            
            # Set configuration
            if config is None:
                config = self.default_config
            
            # Preprocess image if requested
            if preprocess:
                processed_img = self.preprocess_image(image_path, auto_rotate=auto_rotate)
                if processed_img is None:
                    return {
                        "success": False,
                        "error": "Failed to preprocess image",
                        "text": "",
                        "boxes": [],
                        "processing_time": 0.0
                    }
                pil_image = Image.fromarray(processed_img)
            else:
                pil_image = Image.open(image_path)
            
            # Extract text with bounding boxes
            data = pytesseract.image_to_data(pil_image, lang=language, config=config, output_type=pytesseract.Output.DICT)
            
            # Extract text
            text = pytesseract.image_to_string(pil_image, lang=language, config=config)
            
            # Process bounding boxes
            boxes = []
            n_boxes = len(data['level'])
            for i in range(n_boxes):
                if int(data['conf'][i]) > 0:  # Only include boxes with confidence > 0
                    boxes.append({
                        'text': data['text'][i],
                        'confidence': int(data['conf'][i]),
                        'left': data['left'][i],
                        'top': data['top'][i],
                        'width': data['width'][i],
                        'height': data['height'][i]
                    })
            
            processing_time = time.time() - start_time
            
            logger.info(f"OCR with boxes completed for {os.path.basename(image_path)}: {len(boxes)} text regions, time: {processing_time:.3f}s")
            
            return {
                "success": True,
                "text": text.strip(),
                "boxes": boxes,
                "language": language,
                "word_count": len(text.split()),
                "character_count": len(text),
                "processing_time": processing_time
            }
            
        except Exception as e:
            processing_time = time.time() - start_time
            logger.error(f"OCR with boxes error for {image_path}: {str(e)}", exc_info=True)
            return {
                "success": False,
                "error": str(e),
                "text": "",
                "boxes": [],
                "processing_time": processing_time
            }
    
    def get_supported_languages(self) -> List[str]:
        """Get list of supported languages"""
        return self.supported_languages.copy()
    
    def get_tesseract_info(self) -> Dict[str, Any]:
        """Get Tesseract version and configuration info"""
        try:
            version = pytesseract.get_tesseract_version()
            # Convert version object to string for JSON serialization
            version_str = str(version) if version else "Unknown"
            return {
                "success": True,
                "version": version_str,
                "supported_languages": self.supported_languages,
                "default_language": self.default_language,
                "default_config": self.default_config
            }
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "version": None,
                "supported_languages": [],
                "default_language": self.default_language,
                "default_config": self.default_config
            }

# Create global OCR service instance
ocr_service = OCRService()
