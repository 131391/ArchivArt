# 🚀 ArchivArt Database - Quick Start Guide

## For Production Deployment

### Step 1: Update Environment Variables

Edit your `.env` file:

```env
DB_HOST=your-database-host
DB_PORT=3306
DB_USER=your-username
DB_PASSWORD=your-password
DB_NAME=archivartv2
```

### Step 2: Run the Migration

**Choose ONE option:**

#### Option A: MySQL Command Line (Recommended)
```bash
mysql -h YOUR_HOST -u YOUR_USER -p YOUR_DATABASE < database/production_migration.sql
```

#### Option B: Node.js Script (Easier)
```bash
node database/restore_database.js
```

### Step 3: Login to Admin Panel

- **URL:** `http://your-domain/admin/login`
- **Email:** `admin@archivart.com`
- **Password:** `admin123`

### Step 4: Change Admin Password

**IMPORTANT:** After first login, go to Settings → Profile and change the default password immediately!

---

## That's It! 🎉

Your database is now fully set up with:
- ✅ All required tables
- ✅ RBAC system (5 modules, 18 permissions, 6 roles)
- ✅ Admin user with full access
- ✅ Security features enabled
- ✅ Safe cascade deletion procedures

---

## Need More Details?

See `PRODUCTION_SETUP.md` for comprehensive documentation.

## Files You Need

**For Fresh Setup:**
- `production_migration.sql` - Complete database schema and data
- `restore_database.js` - Alternative setup script

**For Maintenance:**
- `cascade_delete_utility.js` - Safe deletion tool
- `PRODUCTION_SETUP.md` - Full documentation

## Common Issues

**Problem:** "Table already exists"
- ✅ **Solution:** This is safe to ignore. The migration is idempotent.

**Problem:** "Access denied"
- ✅ **Solution:** Check your `.env` database credentials.

**Problem:** "Unknown database"
- ✅ **Solution:** Create database first: `CREATE DATABASE archivartv2;`

---

Need help? Check the full documentation in `PRODUCTION_SETUP.md`
