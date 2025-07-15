 
const { Pool } = require('pg');
const dotenv = require('dotenv');

// Încarcă variabilele de mediu
dotenv.config();

// Configurare conexiune PostgreSQL
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
  // Opțiuni adiționale pentru performanță
  max: 20, // număr maxim de clienți în pool
  idleTimeoutMillis: 30000, // timp de inactivitate înainte de închidere
  connectionTimeoutMillis: 2000, // timp maxim pentru conectare
});

// Testează conexiunea la pornirea aplicației
pool.connect((err, client, release) => {
  if (err) {
    console.error('❌ Eroare la conectarea cu baza de date:', err.stack);
  } else {
    console.log('✅ Conectat cu succes la PostgreSQL!');
    console.log(`📊 Database: ${process.env.DB_NAME}`);
    console.log(`👤 User: ${process.env.DB_USER}`);
    console.log(`🏠 Host: ${process.env.DB_HOST}:${process.env.DB_PORT}`);
    release();
  }
});

// Funcție helper pentru query-uri
const query = async (text, params) => {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log('Query executat:', { text, duration: duration + 'ms', rows: res.rowCount });
    return res;
  } catch (error) {
    console.error('Eroare query:', error);
    throw error;
  }
};

// Funcție pentru a obține un client pentru tranzacții
const getClient = () => {
  return pool.connect();
};

module.exports = {
  pool,
  query,
  getClient
};