const mysql = require('mysql2');
const bcrypt = require('bcryptjs');
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

async function setAdminPassword() {
  let connection;
  
  try {
    console.log('🔐 Setting admin password...');
    connection = await promisePool.getConnection();
    
    // Hash the password
    const hashedPassword = await bcrypt.hash('admin123', 10);
    
    // Update admin user password
    const [result] = await connection.execute(
      'UPDATE users SET password = ? WHERE email = ? AND role = ?',
      [hashedPassword, 'admin@archivart.com', 'admin']
    );
    
    if (result.affectedRows > 0) {
      console.log('✅ Admin password updated successfully');
      console.log('   Email: admin@archivart.com');
      console.log('   Password: admin123');
    } else {
      console.log('❌ No admin user found to update');
    }
    
  } catch (error) {
    console.error('❌ Error setting admin password:', error.message);
  } finally {
    if (connection) {
      connection.release();
      console.log('🔌 Database connection released');
    }
  }
}

// Run the password update
setAdminPassword()
  .then(() => {
    console.log('✅ Admin password setup completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Admin password setup failed:', error);
    process.exit(1);
  });
