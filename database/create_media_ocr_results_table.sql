-- Create dedicated OCR results table for media
-- Keeps OCR lifecycle separate from media matching/playback metadata.

CREATE TABLE IF NOT EXISTS media_ocr_results (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    media_id INT NOT NULL,
    provider VARCHAR(32) NULL COMMENT 'OCR provider (tesseract/google)',
    extracted_text LONGTEXT NULL,
    confidence DECIMAL(6,2) NULL,
    language VARCHAR(16) NULL,
    status ENUM('success', 'failed') NOT NULL DEFAULT 'success',
    error_message TEXT NULL,
    processed_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_media_ocr_media_id (media_id),
    INDEX idx_media_ocr_processed_at (processed_at),
    CONSTRAINT fk_media_ocr_media
        FOREIGN KEY (media_id) REFERENCES media(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Optional backfill from media table OCR columns if they exist
SET @db := DATABASE();
SET @has_legacy_ocr_columns := (
    SELECT CASE WHEN COUNT(*) = 4 THEN 1 ELSE 0 END
    FROM information_schema.columns
    WHERE table_schema = @db
      AND table_name = 'media'
      AND column_name IN ('ocr_extracted_text', 'ocr_confidence', 'ocr_language', 'ocr_processed_at')
);

SET @q := IF(
    @has_legacy_ocr_columns = 1,
    'INSERT INTO media_ocr_results (media_id, provider, extracted_text, confidence, language, status, processed_at) SELECT m.id, ''legacy'', m.ocr_extracted_text, m.ocr_confidence, m.ocr_language, ''success'', COALESCE(m.ocr_processed_at, CURRENT_TIMESTAMP) FROM media m WHERE ((m.ocr_extracted_text IS NOT NULL AND m.ocr_extracted_text != '''') OR m.ocr_confidence IS NOT NULL OR m.ocr_language IS NOT NULL) AND NOT EXISTS (SELECT 1 FROM media_ocr_results r WHERE r.media_id = m.id AND r.provider = ''legacy'')',
    'SELECT 1'
);
PREPARE stmt FROM @q;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
