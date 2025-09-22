const mysql = require('mysql2');
require('dotenv').config();

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'archivart',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  charset: 'utf8mb4'
};

const pool = mysql.createPool(dbConfig);
const promisePool = pool.promise();

async function checkAdminUsers() {
  let connection;
  
  try {
    console.log('🔍 Checking admin users...');
    connection = await promisePool.getConnection();
    
    // Check all users
    const [users] = await connection.execute('SELECT id, username, email, role, is_active, is_blocked FROM users');
    
    console.log(`📊 Found ${users.length} users:`);
    users.forEach(user => {
      console.log(`   - ID: ${user.id}, Username: ${user.username}, Email: ${user.email}, Role: ${user.role}, Active: ${user.is_active}, Blocked: ${user.is_blocked}`);
    });
    
    // Check admin users specifically
    const [adminUsers] = await connection.execute('SELECT id, username, email, role, is_active, is_blocked FROM users WHERE role = ?', ['admin']);
    
    console.log(`\n👑 Found ${adminUsers.length} admin users:`);
    adminUsers.forEach(user => {
      console.log(`   - ID: ${user.id}, Username: ${user.username}, Email: ${user.email}, Active: ${user.is_active}, Blocked: ${user.is_blocked}`);
    });
    
    // Check if we need to create an admin user
    if (adminUsers.length === 0) {
      console.log('\n⚠️ No admin users found. Creating default admin user...');
      
      const bcrypt = require('bcrypt');
      const hashedPassword = await bcrypt.hash('admin123', 10);
      
      const [result] = await connection.execute(`
        INSERT INTO users (username, email, password, role, is_active, is_verified, created_at) 
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, ['admin', 'admin@archivart.com', hashedPassword, 'admin', 1, 1, new Date()]);
      
      console.log(`✅ Created admin user with ID: ${result.insertId}`);
      console.log('   Username: admin');
      console.log('   Password: admin123');
    }
    
  } catch (error) {
    console.error('❌ Error checking admin users:', error.message);
  } finally {
    if (connection) {
      connection.release();
      console.log('🔌 Database connection released');
    }
  }
}

// Run the check
checkAdminUsers()
  .then(() => {
    console.log('✅ Admin user check completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Admin user check failed:', error);
    process.exit(1);
  });
