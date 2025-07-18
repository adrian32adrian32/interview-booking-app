const { pool } = require('./database');
async function updateDatabase() {
    try {
        console.log('🔄 Actualizare structură bază de date...\n');
        // 1. Adaugă coloane noi la tabelul users
        console.log('📊 Actualizare tabel users...');
        await pool.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS first_name VARCHAR(100),
      ADD COLUMN IF NOT EXISTS last_name VARCHAR(100),
      ADD COLUMN IF NOT EXISTS phone VARCHAR(20),
      ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS reset_token VARCHAR(255),
      ADD COLUMN IF NOT EXISTS reset_token_expires TIMESTAMP,
      ADD COLUMN IF NOT EXISTS verification_token VARCHAR(255),
      ADD COLUMN IF NOT EXISTS refresh_token TEXT,
      ADD COLUMN IF NOT EXISTS last_login TIMESTAMP,
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    `);
        console.log('✅ Coloane adăugate cu succes');
        // 2. Actualizează utilizatorii existenți
        console.log('\n📝 Actualizare date utilizatori existenți...');
        const existingUsers = await pool.query('SELECT id, username FROM users WHERE first_name IS NULL OR last_name IS NULL');
        for (const user of existingUsers.rows) {
            await pool.query(`UPDATE users 
         SET first_name = $1, 
             last_name = $2,
             email_verified = true
         WHERE id = $3`, [
                user.username || 'User',
                user.id.toString(),
                user.id
            ]);
        }
        if (existingUsers.rows.length > 0) {
            console.log(`✅ ${existingUsers.rows.length} utilizatori actualizați`);
        }
        // 3. Aplică constrângeri NOT NULL
        console.log('\n🔒 Aplicare constrângeri...');
        await pool.query(`
      ALTER TABLE users 
      ALTER COLUMN first_name SET NOT NULL,
      ALTER COLUMN last_name SET NOT NULL
    `);
        console.log('✅ Constrângeri aplicate');
        // 4. Creează indecși pentru performanță
        console.log('\n🚀 Creare indecși...');
        await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
      CREATE INDEX IF NOT EXISTS idx_users_reset_token ON users(reset_token);
      CREATE INDEX IF NOT EXISTS idx_users_verification_token ON users(verification_token);
    `);
        console.log('✅ Indecși creați');
        // 5. Creează tabel pentru sesiuni (opțional)
        console.log('\n📋 Creare tabel sesiuni...');
        await pool.query(`
      CREATE TABLE IF NOT EXISTS sessions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        token TEXT NOT NULL,
        ip_address INET,
        user_agent TEXT,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
        console.log('✅ Tabel sesiuni creat');
        // 6. Creează tabel pentru istoric autentificări
        console.log('\n📊 Creare tabel istoric autentificări...');
        await pool.query(`
      CREATE TABLE IF NOT EXISTS auth_logs (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        action VARCHAR(50) NOT NULL,
        ip_address INET,
        user_agent TEXT,
        success BOOLEAN DEFAULT TRUE,
        error_message TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
        console.log('✅ Tabel istoric creat');
        // 7. Afișează structura actualizată
        console.log('\n📊 Structură actualizată tabel users:');
        const tableInfo = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'users'
      ORDER BY ordinal_position
    `);
        console.table(tableInfo.rows);
        console.log('\n✅ Actualizare completă!');
    }
    catch (error) {
        console.error('❌ Eroare la actualizare:', error);
        throw error;
    }
}
// Rulează actualizarea
updateDatabase()
    .then(() => {
    console.log('\n🎉 Baza de date actualizată cu succes!');
    process.exit(0);
})
    .catch((error) => {
    console.error('\n❌ Actualizare eșuată:', error);
    process.exit(1);
});
