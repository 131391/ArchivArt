-- Migration script to replace perceptual hash with OpenCV descriptors
-- This script updates the media table to use OpenCV ORB descriptors instead of perceptual hash

-- Add descriptors column to store OpenCV ORB descriptors as JSON
ALTER TABLE media ADD COLUMN descriptors TEXT COMMENT 'OpenCV ORB descriptors stored as JSON';

-- Copy existing image_hash data to descriptors (if any exists)
-- Note: This is a placeholder migration since perceptual hash and ORB descriptors are incompatible
-- Existing media will need to have their descriptors regenerated using the OpenCV service

-- Update existing records to have null descriptors (they will be regenerated on next update)
UPDATE media SET descriptors = NULL WHERE descriptors IS NULL;

-- Create index on descriptors for faster queries (optional, since it's JSON)
-- ALTER TABLE media ADD INDEX idx_descriptors (descriptors(100));

-- Note: The image_hash column is kept for now to maintain backward compatibility
-- It can be removed in a future migration after confirming all descriptors are properly generated

-- Add comment to the table
ALTER TABLE media COMMENT = 'Media table with OpenCV ORB descriptors for feature matching';

-- Show the updated table structure
DESCRIBE media;
