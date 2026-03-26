-- Assign super_admin role to a specific user email (idempotent)
-- Usage:
--   1) Edit @target_email below
--   2) Run this script

START TRANSACTION;

-- Set target user email
SET @target_email := 'admin@archivart.com';

-- Ensure super_admin role exists
INSERT IGNORE INTO roles (name, display_name, description, is_active)
VALUES ('super_admin', 'Super Administrator', 'Full system access', 1);

UPDATE roles
SET is_active = 1
WHERE name = 'super_admin';

-- Assign role to user (create mapping if missing)
INSERT IGNORE INTO user_roles (user_id, role_id, is_active, assigned_at)
SELECT u.id, r.id, 1, NOW()
FROM users u
JOIN roles r ON r.name COLLATE utf8mb4_unicode_ci = 'super_admin' COLLATE utf8mb4_unicode_ci
WHERE u.email COLLATE utf8mb4_unicode_ci = @target_email COLLATE utf8mb4_unicode_ci;

-- Ensure assignment is active if mapping already exists
UPDATE user_roles ur
JOIN users u ON u.id = ur.user_id
JOIN roles r ON r.id = ur.role_id
SET ur.is_active = 1,
    ur.assigned_at = NOW()
WHERE u.email COLLATE utf8mb4_unicode_ci = @target_email COLLATE utf8mb4_unicode_ci
  AND r.name COLLATE utf8mb4_unicode_ci = 'super_admin' COLLATE utf8mb4_unicode_ci;

COMMIT;

-- Verification output
SELECT
  u.id AS user_id,
  u.email,
  r.name AS role_name,
  ur.is_active,
  ur.assigned_at
FROM users u
LEFT JOIN user_roles ur ON ur.user_id = u.id
LEFT JOIN roles r ON r.id = ur.role_id
WHERE u.email COLLATE utf8mb4_unicode_ci = @target_email COLLATE utf8mb4_unicode_ci
ORDER BY ur.assigned_at DESC;
