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
    
    def preprocess_image(self, image_path: str, enhance_contrast: bool = True, denoise: bool = True) -> Optional[np.ndarray]:
        """
        Preprocess image for better OCR results
        """
        try:
            # Read image
            img = cv2.imread(image_path)
            if img is None:
                logger.error(f"Could not read image: {image_path}")
                return None
            
            # Convert to grayscale
            gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
            
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
                    preprocess: bool = True, config: str = None) -> Dict[str, Any]:
        """
        Extract text from image using Tesseract OCR
        
        Args:
            image_path: Path to the image file
            language: Language code for OCR (default: 'eng')
            preprocess: Whether to preprocess image for better results
            config: Custom Tesseract configuration
            
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
                processed_img = self.preprocess_image(image_path)
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
                               preprocess: bool = True, config: str = None) -> Dict[str, Any]:
        """
        Extract text with bounding box information
        
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
                processed_img = self.preprocess_image(image_path)
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
