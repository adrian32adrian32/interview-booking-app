const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'interview_booking_db',
  user: 'postgres',
  password: 'postgres',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on('connect', () => {
  console.log('✅ Conectat la PostgreSQL!');
});

pool.on('error', (err) => {
  console.error('❌ Eroare PostgreSQL:', err);
});

module.exports = { pool };