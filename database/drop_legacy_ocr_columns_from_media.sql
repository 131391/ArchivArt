-- Drop legacy OCR columns from media table
-- OCR data is now stored in media_ocr_results

SET @db := DATABASE();

SET @q := IF(
    EXISTS(
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = @db AND table_name = 'media' AND column_name = 'ocr_extracted_text'
    ),
    'ALTER TABLE media DROP COLUMN ocr_extracted_text',
    'SELECT 1'
);
PREPARE stmt FROM @q;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @q := IF(
    EXISTS(
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = @db AND table_name = 'media' AND column_name = 'ocr_confidence'
    ),
    'ALTER TABLE media DROP COLUMN ocr_confidence',
    'SELECT 1'
);
PREPARE stmt FROM @q;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @q := IF(
    EXISTS(
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = @db AND table_name = 'media' AND column_name = 'ocr_language'
    ),
    'ALTER TABLE media DROP COLUMN ocr_language',
    'SELECT 1'
);
PREPARE stmt FROM @q;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @q := IF(
    EXISTS(
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = @db AND table_name = 'media' AND column_name = 'ocr_processed_at'
    ),
    'ALTER TABLE media DROP COLUMN ocr_processed_at',
    'SELECT 1'
);
PREPARE stmt FROM @q;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
