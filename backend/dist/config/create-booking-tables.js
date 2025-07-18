const { pool } = require('./database');
async function createBookingTables() {
    try {
        console.log('🔄 Creare tabele pentru sistemul de programări...\n');
        // 1. Creează tabel time_slots
        console.log('📊 Creare tabel time_slots...');
        await pool.query(`
      CREATE TABLE IF NOT EXISTS time_slots (
        id SERIAL PRIMARY KEY,
        date DATE NOT NULL,
        start_time TIME NOT NULL,
        end_time TIME NOT NULL,
        max_capacity INTEGER DEFAULT 1,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(date, start_time)
      )
    `);
        console.log('✅ Tabel time_slots creat');
        // 2. Creează tabel bookings
        console.log('\n📊 Creare tabel bookings...');
        await pool.query(`
      CREATE TABLE IF NOT EXISTS bookings (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        slot_id INTEGER REFERENCES time_slots(id) ON DELETE CASCADE,
        status VARCHAR(50) DEFAULT 'pending',
        notes TEXT,
        appointment_date DATE,
        appointment_time TIME,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
        console.log('✅ Tabel bookings creat');
        // 3. Creează tabel documents
        console.log('\n📊 Creare tabel documents...');
        await pool.query(`
      CREATE TABLE IF NOT EXISTS documents (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        booking_id INTEGER REFERENCES bookings(id) ON DELETE CASCADE,
        document_type VARCHAR(100) NOT NULL,
        file_name VARCHAR(255) NOT NULL,
        file_url TEXT NOT NULL,
        file_size INTEGER,
        mime_type VARCHAR(100),
        uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
        console.log('✅ Tabel documents creat');
        // 4. Creează indecși pentru performanță
        console.log('\n🚀 Creare indecși...');
        await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_time_slots_date ON time_slots(date);
      CREATE INDEX IF NOT EXISTS idx_bookings_user_id ON bookings(user_id);
      CREATE INDEX IF NOT EXISTS idx_bookings_slot_id ON bookings(slot_id);
      CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
      CREATE INDEX IF NOT EXISTS idx_documents_user_id ON documents(user_id);
    `);
        console.log('✅ Indecși creați');
        // 5. Adaugă câteva sloturi de test pentru săptămâna viitoare
        console.log('\n📅 Adaugare sloturi de test...');
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const slots = [
            { start: '09:00', end: '10:00', capacity: 5 },
            { start: '10:00', end: '11:00', capacity: 5 },
            { start: '11:00', end: '12:00', capacity: 5 },
            { start: '14:00', end: '15:00', capacity: 5 },
            { start: '15:00', end: '16:00', capacity: 5 }
        ];
        let slotsCreated = 0;
        // Creează sloturi pentru următoarele 7 zile (doar în zilele lucrătoare)
        for (let i = 0; i < 7; i++) {
            const currentDate = new Date(tomorrow);
            currentDate.setDate(tomorrow.getDate() + i);
            // Skip weekend
            if (currentDate.getDay() === 0 || currentDate.getDay() === 6) {
                continue;
            }
            for (const slot of slots) {
                await pool.query(`
          INSERT INTO time_slots (date, start_time, end_time, max_capacity)
          VALUES ($1, $2, $3, $4)
          ON CONFLICT (date, start_time) DO NOTHING
        `, [
                    currentDate.toISOString().split('T')[0],
                    slot.start,
                    slot.end,
                    slot.capacity
                ]);
                slotsCreated++;
            }
        }
        console.log(`✅ ${slotsCreated} sloturi create pentru teste`);
        // 6. Afișează structura tabelelor
        console.log('\n📊 Structură tabele create:');
        const tables = ['time_slots', 'bookings', 'documents'];
        for (const table of tables) {
            console.log(`\n--- Tabel: ${table} ---`);
            const tableInfo = await pool.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = $1
        ORDER BY ordinal_position
      `, [table]);
            console.table(tableInfo.rows);
        }
        console.log('\n✅ Toate tabelele au fost create cu succes!');
    }
    catch (error) {
        console.error('❌ Eroare la crearea tabelelor:', error);
        throw error;
    }
}
// Rulează crearea tabelelor
createBookingTables()
    .then(() => {
    console.log('\n🎉 Sistemul de programări este gata de utilizare!');
    process.exit(0);
})
    .catch((error) => {
    console.error('\n❌ Eroare:', error);
    process.exit(1);
});
