const { pool } = require('./database');

async function populateSlots() {
  try {
    console.log('📅 Generare sloturi pentru interviuri...');
    
    const startDate = new Date();
    startDate.setDate(startDate.getDate() + 1); // Începe de mâine
    
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 30); // 30 de zile

    const timeSlots = [
      '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
      '14:00', '14:30', '15:00', '15:30', '16:00', '16:30'
    ];

    let addedCount = 0;
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      // Skip weekend
      if (d.getDay() === 0 || d.getDay() === 6) continue;
      
      const dateStr = d.toISOString().split('T')[0];
      
      for (const time of timeSlots) {
        try {
          await pool.query(
            'INSERT INTO interview_slots (date, time, max_capacity) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
            [dateStr, time, 2]
          );
          addedCount++;
        } catch (err) {
          console.error(`Eroare la ${dateStr} ${time}:`, err.message);
        }
      }
    }
    
    console.log(`✅ ${addedCount} sloturi create!`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Eroare:', error);
    process.exit(1);
  }
}

populateSlots();
