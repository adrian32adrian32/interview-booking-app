const bcrypt = require('bcryptjs');
const { pool } = require('./src/config/database');

async function testAuth() {
  try {
    // Găsește user
    const result = await pool.query(
      'SELECT * FROM users WHERE email = $1 OR username = $1',
      ['admin@example.com']
    );
    
    if (result.rows.length === 0) {
      console.log('❌ Utilizator negăsit!');
      return;
    }
    
    const user = result.rows[0];
    console.log('✅ Utilizator găsit:', {
      id: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
      status: user.status
    });
    
    // Testează parola
    const testPassword = 'admin123';
    const hash = await bcrypt.hash(testPassword, 10);
    
    // Actualizează cu hash nou
    await pool.query('UPDATE users SET password = $1 WHERE id = $2', [hash, user.id]);
    console.log('✅ Parolă actualizată!');
    
    // Verifică
    const isValid = await bcrypt.compare(testPassword, hash);
    console.log('✅ Parola "admin123" funcționează?', isValid);
    
  } catch (error) {
    console.error('❌ Eroare:', error);
  }
  process.exit(0);
}

testAuth();
