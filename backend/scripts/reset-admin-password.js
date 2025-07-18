const bcrypt = require('bcryptjs');
const { pool } = require('./src/config/database');

async function resetAdminPassword() {
  try {
    const newPassword = 'admin123'; // Schimbă cu ce parolă vrei
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    const result = await pool.query(
      'UPDATE users SET password = $1 WHERE email = $2 RETURNING id, email',
      [hashedPassword, 'admin@example.com']
    );
    
    if (result.rows.length > 0) {
      console.log('✅ Parola resetată cu succes pentru:', result.rows[0].email);
      console.log('📧 Email: admin@example.com');
      console.log('🔑 Parolă nouă:', newPassword);
    } else {
      // Creează admin dacă nu există
      const createResult = await pool.query(
        'INSERT INTO users (email, username, password, role, status) VALUES ($1, $2, $3, $4, $5) RETURNING id, email',
        ['admin@example.com', 'admin', hashedPassword, 'admin', 'active']
      );
      console.log('✅ Admin creat cu succes!');
      console.log('📧 Email: admin@example.com');
      console.log('🔑 Parolă:', newPassword);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Eroare:', error);
    process.exit(1);
  }
}

resetAdminPassword();
