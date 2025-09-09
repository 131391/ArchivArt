-- Add image hash column to media table for content-based duplicate detection
-- This migration adds a column to store SHA-256 hash of the scanning image content

USE archivart;

-- Add image_hash column to media table
ALTER TABLE media 
ADD COLUMN image_hash VARCHAR(64) NULL AFTER scanning_image;

-- Add index for faster hash lookups
CREATE INDEX idx_media_image_hash ON media(image_hash);

-- Add comment to explain the column
ALTER TABLE media 
MODIFY COLUMN image_hash VARCHAR(64) NULL COMMENT 'SHA-256 hash of the scanning image content for duplicate detection';
