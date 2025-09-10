-- Settings table for ArchivArt application
CREATE TABLE IF NOT EXISTS settings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    site_name VARCHAR(255) DEFAULT 'ArchivArt',
    site_tagline VARCHAR(500) DEFAULT NULL,
    primary_color VARCHAR(7) DEFAULT '#4f46e5',
    logo_path VARCHAR(500) DEFAULT NULL,
    max_file_size INT DEFAULT 100,
    max_uploads_per_day INT DEFAULT 50,
    aws_bucket VARCHAR(255) DEFAULT 'archivart-media',
    aws_region VARCHAR(50) DEFAULT 'us-east-1',
    jwt_expiry INT DEFAULT 24,
    session_timeout INT DEFAULT 24,
    smtp_host VARCHAR(255) DEFAULT NULL,
    smtp_port INT DEFAULT NULL,
    smtp_user VARCHAR(255) DEFAULT NULL,
    smtp_password VARCHAR(255) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Insert default settings
INSERT INTO settings (site_name, site_tagline, primary_color) 
VALUES ('ArchivArt', 'Your Digital Archive Solution', '#4f46e5')
ON DUPLICATE KEY UPDATE site_name = VALUES(site_name);
