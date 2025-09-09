-- ArchivArt Complete Database Migration
-- This script creates all tables and inserts admin + dummy users

-- Create database (if not exists)
CREATE DATABASE IF NOT EXISTS archivart;
USE archivart;

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255),
    auth_provider ENUM('local', 'google', 'facebook') DEFAULT 'local',
    provider_id VARCHAR(255),
    role ENUM('admin', 'user') DEFAULT 'user',
    is_active BOOLEAN DEFAULT true,
    is_blocked BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Media table
CREATE TABLE IF NOT EXISTS media (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    scanning_image VARCHAR(255) UNIQUE NOT NULL,
    image_hash VARCHAR(64) NULL COMMENT 'SHA-256 hash of the scanning image content for duplicate detection',
    media_type ENUM('image', 'video', 'audio') NOT NULL,
    file_path VARCHAR(255) NOT NULL,
    file_size BIGINT,
    mime_type VARCHAR(100),
    uploaded_by INT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_media_image_hash (image_hash)
);

-- User sessions table (for JWT token management)
CREATE TABLE IF NOT EXISTS user_sessions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    token_hash VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Insert admin user (password: admin123)
INSERT INTO users (name, email, password, role, auth_provider) VALUES 
('Admin User', 'admin@archivart.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin', 'local')
ON DUPLICATE KEY UPDATE name = VALUES(name);

-- Insert dummy users (password for all: password123)
INSERT INTO users (name, email, password, role, auth_provider, is_active, is_blocked) VALUES 
('John Smith', 'john.smith@example.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'user', 'local', true, false),
('Sarah Johnson', 'sarah.johnson@example.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'user', 'local', true, false),
('Michael Brown', 'michael.brown@example.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'user', 'local', true, false),
('Emily Davis', 'emily.davis@example.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'user', 'local', true, false),
('David Wilson', 'david.wilson@example.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'user', 'local', true, false),
('Lisa Anderson', 'lisa.anderson@example.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'user', 'local', true, false),
('Robert Taylor', 'robert.taylor@example.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'user', 'local', true, false),
('Jennifer Martinez', 'jennifer.martinez@example.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'user', 'local', true, false),
('Christopher Garcia', 'christopher.garcia@example.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'user', 'local', true, false),
('Amanda Rodriguez', 'amanda.rodriguez@example.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'user', 'local', true, false),
('James Lee', 'james.lee@example.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'user', 'local', true, false),
('Michelle White', 'michelle.white@example.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'user', 'local', true, false),
('Daniel Harris', 'daniel.harris@example.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'user', 'local', false, false),
('Jessica Thompson', 'jessica.thompson@example.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'user', 'local', true, true)
ON DUPLICATE KEY UPDATE name = VALUES(name);

-- Insert some sample media entries
INSERT INTO media (title, description, scanning_image, image_hash, media_type, file_path, file_size, mime_type, uploaded_by, is_active) VALUES 
('Welcome Video', 'Welcome message for new users', 'welcome_scan.jpg', 'a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6', 'video', 'uploads/media/welcome.mp4', 15728640, 'video/mp4', 1, true),
('Product Demo', 'Interactive product demonstration', 'product_demo_scan.png', 'b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a1', 'video', 'uploads/media/product_demo.mp4', 25165824, 'video/mp4', 1, true),
('Background Music', 'Ambient background music', 'music_scan.jpg', 'c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a1b2', 'audio', 'uploads/media/background.mp3', 5242880, 'audio/mpeg', 1, true),
('Tutorial Guide', 'Step-by-step tutorial video', 'tutorial_scan.png', 'd4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a1b2c3', 'video', 'uploads/media/tutorial.mp4', 31457280, 'video/mp4', 2, true),
('Company Logo', 'Company branding image', 'logo_scan.jpg', 'e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a1b2c3d4', 'image', 'uploads/media/logo.png', 1048576, 'image/png', 2, true)
ON DUPLICATE KEY UPDATE title = VALUES(title);

-- Create indexes for better performance (MySQL doesn't support IF NOT EXISTS for indexes)
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_is_active ON users(is_active);
CREATE INDEX idx_users_is_blocked ON users(is_blocked);
CREATE INDEX idx_media_scanning_image ON media(scanning_image);
CREATE INDEX idx_media_type ON media(media_type);
CREATE INDEX idx_media_uploaded_by ON media(uploaded_by);
CREATE INDEX idx_media_is_active ON media(is_active);
CREATE INDEX idx_sessions_user ON user_sessions(user_id);
CREATE INDEX idx_sessions_expires ON user_sessions(expires_at);

-- Show summary
SELECT 'Migration completed successfully!' as status;
SELECT COUNT(*) as total_users FROM users;
SELECT COUNT(*) as total_media FROM media;
SELECT role, COUNT(*) as count FROM users GROUP BY role;
