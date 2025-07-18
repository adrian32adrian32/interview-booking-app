const { pool } = require('./database');
async function populateSlots() {
    try {
        // Generează sloturi pentru următoarele 30 de zile
        const startDate = new Date();
        startDate.setDate(startDate.getDate() + 1); // Începe de mâine
        const endDate = new Date();
        endDate.setDate(endDate.getDate() + 30); // 30 de zile în viitor
        const timeSlots = [
            '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
            '14:00', '14:30', '15:00', '15:30', '16:00', '16:30'
        ];
        for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
            // Skip weekend
            if (date.getDay() === 0 || date.getDay() === 6)
                continue;
            const dateStr = date.toISOString().split('T')[0];
            for (const time of timeSlots) {
                try {
                    await pool.query(`INSERT INTO interview_slots (date, time, max_capacity)
             VALUES ($1, $2, $3)
             ON CONFLICT (date, time) DO NOTHING`, [dateStr, time, 2] // 2 persoane per slot
                    );
                }
                catch (err) {
                    console.error(`Eroare la slot ${dateStr} ${time}:`, err.message);
                }
            }
        }
        console.log('✅ Sloturi populate cu succes!');
        process.exit(0);
    }
    catch (error) {
        console.error('❌ Eroare:', error);
        process.exit(1);
    }
}
populateSlots();
