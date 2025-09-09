-- Update media table to use perceptual hash instead of SHA-256
-- This migration changes the image_hash column to store perceptual hashes

-- Modify the column to store perceptual hash (longer hex string)
ALTER TABLE media 
MODIFY COLUMN image_hash VARCHAR(64) NULL COMMENT 'Perceptual hash (pHash) of the scanning image content for similarity detection';
