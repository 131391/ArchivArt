"""
OCR Service Module for Tesseract OCR Integration
Provides text extraction from images using pytesseract
"""

import cv2
import numpy as np
import pytesseract
import logging
import time
import re
from typing import Optional, Dict, Any, List
from PIL import Image
import os

logger = logging.getLogger(__name__)

class OCRService:
    def __init__(self):
        """Initialize OCR service with Tesseract configuration"""
        self.supported_languages = ['eng', 'hin', 'fra', 'deu', 'spa', 'ita', 'por', 'rus', 'ara', 'chi_sim', 'chi_tra']
        self.default_language = 'eng'
        self.default_config = '--oem 3 --psm 6'  # OCR Engine Mode 3, Page Segmentation Mode 6
        # Alternative configs for different image types
        self.alternative_configs = [
            '--oem 3 --psm 3',  # Fully automatic page segmentation
            '--oem 3 --psm 6',  # Uniform block of text
            '--oem 3 --psm 8',  # Single word
            '--oem 3 --psm 13', # Raw line. Treat the image as a single text line
        ]
        
        # Try to detect Tesseract installation and available languages
        try:
            pytesseract.get_tesseract_version()
            # Get actually available languages from Tesseract
            available_langs = pytesseract.get_languages()
            # Update supported languages with actually available ones
            self.supported_languages = [lang for lang in self.supported_languages if lang in available_langs]
            logger.info(f"Tesseract OCR initialized successfully")
            logger.info(f"Available languages: {available_langs}")
            logger.info(f"Supported languages: {self.supported_languages}")
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
                        auto_rotate: bool = True, improve_readability: bool = False) -> Optional[np.ndarray]:
        """
        Preprocess image for better OCR results with advanced readability improvements
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
            
            # Advanced readability improvements
            if improve_readability:
                gray = self.enhance_readability(gray)
            
            # Enhance contrast if requested
            if enhance_contrast:
                # Apply CLAHE (Contrast Limited Adaptive Histogram Equalization)
                clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8,8))
                gray = clahe.apply(gray)
            
            # Denoise if requested
            if denoise:
                gray = cv2.medianBlur(gray, 3)
            
            # Apply adaptive threshold for better text separation
            if improve_readability:
                # Use adaptive threshold for better handling of varying lighting
                binary = cv2.adaptiveThreshold(gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, 
                                             cv2.THRESH_BINARY, 11, 2)
            else:
                # Use Otsu's method for simple cases
                _, binary = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
            
            return binary
            
        except Exception as e:
            logger.error(f"Error preprocessing image {image_path}: {str(e)}")
            return None
    
    def enhance_readability(self, image: np.ndarray) -> np.ndarray:
        """
        Apply advanced image processing techniques to improve text readability
        """
        try:
            # 1. Noise reduction with bilateral filter (preserves edges)
            filtered = cv2.bilateralFilter(image, 9, 75, 75)
            
            # 2. Morphological operations to clean up text
            # Remove small noise
            kernel_noise = np.ones((2, 2), np.uint8)
            filtered = cv2.morphologyEx(filtered, cv2.MORPH_OPEN, kernel_noise)
            
            # 3. Enhance text contrast
            # Apply gamma correction for better contrast
            gamma = 1.2
            filtered = np.power(filtered / 255.0, gamma) * 255.0
            filtered = np.uint8(filtered)
            
            # 4. Sharpen text edges
            kernel_sharpen = np.array([[-1, -1, -1],
                                     [-1,  9, -1],
                                     [-1, -1, -1]])
            sharpened = cv2.filter2D(filtered, -1, kernel_sharpen)
            
            # 5. Combine original and sharpened image
            enhanced = cv2.addWeighted(filtered, 0.7, sharpened, 0.3, 0)
            
            # 6. Final cleanup - remove isolated pixels
            kernel_cleanup = np.ones((3, 3), np.uint8)
            enhanced = cv2.morphologyEx(enhanced, cv2.MORPH_CLOSE, kernel_cleanup)
            
            logger.info("Applied readability enhancements: noise reduction, contrast enhancement, edge sharpening")
            return enhanced
            
        except Exception as e:
            logger.warning(f"Readability enhancement failed: {str(e)}")
            return image
    
    def post_process_text(self, text: str) -> str:
        """
        Post-process extracted text to improve readability and accuracy
        """
        try:
            if not text:
                return text
            
            # 1. Remove excessive whitespace
            text = ' '.join(text.split())
            
            # 2. Fix common OCR errors
            text = self.fix_common_ocr_errors(text)
            
            # 3. Improve punctuation
            text = self.improve_punctuation(text)
            
            # 4. Fix line breaks and formatting
            text = self.fix_line_breaks(text)
            
            logger.info("Applied text post-processing for better readability")
            return text.strip()
            
        except Exception as e:
            logger.warning(f"Text post-processing failed: {str(e)}")
            return text
    
    def fix_common_ocr_errors(self, text: str) -> str:
        """
        Fix common OCR character recognition errors
        """
        # Common OCR error mappings
        ocr_fixes = {
            # Numbers and letters confusion
            '0': 'O',  # Zero to letter O (context-dependent)
            '1': 'l',  # One to lowercase l (context-dependent)
            '5': 'S',  # Five to letter S (context-dependent)
            '8': 'B',  # Eight to letter B (context-dependent)
            
            # Common character confusions
            'rn': 'm',  # rn often misread as m
            'cl': 'd',  # cl often misread as d
            'li': 'h',  # li often misread as h
            
            # Punctuation fixes
            '|': 'l',   # Pipe to lowercase l
            '`': "'",   # Backtick to apostrophe
            '"': '"',   # Straight quotes to curly quotes
            '"': '"',   # Straight quotes to curly quotes
            ''': "'",   # Straight apostrophe to curly
            ''': "'",   # Straight apostrophe to curly
        }
        
        # Apply fixes (be careful with context)
        for error, correction in ocr_fixes.items():
            # Only replace if it makes sense in context
            if error in text:
                # Simple replacement for now - could be made more sophisticated
                text = text.replace(error, correction)
        
        return text
    
    def improve_punctuation(self, text: str) -> str:
        """
        Improve punctuation and spacing
        """
        import re
        
        # Fix spacing around punctuation
        text = re.sub(r'\s+([,.!?;:])', r'\1', text)  # Remove space before punctuation
        text = re.sub(r'([,.!?;:])([A-Za-z])', r'\1 \2', text)  # Add space after punctuation
        
        # Fix multiple spaces
        text = re.sub(r'\s+', ' ', text)
        
        # Fix capitalization after periods
        sentences = text.split('. ')
        if len(sentences) > 1:
            sentences = [sentences[0]] + [s.capitalize() for s in sentences[1:]]
            text = '. '.join(sentences)
        
        return text
    
    def fix_line_breaks(self, text: str) -> str:
        """
        Fix line breaks and paragraph formatting
        """
        # Replace multiple newlines with single newline
        text = re.sub(r'\n+', '\n', text)
        
        # Remove trailing whitespace from lines
        lines = text.split('\n')
        lines = [line.rstrip() for line in lines]
        text = '\n'.join(lines)
        
        # Remove empty lines at the beginning and end
        text = text.strip()
        
        return text
    
    def extract_text_with_multiple_configs(self, image_path: str, language: str = None, 
                                          preprocess: bool = True, auto_rotate: bool = True,
                                          improve_readability: bool = False, post_process: bool = True) -> Dict[str, Any]:
        """
        Extract text using multiple OCR configurations and return the best result
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
            
            # Preprocess image if requested
            if preprocess:
                processed_img = self.preprocess_image(image_path, auto_rotate=auto_rotate, 
                                                    improve_readability=improve_readability)
                if processed_img is None:
                    return {
                        "success": False,
                        "error": "Failed to preprocess image",
                        "text": "",
                        "confidence": 0.0,
                        "processing_time": 0.0
                    }
                pil_image = Image.fromarray(processed_img)
            else:
                pil_image = Image.open(image_path)
            
            best_result = None
            best_confidence = 0
            
            # Try each configuration
            for config in self.alternative_configs:
                try:
                    # Extract text with confidence scores
                    data = pytesseract.image_to_data(pil_image, lang=language, config=config, output_type=pytesseract.Output.DICT)
                    
                    # Extract text
                    text = pytesseract.image_to_string(pil_image, lang=language, config=config)
                    
                    # Post-process text for better readability
                    if post_process:
                        text = self.post_process_text(text)
                    
                    # Calculate average confidence
                    confidences = [int(conf) for conf in data['conf'] if int(conf) > 0]
                    avg_confidence = sum(confidences) / len(confidences) if confidences else 0.0
                    
                    # Check if this is the best result so far
                    if avg_confidence > best_confidence and len(text.strip()) > 0:
                        best_confidence = avg_confidence
                        best_result = {
                            "text": text.strip(),
                            "confidence": avg_confidence,
                            "config": config,
                            "raw_data": data
                        }
                        
                        logger.info(f"Better OCR result found with config '{config}': confidence {avg_confidence:.1f}%, text length {len(text)}")
                
                except Exception as e:
                    logger.debug(f"OCR failed with config '{config}': {str(e)}")
                    continue
            
            processing_time = time.time() - start_time
            
            if best_result:
                logger.info(f"Best OCR result: {len(best_result['text'])} characters, confidence: {best_result['confidence']:.1f}%, config: {best_result['config']}, time: {processing_time:.3f}s")
                
                return {
                    "success": True,
                    "text": best_result['text'],
                    "confidence": best_result['confidence'],
                    "language": language,
                    "word_count": len(best_result['text'].split()),
                    "character_count": len(best_result['text']),
                    "processing_time": processing_time,
                    "raw_data": best_result['raw_data'],
                    "config_used": best_result['config']
                }
            else:
                logger.warning(f"No valid OCR results found for {image_path}")
                return {
                    "success": False,
                    "error": "No valid text could be extracted with any configuration",
                    "text": "",
                    "confidence": 0.0,
                    "processing_time": processing_time
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

    def extract_text(self, image_path: str, language: str = None, 
                    preprocess: bool = True, config: str = None, auto_rotate: bool = True,
                    improve_readability: bool = False, post_process: bool = True) -> Dict[str, Any]:
        """
        Extract text from image using Tesseract OCR with advanced readability improvements
        
        Args:
            image_path: Path to the image file
            language: Language code for OCR (default: 'eng')
            preprocess: Whether to preprocess image for better results
            config: Custom Tesseract configuration (if None, will try multiple configs)
            auto_rotate: Whether to automatically detect and correct text rotation
            improve_readability: Whether to apply advanced readability enhancements
            post_process: Whether to post-process extracted text for better readability
            
        Returns:
            Dictionary with extracted text and metadata
        """
        # If no specific config is provided, use multiple configs for better results
        if config is None:
            logger.info(f"Using multiple OCR configurations for better results on {os.path.basename(image_path)}")
            return self.extract_text_with_multiple_configs(
                image_path, language, preprocess, auto_rotate, improve_readability, post_process
            )
        
        # Use single configuration as specified
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
            
            # Preprocess image if requested
            if preprocess:
                processed_img = self.preprocess_image(image_path, auto_rotate=auto_rotate, 
                                                    improve_readability=improve_readability)
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
            
            # Post-process text for better readability
            if post_process:
                text = self.post_process_text(text)
            
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
                "raw_data": data,
                "config_used": config
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
                               preprocess: bool = True, config: str = None, auto_rotate: bool = True,
                               improve_readability: bool = False, post_process: bool = True) -> Dict[str, Any]:
        """
        Extract text with bounding box information and advanced readability improvements
        
        Args:
            image_path: Path to the image file
            language: Language code for OCR (default: 'eng')
            preprocess: Whether to preprocess image for better results
            config: Custom Tesseract configuration
            auto_rotate: Whether to automatically detect and correct text rotation
            improve_readability: Whether to apply advanced readability enhancements
            post_process: Whether to post-process extracted text for better readability
        
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
                processed_img = self.preprocess_image(image_path, auto_rotate=auto_rotate, 
                                                    improve_readability=improve_readability)
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
            
            # Post-process text for better readability
            if post_process:
                text = self.post_process_text(text)
            
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
    
    def detect_language(self, image_path: str, preprocess: bool = True, auto_rotate: bool = True,
                       improve_readability: bool = False) -> str:
        """
        Automatically detect the language of text in an image by trying all supported languages
        and selecting the one with the best confidence score.
        
        Args:
            image_path: Path to the image file
            preprocess: Whether to preprocess image for better results
            auto_rotate: Whether to automatically detect and correct text rotation
            improve_readability: Whether to apply advanced readability enhancements
            
        Returns:
            Best detected language code
        """
        try:
            logger.info(f"Auto-detecting language for {os.path.basename(image_path)}")
            
            # Preprocess image once if requested
            if preprocess:
                processed_img = self.preprocess_image(image_path, auto_rotate=auto_rotate, 
                                                    improve_readability=improve_readability)
                if processed_img is None:
                    logger.warning("Failed to preprocess image for language detection, using original")
                    pil_image = Image.open(image_path)
                else:
                    pil_image = Image.fromarray(processed_img)
            else:
                pil_image = Image.open(image_path)
            
            best_language = self.default_language
            best_confidence = 0
            best_text_length = 0
            
            # Try each supported language
            for language in self.supported_languages:
                try:
                    # Use a simple configuration for language detection
                    config = '--oem 3 --psm 6'
                    
                    # Extract text with confidence scores
                    data = pytesseract.image_to_data(pil_image, lang=language, config=config, 
                                                   output_type=pytesseract.Output.DICT)
                    
                    # Calculate average confidence and text length
                    confidences = [int(conf) for conf in data['conf'] if int(conf) > 0]
                    avg_confidence = sum(confidences) / len(confidences) if confidences else 0.0
                    
                    # Extract text to check length
                    text = pytesseract.image_to_string(pil_image, lang=language, config=config)
                    text_length = len(text.strip())
                    
                    # Score based on confidence and text length
                    # Prefer languages that produce more text with good confidence
                    score = avg_confidence * (1 + text_length / 100)  # Boost score for longer text
                    
                    logger.debug(f"Language '{language}': confidence={avg_confidence:.1f}%, "
                               f"text_length={text_length}, score={score:.1f}")
                    
                    # Update best language if this one is better
                    if score > best_confidence and text_length > 0:
                        best_confidence = score
                        best_language = language
                        best_text_length = text_length
                        
                except Exception as e:
                    logger.debug(f"Language detection failed for '{language}': {str(e)}")
                    continue
            
            logger.info(f"Auto-detected language: '{best_language}' (confidence score: {best_confidence:.1f}, "
                       f"text length: {best_text_length})")
            
            return best_language
            
        except Exception as e:
            logger.warning(f"Language auto-detection failed: {str(e)}, using default language")
            return self.default_language

    def extract_text_auto_language(self, image_path: str, preprocess: bool = True, 
                                  auto_rotate: bool = True, improve_readability: bool = False, 
                                  post_process: bool = True) -> Dict[str, Any]:
        """
        Extract text from image with automatic language detection
        
        Args:
            image_path: Path to the image file
            preprocess: Whether to preprocess image for better results
            auto_rotate: Whether to automatically detect and correct text rotation
            improve_readability: Whether to apply advanced readability enhancements
            post_process: Whether to post-process extracted text for better readability
            
        Returns:
            Dictionary with extracted text, detected language, and metadata
        """
        start_time = time.time()
        
        try:
            # Auto-detect language
            detected_language = self.detect_language(image_path, preprocess, auto_rotate, improve_readability)
            
            # Extract text using the detected language
            result = self.extract_text(image_path, language=detected_language, preprocess=preprocess,
                                     auto_rotate=auto_rotate, improve_readability=improve_readability,
                                     post_process=post_process)
            
            # Add detected language info to result
            if result.get("success", False):
                result["detected_language"] = detected_language
                result["language_auto_detected"] = True
                logger.info(f"Text extracted using auto-detected language '{detected_language}': "
                           f"{result.get('character_count', 0)} characters, "
                           f"confidence: {result.get('confidence', 0):.1f}%")
            
            return result
            
        except Exception as e:
            processing_time = time.time() - start_time
            logger.error(f"Auto-language OCR error for {image_path}: {str(e)}", exc_info=True)
            return {
                "success": False,
                "error": str(e),
                "text": "",
                "confidence": 0.0,
                "processing_time": processing_time,
                "detected_language": self.default_language,
                "language_auto_detected": False
            }

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
