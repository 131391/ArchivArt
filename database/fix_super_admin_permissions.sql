-- Fix Super Admin RBAC permissions (idempotent)
-- Safe to run multiple times.

START TRANSACTION;

-- Ensure required modules exist
INSERT IGNORE INTO modules (name, display_name, description, is_active)
VALUES
  ('dashboard', 'Dashboard', 'Dashboard access control', 1),
  ('media', 'Media', 'Media access control', 1),
  ('rbac', 'RBAC', 'Role-based access control', 1);

-- Ensure required permissions exist
INSERT IGNORE INTO permissions (name, display_name, description, module_id, is_active)
SELECT 'dashboard.view', 'View Dashboard', 'Access the admin dashboard', m.id, 1
FROM modules m
WHERE m.name = 'dashboard';

INSERT IGNORE INTO permissions (name, display_name, description, module_id, is_active)
SELECT 'media.view', 'View Media', 'View media management pages', m.id, 1
FROM modules m
WHERE m.name = 'media';

INSERT IGNORE INTO permissions (name, display_name, description, module_id, is_active)
SELECT 'rbac.view', 'View RBAC', 'View RBAC pages', m.id, 1
FROM modules m
WHERE m.name = 'rbac';

INSERT IGNORE INTO permissions (name, display_name, description, module_id, is_active)
SELECT 'rbac.create', 'Create RBAC', 'Create RBAC entities', m.id, 1
FROM modules m
WHERE m.name = 'rbac';

INSERT IGNORE INTO permissions (name, display_name, description, module_id, is_active)
SELECT 'rbac.update', 'Update RBAC', 'Update RBAC entities', m.id, 1
FROM modules m
WHERE m.name = 'rbac';

INSERT IGNORE INTO permissions (name, display_name, description, module_id, is_active)
SELECT 'rbac.delete', 'Delete RBAC', 'Delete RBAC entities', m.id, 1
FROM modules m
WHERE m.name = 'rbac';

-- Ensure super_admin role exists
INSERT IGNORE INTO roles (name, display_name, description, is_active)
VALUES ('super_admin', 'Super Administrator', 'Full system access', 1);

-- Force-enable role and permissions in case they were disabled
UPDATE roles
SET is_active = 1
WHERE name = 'super_admin';

UPDATE permissions
SET is_active = 1
WHERE name IN (
  'dashboard.view',
  'media.view',
  'rbac.view',
  'rbac.create',
  'rbac.update',
  'rbac.delete'
);

-- Ensure role_permissions rows exist and are active
INSERT IGNORE INTO role_permissions (role_id, permission_id, is_active)
SELECT r.id, p.id, 1
FROM roles r
JOIN permissions p
  ON p.name IN (
    'dashboard.view',
    'media.view',
    'rbac.view',
    'rbac.create',
    'rbac.update',
    'rbac.delete'
  )
WHERE r.name = 'super_admin';

UPDATE role_permissions rp
JOIN roles r ON r.id = rp.role_id
JOIN permissions p ON p.id = rp.permission_id
SET rp.is_active = 1
WHERE r.name = 'super_admin'
  AND p.name IN (
    'dashboard.view',
    'media.view',
    'rbac.view',
    'rbac.create',
    'rbac.update',
    'rbac.delete'
  );

COMMIT;

-- Verification query
SELECT r.name AS role_name, p.name AS permission_name, rp.is_active
FROM role_permissions rp
JOIN roles r ON r.id = rp.role_id
JOIN permissions p ON p.id = rp.permission_id
WHERE r.name = 'super_admin'
  AND p.name IN (
    'dashboard.view',
    'media.view',
    'rbac.view',
    'rbac.create',
    'rbac.update',
    'rbac.delete'
  )
ORDER BY p.name;
