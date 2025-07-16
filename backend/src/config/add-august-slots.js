const { pool } = require('./database');

async function addAugustSlots() {
  try {
    const timeSlots = [
      '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
      '14:00', '14:30', '15:00', '15:30', '16:00', '16:30'
    ];

    let count = 0;
    // Adaugă sloturi pentru tot august 2025
    for (let day = 1; day <= 31; day++) {
      const date = new Date(2025, 7, day); // 7 = August (0-indexed)
      
      // Skip weekend
      if (date.getDay() === 0 || date.getDay() === 6) continue;
      
      const dateStr = date.toISOString().split('T')[0];
      
      for (const time of timeSlots) {
        await pool.query(
          'INSERT INTO interview_slots (date, time, max_capacity) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
          [dateStr, time, 2]
        );
        count++;
      }
    }
    
    console.log(`✅ ${count} sloturi adăugate pentru August 2025!`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Eroare:', error);
    process.exit(1);
  }
}

addAugustSlots();
