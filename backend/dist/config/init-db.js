const { pool } = require('./database');
const createTables = async () => {
    try {
        console.log('🔨 Începe crearea tabelelor...\n');
        // 1. Tabelul Users
        await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        username VARCHAR(100) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(50) DEFAULT 'user',
        status VARCHAR(50) DEFAULT 'active',
        preferred_language VARCHAR(10) DEFAULT 'ro',
        theme_preference VARCHAR(20) DEFAULT 'light',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
        console.log('✅ Tabelul "users" creat cu succes!');
        // 2. Tabelul User Profiles
        await pool.query(`
      CREATE TABLE IF NOT EXISTS user_profiles (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        first_name VARCHAR(100),
        last_name VARCHAR(100),
        phone VARCHAR(20),
        address TEXT,
        date_of_birth DATE,
        additional_info JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
        console.log('✅ Tabelul "user_profiles" creat cu succes!');
        // 3. Tabelul Documents
        await pool.query(`
      CREATE TABLE IF NOT EXISTS documents (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        type VARCHAR(50) NOT NULL,
        file_url TEXT NOT NULL,
        file_name VARCHAR(255) NOT NULL,
        file_size INTEGER,
        mime_type VARCHAR(100),
        uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        verified_by_admin BOOLEAN DEFAULT FALSE,
        verified_at TIMESTAMP,
        admin_notes TEXT
      )
    `);
        console.log('✅ Tabelul "documents" creat cu succes!');
        // 4. Tabelul Interview Slots
        await pool.query(`
      CREATE TABLE IF NOT EXISTS interview_slots (
        id SERIAL PRIMARY KEY,
        start_time TIMESTAMP NOT NULL,
        end_time TIMESTAMP NOT NULL,
        is_available BOOLEAN DEFAULT TRUE,
        max_capacity INTEGER DEFAULT 1,
        current_bookings INTEGER DEFAULT 0,
        created_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT check_time CHECK (end_time > start_time),
        CONSTRAINT check_capacity CHECK (current_bookings <= max_capacity)
      )
    `);
        console.log('✅ Tabelul "interview_slots" creat cu succes!');
        // 5. Tabelul Bookings
        await pool.query(`
      CREATE TABLE IF NOT EXISTS bookings (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        slot_id INTEGER REFERENCES interview_slots(id) ON DELETE CASCADE,
        status VARCHAR(50) DEFAULT 'pending',
        notes TEXT,
        reminder_sent BOOLEAN DEFAULT FALSE,
        reminder_sent_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, slot_id)
      )
    `);
        console.log('✅ Tabelul "bookings" creat cu succes!');
        // 6. Tabelul Email Templates
        await pool.query(`
      CREATE TABLE IF NOT EXISTS email_templates (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) UNIQUE NOT NULL,
        subject VARCHAR(255) NOT NULL,
        body_html TEXT,
        body_text TEXT,
        language VARCHAR(10) DEFAULT 'ro',
        type VARCHAR(50) NOT NULL,
        variables JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
        console.log('✅ Tabelul "email_templates" creat cu succes!');
        // 7. Tabelul Email Logs
        await pool.query(`
      CREATE TABLE IF NOT EXISTS email_logs (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        template_id INTEGER REFERENCES email_templates(id),
        to_email VARCHAR(255) NOT NULL,
        subject VARCHAR(255),
        status VARCHAR(50) DEFAULT 'pending',
        sent_at TIMESTAMP,
        error_message TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
        console.log('✅ Tabelul "email_logs" creat cu succes!');
        // 8. Creează indexuri pentru performanță
        await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
      CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
      CREATE INDEX IF NOT EXISTS idx_documents_user_id ON documents(user_id);
      CREATE INDEX IF NOT EXISTS idx_bookings_user_id ON bookings(user_id);
      CREATE INDEX IF NOT EXISTS idx_bookings_slot_id ON bookings(slot_id);
      CREATE INDEX IF NOT EXISTS idx_interview_slots_start_time ON interview_slots(start_time);
    `);
        console.log('✅ Indexuri create cu succes!');
        // 9. Creează un user admin implicit
        const adminCheck = await pool.query(`
      SELECT * FROM users WHERE email = 'admin@interview-app.com'
    `);
        if (adminCheck.rows.length === 0) {
            const bcrypt = require('bcryptjs');
            const hashedPassword = await bcrypt.hash('admin123', 10);
            await pool.query(`
        INSERT INTO users (email, username, password_hash, role)
        VALUES ($1, $2, $3, $4)
      `, ['admin@interview-app.com', 'admin', hashedPassword, 'admin']);
            console.log('\n📧 User admin creat:');
            console.log('   Email: admin@interview-app.com');
            console.log('   Username: admin');
            console.log('   Parolă: admin123');
        }
        console.log('\n🎉 Toate tabelele au fost create cu succes!');
        process.exit(0);
    }
    catch (error) {
        console.error('❌ Eroare la crearea tabelelor:', error);
        process.exit(1);
    }
};
// Rulează funcția
createTables();
