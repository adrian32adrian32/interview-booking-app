const bcrypt = require('bcryptjs');
const mysql = require('mysql2/promise');

async function createAdmin() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'parola_ta_mysql', // Înlocuiește cu parola ta
    database: 'interview_booking'
  });

  const hashedPassword = await bcrypt.hash('admin123', 10);
  
  try {
    await connection.execute(
      'INSERT INTO users (email, password, name, role) VALUES (?, ?, ?, ?)',
      ['admin@example.com', hashedPassword, 'Admin Principal', 'admin']
    );
    console.log('Admin user created successfully!');
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      console.log('Admin user already exists');
    } else {
      console.error('Error:', error);
    }
  }

  await connection.end();
}

createAdmin();
