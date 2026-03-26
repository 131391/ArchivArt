const tesseractOcrService = require('./ocrService');
const googleOcrService = require('./googleOcrService');

class OcrProviderService {
    getActiveProviderName() {
        return (process.env.OCR_PROVIDER || 'tesseract').trim().toLowerCase();
    }

    getProvider(name = this.getActiveProviderName()) {
        if (name === 'google') {
            return googleOcrService;
        }
        return tesseractOcrService;
    }

    async extractText(imagePath, options = {}) {
        const activeProviderName = this.getActiveProviderName();
        const activeProvider = this.getProvider(activeProviderName);

        let result = await activeProvider.extractText(imagePath, options);
        if (result?.success) {
            return {
                ...result,
                provider: activeProviderName
            };
        }

        const fallbackProviderName = (process.env.OCR_FALLBACK_PROVIDER || '').trim().toLowerCase();
        if (!fallbackProviderName || fallbackProviderName === activeProviderName) {
            return result;
        }

        const fallbackProvider = this.getProvider(fallbackProviderName);
        const fallbackResult = await fallbackProvider.extractText(imagePath, options);
        if (fallbackResult?.success) {
            return {
                ...fallbackResult,
                provider: fallbackProviderName
            };
        }

        return {
            ...(result || {}),
            fallbackError: fallbackResult?.error || null
        };
    }

    async isHealthy() {
        const provider = this.getProvider();
        if (typeof provider.isHealthy === 'function') {
            return provider.isHealthy();
        }
        return true;
    }

    getConfig() {
        return {
            provider: this.getActiveProviderName(),
            fallbackProvider: (process.env.OCR_FALLBACK_PROVIDER || '').trim().toLowerCase() || null
        };
    }
}

module.exports = new OcrProviderService();
