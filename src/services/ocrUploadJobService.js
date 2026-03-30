const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');
const S3Service = require('./s3Service');
const ocrProviderService = require('./ocrProviderService');
const Media = require('../models/Media');
const MediaOcrResult = require('../models/MediaOcrResult');
const db = require('../config/database');

const JOB_TTL_MS = 1000 * 60 * 30; // Keep in-memory job state for 30 minutes.

class OcrUploadJobService {
  constructor() {
    this.jobs = new Map();
  }

  createJob() {
    const jobId = crypto.randomUUID();
    const now = new Date().toISOString();
    this.jobs.set(jobId, {
      job_id: jobId,
      status: 'queued',
      created_at: now,
      updated_at: now,
      image_url: null,
      media_id: null,
      ocr_result_id: null,
      result: null,
      error: null
    });
    this.pruneOldJobs();
    return this.jobs.get(jobId);
  }

  getJob(jobId) {
    return this.jobs.get(jobId) || null;
  }

  updateJob(jobId, patch) {
    const existing = this.jobs.get(jobId);
    if (!existing) return null;
    const updated = {
      ...existing,
      ...patch,
      updated_at: new Date().toISOString()
    };
    this.jobs.set(jobId, updated);
    return updated;
  }

  async queueUploadAndExtract({ file, options = {}, uploadedBy = null }) {
    const uploadResult = await S3Service.uploadFile(file, 'uploads/ocr');
    if (!uploadResult.success || !uploadResult.url) {
      throw new Error(uploadResult.error || 'S3 upload failed');
    }

    const mediaRecord = await Media.create({
      title: `OCR Upload ${new Date().toISOString()}`,
      description: 'Auto-created OCR upload record',
      scanning_image: uploadResult.url,
      media_type: 'image',
      file_path: uploadResult.url,
      file_size: file.size,
      mime_type: file.mimetype,
      uploaded_by: uploadedBy,
      descriptors: null,
      image_hash: null,
      perceptual_hash: null
    });

    const job = this.createJob();
    this.updateJob(job.job_id, {
      status: 'processing',
      image_url: uploadResult.url,
      media_id: mediaRecord.id
    });

    void this.processJob(job.job_id, uploadResult.url, mediaRecord.id, options);

    return this.getJob(job.job_id);
  }

  async processJob(jobId, imagePathOrUrl, mediaId, options = {}) {
    let tempImagePath = null;
    try {
      this.syncProviderConfigFromSettings().catch(() => null);
      let localImagePath = imagePathOrUrl;
      if (typeof imagePathOrUrl === 'string' && /^https?:\/\//i.test(imagePathOrUrl)) {
        tempImagePath = await this.downloadImageToTemp(imagePathOrUrl);
        localImagePath = tempImagePath;
      }

      const ocr = await ocrProviderService.extractText(localImagePath, options);
      const success = Boolean(ocr?.success);

      const saved = await MediaOcrResult.create({
        media_id: mediaId,
        provider: ocr?.provider || null,
        extracted_text: ocr?.text || null,
        confidence: ocr?.confidence ?? null,
        language: ocr?.language || null,
        status: success ? 'success' : 'failed',
        error_message: success ? null : (ocr?.error || ocr?.fallbackError || 'OCR extraction failed'),
        processed_at: new Date()
      });

      this.updateJob(jobId, {
        status: success ? 'completed' : 'failed',
        ocr_result_id: saved?.id || null,
        result: {
          success,
          provider: ocr?.provider || null,
          text: ocr?.text || '',
          confidence: ocr?.confidence || 0,
          language: ocr?.language || null,
          word_count: ocr?.wordCount || 0,
          character_count: ocr?.characterCount || 0,
          processing_time: ocr?.processingTime || null,
          error: ocr?.error || null,
          fallback_error: ocr?.fallbackError || null
        },
        error: success ? null : (ocr?.error || ocr?.fallbackError || null)
      });
    } catch (error) {
      await this.persistFailure(mediaId, error);
      this.updateJob(jobId, {
        status: 'failed',
        error: error.message || 'OCR job failed'
      });
    } finally {
      if (tempImagePath) {
        try {
          fs.unlinkSync(tempImagePath);
        } catch (_) {
          // Non-fatal cleanup.
        }
      }
    }
  }

  async persistFailure(mediaId, error) {
    if (!mediaId) return;
    try {
      await MediaOcrResult.create({
        media_id: mediaId,
        provider: null,
        extracted_text: null,
        confidence: null,
        language: null,
        status: 'failed',
        error_message: error.message || 'OCR job failed',
        processed_at: new Date()
      });
    } catch (_) {
      // Non-fatal fallback path.
    }
  }

  async syncProviderConfigFromSettings() {
    const [rows] = await db.execute(
      'SELECT ocr_provider, ocr_fallback_provider FROM settings ORDER BY id ASC LIMIT 1'
    );
    if (!rows.length) return;
    process.env.OCR_PROVIDER = (rows[0].ocr_provider || process.env.OCR_PROVIDER || 'tesseract').trim().toLowerCase();
    process.env.OCR_FALLBACK_PROVIDER = (rows[0].ocr_fallback_provider || '').trim().toLowerCase();
  }

  pruneOldJobs() {
    const threshold = Date.now() - JOB_TTL_MS;
    for (const [id, job] of this.jobs.entries()) {
      const ts = new Date(job.updated_at || job.created_at || Date.now()).getTime();
      if (ts < threshold) this.jobs.delete(id);
    }
  }

  async downloadImageToTemp(imageUrl) {
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Unable to download image URL (status: ${response.status})`);
    }

    const contentType = (response.headers.get('content-type') || '').toLowerCase();
    if (!contentType.startsWith('image/')) {
      throw new Error('Uploaded image URL is not a valid image resource');
    }

    const tempFileName = `ocr-upload-${Date.now()}-${Math.random().toString(36).slice(2)}.img`;
    const tempPath = path.join(os.tmpdir(), tempFileName);
    const buffer = Buffer.from(await response.arrayBuffer());
    fs.writeFileSync(tempPath, buffer);
    return tempPath;
  }
}

module.exports = new OcrUploadJobService();
