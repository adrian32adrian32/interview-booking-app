const { pool } = require('./database');
const bcrypt = require('bcryptjs');

async function fixAdmin() {
  try {
    // Actualizează datele admin-ului
    await pool.query(`
      UPDATE users 
      SET first_name = 'Admin', 
          last_name = 'Principal',
          email_verified = true
      WHERE email = 'admin@example.com'
    `);
    
    console.log('✅ Admin actualizat cu succes!');
    
    // Verifică
    const result = await pool.query(
      'SELECT id, email, first_name, last_name, role FROM users WHERE email = $1',
      ['admin@example.com']
    );
    
    console.table(result.rows);
    
  } catch (error) {
    console.error('❌ Eroare:', error);
  }
  process.exit(0);
}

fixAdmin();
