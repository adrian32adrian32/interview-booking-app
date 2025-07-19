const bcrypt = require('bcryptjs');
const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  database: 'interview_booking_db',
  user: 'postgres'
});

async function resetPassword() {
  try {
    const password = 'admin123';
    const hash = await bcrypt.hash(password, 10);
    
    const result = await pool.query(
      "UPDATE users SET password_hash = $1 WHERE email = $2 RETURNING id, email",
      [hash, 'admin@interview-app.com']
    );
    
    if (result.rows.length > 0) {
      console.log('✅ Parola resetată cu succes pentru:', result.rows[0].email);
      console.log('📧 Email: admin@interview-app.com');
      console.log('🔑 Parolă: admin123');
    } else {
      console.log('❌ Utilizatorul nu a fost găsit!');
    }
    
    pool.end();
  } catch (error) {
    console.error('Eroare:', error);
    pool.end();
  }
}

resetPassword();
