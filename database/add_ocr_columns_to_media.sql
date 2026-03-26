-- Add OCR support columns to media table
-- Compatible with servers that do not support ALTER TABLE ... ADD COLUMN IF NOT EXISTS

SET @db := DATABASE();

SET @q := IF(
    EXISTS(
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = @db AND table_name = 'media' AND column_name = 'ocr_extracted_text'
    ),
    'SELECT 1',
    'ALTER TABLE media ADD COLUMN ocr_extracted_text LONGTEXT NULL COMMENT ''OCR text extracted from scanning image'''
);
PREPARE stmt FROM @q;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @q := IF(
    EXISTS(
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = @db AND table_name = 'media' AND column_name = 'ocr_confidence'
    ),
    'SELECT 1',
    'ALTER TABLE media ADD COLUMN ocr_confidence DECIMAL(6,2) NULL COMMENT ''OCR confidence percentage'''
);
PREPARE stmt FROM @q;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @q := IF(
    EXISTS(
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = @db AND table_name = 'media' AND column_name = 'ocr_language'
    ),
    'SELECT 1',
    'ALTER TABLE media ADD COLUMN ocr_language VARCHAR(16) NULL COMMENT ''Detected OCR language'''
);
PREPARE stmt FROM @q;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @q := IF(
    EXISTS(
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = @db AND table_name = 'media' AND column_name = 'ocr_processed_at'
    ),
    'SELECT 1',
    'ALTER TABLE media ADD COLUMN ocr_processed_at TIMESTAMP NULL COMMENT ''When OCR extraction ran'''
);
PREPARE stmt FROM @q;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

