-- =====================================================
-- Add Profile Picture Column Migration
-- =====================================================
-- This script adds the profile_picture column to existing databases
-- Run this if you have an existing database without the profile_picture field
-- =====================================================

USE archivart;

-- Add profile_picture column to users table if it doesn't exist
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS provider_data JSON NULL COMMENT 'Additional provider data (profile picture, etc.)' AFTER provider_id,
ADD COLUMN IF NOT EXISTS profile_picture TEXT NULL COMMENT 'User profile picture URL' AFTER provider_data;

-- Verify the column was added
DESCRIBE users;
