const express = require('express');
const router = express.Router();
const { protect, adminOnly } = require('../middleware/authMiddleware');
const { pool } = require('../config/database');

// Toate rutele necesită autentificare admin
router.use(protect, adminOnly);

// Obține toate sloturile
router.get('/slots', async (req, res) => {
  try {
    const { date, status } = req.query;
    let query = `
      SELECT 
        s.*,
        COUNT(b.id) as bookings_count,
        array_agg(
          json_build_object(
            'booking_id', b.id,
            'user_id', u.id,
            'username', u.username,
            'email', u.email
          )
        ) FILTER (WHERE b.id IS NOT NULL) as bookings
      FROM interview_slots s
      LEFT JOIN bookings b ON s.id = b.slot_id AND b.status = 'confirmed'
      LEFT JOIN users u ON b.user_id = u.id
    `;
    
    const params = [];
    const conditions = [];
    
    if (date) {
      params.push(date);
      conditions.push(`s.date = $${params.length}`);
    }
    
    if (status === 'available') {
      conditions.push('s.is_available = true');
    } else if (status === 'booked') {
      conditions.push('s.current_bookings > 0');
    }
    
    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }
    
    query += ` GROUP BY s.id ORDER BY s.date, s.time`;
    
    const result = await pool.query(query, params);
    
    res.json({
      success: true,
      data: result.rows.map(slot => ({
        ...slot,
        date: slot.date.toISOString().split('T')[0],
        time: slot.time.substring(0, 5)
      }))
    });
  } catch (error) {
    console.error('Eroare la obținere sloturi:', error);
    res.status(500).json({
      success: false,
      message: 'Eroare la obținerea sloturilor!'
    });
  }
});

// Adaugă sloturi noi
router.post('/slots/bulk', async (req, res) => {
  try {
    const { startDate, endDate, times, maxCapacity = 1, excludeWeekends = true } = req.body;
    
    if (!startDate || !endDate || !times || !Array.isArray(times)) {
      return res.status(400).json({
        success: false,
        message: 'Date invalide!'
      });
    }
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    let addedCount = 0;
    
    for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
      // Skip weekend dacă e cazul
      if (excludeWeekends && (date.getDay() === 0 || date.getDay() === 6)) continue;
      
      const dateStr = date.toISOString().split('T')[0];
      
      for (const time of times) {
        try {
          await pool.query(
            `INSERT INTO interview_slots (date, time, max_capacity)
             VALUES ($1, $2, $3)
             ON CONFLICT (date, time) DO NOTHING`,
            [dateStr, time, maxCapacity]
          );
          addedCount++;
        } catch (err) {
          console.error(`Eroare la adăugare slot ${dateStr} ${time}:`, err);
        }
      }
    }
    
    res.json({
      success: true,
      message: `${addedCount} sloturi adăugate cu succes!`
    });
  } catch (error) {
    console.error('Eroare la adăugare sloturi:', error);
    res.status(500).json({
      success: false,
      message: 'Eroare la adăugarea sloturilor!'
    });
  }
});

// Modifică disponibilitatea unui slot
router.put('/slots/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { isAvailable, maxCapacity } = req.body;
    
    const updates = [];
    const values = [];
    let paramCount = 0;
    
    if (typeof isAvailable === 'boolean') {
      paramCount++;
      updates.push(`is_available = $${paramCount}`);
      values.push(isAvailable);
    }
    
    if (maxCapacity !== undefined) {
      paramCount++;
      updates.push(`max_capacity = $${paramCount}`);
      values.push(maxCapacity);
    }
    
    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Nu ai specificat ce să actualizezi!'
      });
    }
    
    paramCount++;
    values.push(id);
    
    await pool.query(
      `UPDATE interview_slots SET ${updates.join(', ')} WHERE id = $${paramCount}`,
      values
    );
    
    res.json({
      success: true,
      message: 'Slot actualizat cu succes!'
    });
  } catch (error) {
    console.error('Eroare la actualizare slot:', error);
    res.status(500).json({
      success: false,
      message: 'Eroare la actualizarea slotului!'
    });
  }
});

// Șterge un slot
router.delete('/slots/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Verifică dacă are programări
    const bookings = await pool.query(
      'SELECT COUNT(*) FROM bookings WHERE slot_id = $1 AND status = $2',
      [id, 'confirmed']
    );
    
    if (parseInt(bookings.rows[0].count) > 0) {
      return res.status(400).json({
        success: false,
        message: 'Nu poți șterge un slot care are programări active!'
      });
    }
    
    await pool.query('DELETE FROM interview_slots WHERE id = $1', [id]);
    
    res.json({
      success: true,
      message: 'Slot șters cu succes!'
    });
  } catch (error) {
    console.error('Eroare la ștergere slot:', error);
    res.status(500).json({
      success: false,
      message: 'Eroare la ștergerea slotului!'
    });
  }
});

// Obține toți utilizatorii
router.get('/users', async (req, res) => {
  try {
    const users = await pool.query(`
      SELECT 
        u.id,
        u.email,
        u.username,
        u.role,
        u.status,
        u.created_at,
        up.first_name,
        up.last_name,
        up.phone,
        COUNT(DISTINCT d.id) as documents_count,
        COUNT(DISTINCT b.id) as bookings_count
      FROM users u
      LEFT JOIN user_profiles up ON u.id = up.user_id
      LEFT JOIN user_documents d ON u.id = d.user_id
      LEFT JOIN bookings b ON u.id = b.user_id AND b.status = 'confirmed'
      GROUP BY u.id, up.user_id, up.first_name, up.last_name, up.phone
      ORDER BY u.created_at DESC
    `);
    
    res.json({
      success: true,
      data: users.rows
    });
  } catch (error) {
    console.error('Eroare la obținere utilizatori:', error);
    res.status(500).json({
      success: false,
      message: 'Eroare la obținerea utilizatorilor!'
    });
  }
});

// Obține toate programările
router.get('/bookings', async (req, res) => {
  try {
    const { status, userId, date } = req.query;
    
    let query = `
      SELECT 
        b.*,
        u.email,
        u.username,
        s.date,
        s.time
      FROM bookings b
      JOIN users u ON b.user_id = u.id
      JOIN interview_slots s ON b.slot_id = s.id
    `;
    
    const params = [];
    const conditions = [];
    
    if (status) {
      params.push(status);
      conditions.push(`b.status = $${params.length}`);
    }
    
    if (userId) {
      params.push(userId);
      conditions.push(`b.user_id = $${params.length}`);
    }
    
    if (date) {
      params.push(date);
      conditions.push(`s.date = $${params.length}`);
    }
    
    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }
    
    query += ` ORDER BY s.date DESC, s.time DESC`;
    
    const result = await pool.query(query, params);
    
    res.json({
      success: true,
      data: result.rows.map(booking => ({
        ...booking,
        date: booking.date.toISOString().split('T')[0],
        time: booking.time.substring(0, 5)
      }))
    });
  } catch (error) {
    console.error('Eroare la obținere programări:', error);
    res.status(500).json({
      success: false,
      message: 'Eroare la obținerea programărilor!'
    });
  }
});

module.exports = router;