const axios = require('axios');
const path = require('path');

class OCRService {
    constructor() {
        // Use 127.0.0.1 for Docker container communication
        this.baseURL = process.env.OPENCV_SERVICE_URL || 'http://127.0.0.1:5001';
        this.timeout = 60000; // 60 seconds timeout for OCR (longer than feature matching)
    }

    /**
     * Check if the OCR service is healthy
     * @returns {Promise<boolean>}
     */
    async isHealthy() {
        try {
            const response = await axios.get(`${this.baseURL}/ocr/info`, {
                timeout: 5000
            });
            return response.status === 200 && response.data.success;
        } catch (error) {
            console.error('OCR service health check failed:', error.message);
            return false;
        }
    }

    /**
     * Get supported OCR languages
     * @returns {Promise<Object>} - Languages information
     */
    async getSupportedLanguages() {
        try {
            const response = await axios.get(`${this.baseURL}/ocr/languages`, {
                timeout: 10000
            });

            if (response.data.success) {
                return {
                    success: true,
                    languages: response.data.languages,
                    defaultLanguage: response.data.default_language
                };
            } else {
                return {
                    success: false,
                    error: response.data.error
                };
            }
        } catch (error) {
            console.error('❌ Failed to get supported languages:', error.message);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Get OCR service information
     * @returns {Promise<Object>} - OCR service info
     */
    async getOCRInfo() {
        try {
            const response = await axios.get(`${this.baseURL}/ocr/info`, {
                timeout: 10000
            });

            return response.data;
        } catch (error) {
            console.error('❌ Failed to get OCR info:', error.message);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Extract text from image using OCR
     * @param {string} imagePath - Path to the image file
     * @param {Object} options - OCR options
     * @param {string} options.language - Language code (default: 'eng')
     * @param {boolean} options.preprocess - Whether to preprocess image (default: true)
     * @param {string} options.config - Custom Tesseract configuration
     * @returns {Promise<Object>} - OCR result
     */
    async extractText(imagePath, options = {}) {
        try {
            // Convert relative path to absolute path
            const absolutePath = path.isAbsolute(imagePath) ? imagePath : path.resolve(imagePath);
            console.log(`🔍 Extracting text from: ${imagePath} (absolute: ${absolutePath})`);
            
            const requestData = {
                image_path: absolutePath,
                language: options.language || 'eng',
                preprocess: options.preprocess !== false, // default to true
                config: options.config || null
            };

            const response = await axios.post(`${this.baseURL}/ocr/extract`, requestData, {
                timeout: this.timeout
            });

            if (response.data.success) {
                console.log(`✅ Text extracted successfully: ${response.data.character_count} characters, confidence: ${response.data.confidence.toFixed(1)}%`);
                return {
                    success: true,
                    text: response.data.text,
                    confidence: response.data.confidence,
                    language: response.data.language,
                    wordCount: response.data.word_count,
                    characterCount: response.data.character_count,
                    processingTime: response.data.processing_time,
                    totalProcessingTime: response.data.total_processing_time
                };
            } else {
                console.error('❌ Text extraction failed:', response.data.error);
                return {
                    success: false,
                    error: response.data.error,
                    text: '',
                    confidence: 0
                };
            }
        } catch (error) {
            console.error('❌ OCR service error:', error.message);
            return {
                success: false,
                error: error.message,
                text: '',
                confidence: 0
            };
        }
    }

    /**
     * Extract text with bounding boxes from image using OCR
     * @param {string} imagePath - Path to the image file
     * @param {Object} options - OCR options
     * @param {string} options.language - Language code (default: 'eng')
     * @param {boolean} options.preprocess - Whether to preprocess image (default: true)
     * @param {string} options.config - Custom Tesseract configuration
     * @returns {Promise<Object>} - OCR result with bounding boxes
     */
    async extractTextWithBoxes(imagePath, options = {}) {
        try {
            // Convert relative path to absolute path
            const absolutePath = path.isAbsolute(imagePath) ? imagePath : path.resolve(imagePath);
            console.log(`🔍 Extracting text with boxes from: ${imagePath} (absolute: ${absolutePath})`);
            
            const requestData = {
                image_path: absolutePath,
                language: options.language || 'eng',
                preprocess: options.preprocess !== false, // default to true
                config: options.config || null
            };

            const response = await axios.post(`${this.baseURL}/ocr/extract-with-boxes`, requestData, {
                timeout: this.timeout
            });

            if (response.data.success) {
                console.log(`✅ Text with boxes extracted successfully: ${response.data.boxes.length} text regions, ${response.data.character_count} characters`);
                return {
                    success: true,
                    text: response.data.text,
                    boxes: response.data.boxes,
                    language: response.data.language,
                    wordCount: response.data.word_count,
                    characterCount: response.data.character_count,
                    processingTime: response.data.processing_time,
                    totalProcessingTime: response.data.total_processing_time
                };
            } else {
                console.error('❌ Text extraction with boxes failed:', response.data.error);
                return {
                    success: false,
                    error: response.data.error,
                    text: '',
                    boxes: []
                };
            }
        } catch (error) {
            console.error('❌ OCR service error:', error.message);
            return {
                success: false,
                error: error.message,
                text: '',
                boxes: []
            };
        }
    }

    /**
     * Extract text from multiple images
     * @param {Array<string>} imagePaths - Array of image paths
     * @param {Object} options - OCR options
     * @returns {Promise<Array<Object>>} - Array of OCR results
     */
    async extractTextFromMultiple(imagePaths, options = {}) {
        try {
            console.log(`🔍 Extracting text from ${imagePaths.length} images`);
            
            const results = await Promise.all(
                imagePaths.map(async (imagePath) => {
                    const result = await this.extractText(imagePath, options);
                    return {
                        imagePath,
                        ...result
                    };
                })
            );

            const successful = results.filter(r => r.success).length;
            console.log(`✅ Text extraction completed: ${successful}/${imagePaths.length} successful`);

            return results;
        } catch (error) {
            console.error('❌ Multiple text extraction error:', error.message);
            return imagePaths.map(imagePath => ({
                imagePath,
                success: false,
                error: error.message,
                text: '',
                confidence: 0
            }));
        }
    }

    /**
     * Search for specific text in image
     * @param {string} imagePath - Path to the image file
     * @param {string} searchText - Text to search for
     * @param {Object} options - OCR options
     * @returns {Promise<Object>} - Search result
     */
    async searchTextInImage(imagePath, searchText, options = {}) {
        try {
            const ocrResult = await this.extractText(imagePath, options);
            
            if (!ocrResult.success) {
                return {
                    success: false,
                    error: ocrResult.error,
                    found: false,
                    matches: []
                };
            }

            const text = ocrResult.text.toLowerCase();
            const searchLower = searchText.toLowerCase();
            
            // Find all occurrences
            const matches = [];
            let index = text.indexOf(searchLower);
            while (index !== -1) {
                matches.push({
                    position: index,
                    text: ocrResult.text.substring(index, index + searchText.length)
                });
                index = text.indexOf(searchLower, index + 1);
            }

            return {
                success: true,
                found: matches.length > 0,
                matches: matches,
                totalText: ocrResult.text,
                confidence: ocrResult.confidence
            };
        } catch (error) {
            console.error('❌ Text search error:', error.message);
            return {
                success: false,
                error: error.message,
                found: false,
                matches: []
            };
        }
    }

    /**
     * Extract text and save to file
     * @param {string} imagePath - Path to the image file
     * @param {string} outputPath - Path to save the extracted text
     * @param {Object} options - OCR options
     * @returns {Promise<Object>} - Save result
     */
    async extractTextAndSave(imagePath, outputPath, options = {}) {
        try {
            const ocrResult = await this.extractText(imagePath, options);
            
            if (!ocrResult.success) {
                return {
                    success: false,
                    error: ocrResult.error
                };
            }

            const fs = require('fs').promises;
            await fs.writeFile(outputPath, ocrResult.text, 'utf8');

            console.log(`✅ Text saved to: ${outputPath}`);
            return {
                success: true,
                text: ocrResult.text,
                outputPath: outputPath,
                characterCount: ocrResult.characterCount,
                confidence: ocrResult.confidence
            };
        } catch (error) {
            console.error('❌ Text save error:', error.message);
            return {
                success: false,
                error: error.message
            };
        }
    }
}

module.exports = new OCRService();
