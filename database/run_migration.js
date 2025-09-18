#!/usr/bin/env node

/**
 * ArchivArt Database Migration Runner
 * 
 * This script runs the complete database migration
 * Usage: node database/run_migration.js [options]
 * 
 * Options:
 *   --drop-db    Drop and recreate the database (WARNING: This will delete all data!)
 *   --help       Show this help message
 */

const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config();

// Configuration
const config = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'archivart',
    multipleStatements: true
};

async function runMigration() {
    let connection;
    
    try {
        console.log('🚀 Starting ArchivArt Database Migration...\n');
        
        // Parse command line arguments
        const args = process.argv.slice(2);
        const dropDb = args.includes('--drop-db');
        const showHelp = args.includes('--help');
        
        if (showHelp) {
            console.log(`
ArchivArt Database Migration Runner

Usage: node database/run_migration.js [options]

Options:
  --drop-db    Drop and recreate the database (WARNING: This will delete all data!)
  --help       Show this help message

Examples:
  node database/run_migration.js                    # Run migration normally
  node database/run_migration.js --drop-db          # Drop database and recreate
            `);
            return;
        }
        
        // Connect to MySQL server (without database)
        console.log('📡 Connecting to MySQL server...');
        const serverConfig = { ...config };
        delete serverConfig.database;
        
        connection = await mysql.createConnection(serverConfig);
        console.log('✅ Connected to MySQL server\n');
        
        // Drop database if requested
        if (dropDb) {
            console.log('⚠️  Dropping existing database...');
            await connection.execute(`DROP DATABASE IF EXISTS ${config.database}`);
            console.log('✅ Database dropped\n');
        }
        
        // Read migration file
        const migrationPath = path.join(__dirname, 'complete_database_migration.sql');
        console.log('📖 Reading migration file...');
        
        if (!fs.existsSync(migrationPath)) {
            throw new Error(`Migration file not found: ${migrationPath}`);
        }
        
        const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
        console.log('✅ Migration file loaded\n');
        
        // Execute migration
        console.log('🔄 Executing migration...');
        const startTime = Date.now();
        
        await connection.execute(migrationSQL);
        
        const endTime = Date.now();
        const duration = ((endTime - startTime) / 1000).toFixed(2);
        
        console.log(`✅ Migration completed successfully in ${duration}s\n`);
        
        // Verify migration
        console.log('🔍 Verifying migration...');
        
        // Check if database exists
        const [databases] = await connection.execute('SHOW DATABASES LIKE ?', [config.database]);
        if (databases.length === 0) {
            throw new Error('Database was not created');
        }
        
        // Connect to the new database
        await connection.end();
        connection = await mysql.createConnection(config);
        
        // Check tables
        const [tables] = await connection.execute('SHOW TABLES');
        const tableNames = tables.map(row => Object.values(row)[0]);
        
        console.log(`✅ Database created with ${tableNames.length} tables:`);
        tableNames.forEach(table => console.log(`   - ${table}`));
        
        // Check record counts
        console.log('\n📊 Record counts:');
        for (const table of tableNames) {
            try {
                const [rows] = await connection.execute(`SELECT COUNT(*) as count FROM ${table}`);
                console.log(`   - ${table}: ${rows[0].count} records`);
            } catch (error) {
                console.log(`   - ${table}: Error counting records`);
            }
        }
        
        console.log('\n🎉 Migration completed successfully!');
        console.log('\n📋 Next steps:');
        console.log('   1. Update your .env file with database credentials');
        console.log('   2. Start the application: npm run dev');
        console.log('   3. Login with admin credentials:');
        console.log('      Email: admin@archivart.com');
        console.log('      Password: password');
        
    } catch (error) {
        console.error('\n❌ Migration failed:');
        console.error(error.message);
        
        if (error.code) {
            console.error(`Error code: ${error.code}`);
        }
        
        process.exit(1);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    console.error('\n❌ Uncaught Exception:', error.message);
    process.exit(1);
});

process.on('unhandledRejection', (error) => {
    console.error('\n❌ Unhandled Rejection:', error.message);
    process.exit(1);
});

// Run migration
runMigration();
