const bcrypt = require('bcryptjs');
const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  database: 'interview_booking_db',
  user: 'postgres'
});

async function resetPassword() {
  try {
    // Generează hash nou pentru admin123
    const password = 'admin123';
    const hash = await bcrypt.hash(password, 10);
    console.log('Hash generat:', hash);
    
    // Actualizează parola
    const result = await pool.query(
      "UPDATE users SET password_hash = $1 WHERE email = 'admin@interview-app.com' RETURNING id, email, username",
      [hash]
    );
    
    console.log('Utilizator actualizat:', result.rows[0]);
    
    // Verifică că se poate loga
    const testHash = await pool.query(
      "SELECT password_hash FROM users WHERE email = 'admin@interview-app.com'"
    );
    
    const isValid = await bcrypt.compare('admin123', testHash.rows[0].password_hash);
    console.log('Test parolă:', isValid ? '✅ VALID' : '❌ INVALID');
    
    pool.end();
  } catch (error) {
    console.error('Eroare:', error);
    pool.end();
  }
}

resetPassword();
