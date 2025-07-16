const bcrypt = require('bcryptjs');
const { pool } = require('./src/config/database');

async function testLogin() {
  // Mai întâi, setăm parola
  const password = 'admin123';
  const hash = await bcrypt.hash(password, 10);
  
  // Actualizăm în DB
  await pool.query(
    'UPDATE users SET password = $1 WHERE email = $2',
    [hash, 'admin@example.com']
  );
  
  console.log('Parola setată!');
  
  // Verificăm hash-ul
  const result = await pool.query(
    'SELECT password FROM users WHERE email = $1',
    ['admin@example.com']
  );
  
  if (result.rows.length > 0) {
    const storedHash = result.rows[0].password;
    const isValid = await bcrypt.compare(password, storedHash);
    console.log('Parola "admin123" e validă?', isValid);
  }
  
  process.exit(0);
}

testLogin().catch(console.error);
