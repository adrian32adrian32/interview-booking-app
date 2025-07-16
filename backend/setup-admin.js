const bcrypt = require('bcryptjs');
const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'interview_booking_db',
  user: 'postgres',
  password: 'postgres'
});

async function setupAdmin() {
  try {
    // Verifică dacă există admin
    const checkAdmin = await pool.query(
      "SELECT * FROM users WHERE email = 'admin@example.com'"
    );

    const hashedPassword = await bcrypt.hash('admin123', 10);

    if (checkAdmin.rows.length > 0) {
      // Actualizează admin existent
      await pool.query(
        "UPDATE users SET password_hash = $1, role = 'admin' WHERE email = 'admin@example.com'",
        [hashedPassword]
      );
      console.log('✅ Admin actualizat cu succes!');
    } else {
      // Creează admin nou
      await pool.query(
        "INSERT INTO users (email, username, password_hash, role, status) VALUES ($1, $2, $3, $4, $5)",
        ['admin@example.com', 'admin', hashedPassword, 'admin', 'active']
      );
      console.log('✅ Admin creat cu succes!');
    }

    console.log('📧 Email: admin@example.com');
    console.log('🔑 Parolă: admin123');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Eroare:', error.message);
    process.exit(1);
  }
}

setupAdmin();