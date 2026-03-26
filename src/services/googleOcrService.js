const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');

class GoogleOcrService {
    constructor() {
        this.baseURL = 'https://vision.googleapis.com/v1/images:annotate';
        this.timeout = parseInt(process.env.GOOGLE_OCR_TIMEOUT_MS || '30000', 10);
    }

    getApiKey() {
        return process.env.GOOGLE_VISION_API_KEY || '';
    }

    async isHealthy() {
        return Boolean(this.getApiKey());
    }

    async extractText(imagePath, options = {}) {
        try {
            const absolutePath = path.isAbsolute(imagePath) ? imagePath : path.resolve(imagePath);
            const imageBuffer = await fs.readFile(absolutePath);
            return this.extractTextFromBuffer(imageBuffer, options);
        } catch (error) {
            return {
                success: false,
                error: error.message,
                text: '',
                confidence: 0
            };
        }
    }

    async extractTextFromBuffer(imageBuffer, options = {}) {
        try {
            const apiKey = this.getApiKey();
            if (!apiKey) {
                return {
                    success: false,
                    error: 'Google Vision API key is not configured',
                    text: '',
                    confidence: 0
                };
            }

            const imageBase64 = imageBuffer.toString('base64');
            const requestData = {
                requests: [{
                    image: { content: imageBase64 },
                    features: [{ type: 'DOCUMENT_TEXT_DETECTION' }],
                    imageContext: options.language
                        ? { languageHints: [options.language] }
                        : undefined
                }]
            };

            const startedAt = Date.now();
            const response = await axios.post(
                `${this.baseURL}?key=${encodeURIComponent(apiKey)}`,
                requestData,
                {
                    timeout: this.timeout,
                    headers: { 'Content-Type': 'application/json' }
                }
            );

            const first = response.data?.responses?.[0];
            if (!first) {
                return {
                    success: false,
                    error: 'Invalid Google Vision response',
                    text: '',
                    confidence: 0
                };
            }

            if (first.error) {
                return {
                    success: false,
                    error: first.error.message || 'Google Vision OCR failed',
                    text: '',
                    confidence: 0
                };
            }

            const fullText = first.fullTextAnnotation?.text || first.textAnnotations?.[0]?.description || '';
            const confidence = this.calculateAverageConfidence(first.fullTextAnnotation);

            return {
                success: true,
                text: fullText,
                confidence,
                language: options.language || this.detectLanguage(first.fullTextAnnotation) || 'unknown',
                wordCount: fullText.trim() ? fullText.trim().split(/\s+/).length : 0,
                characterCount: fullText.length,
                processingTime: Number(((Date.now() - startedAt) / 1000).toFixed(3)),
                provider: 'google'
            };
        } catch (error) {
            return {
                success: false,
                error: error.response?.data?.error?.message || error.message,
                text: '',
                confidence: 0
            };
        }
    }

    calculateAverageConfidence(fullTextAnnotation) {
        try {
            const pages = fullTextAnnotation?.pages || [];
            const values = [];

            for (const page of pages) {
                for (const block of page.blocks || []) {
                    for (const paragraph of block.paragraphs || []) {
                        for (const word of paragraph.words || []) {
                            if (typeof word.confidence === 'number') {
                                values.push(word.confidence);
                            }
                        }
                    }
                }
            }

            if (!values.length) {
                return 0;
            }

            const avg = values.reduce((sum, value) => sum + value, 0) / values.length;
            return Number((avg * 100).toFixed(2));
        } catch (error) {
            return 0;
        }
    }

    detectLanguage(fullTextAnnotation) {
        try {
            const locale = fullTextAnnotation?.pages?.[0]?.property?.detectedLanguages?.[0]?.languageCode;
            return locale || null;
        } catch (error) {
            return null;
        }
    }
}

module.exports = new GoogleOcrService();
