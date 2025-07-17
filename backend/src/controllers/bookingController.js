const { pool } = require('../config/database');
const { sendAppointmentConfirmation, sendAdminNotification } = require('../services/emailService');

// Obține sloturile disponibile pentru o zi
const getAvailableSlots = async (req, res) => {
  try {
    const { date } = req.query;

    if (!date) {
      return res.status(400).json({
        success: false,
        message: 'Data este obligatorie!'
      });
    }

    // Obține toate sloturile pentru data respectivă
    const slotsQuery = await pool.query(`
      SELECT 
        s.id,
        s.date,
        s.start_time,
        s.end_time,
        s.max_capacity,
        COUNT(b.id) as booked_count,
        s.max_capacity - COUNT(b.id) as available_spots
      FROM time_slots s
      LEFT JOIN bookings b ON s.id = b.slot_id AND b.status != 'cancelled'
      WHERE s.date = $1 AND s.is_active = true
      GROUP BY s.id
      HAVING s.max_capacity - COUNT(b.id) > 0
      ORDER BY s.start_time
    `, [date]);

    res.json({
      success: true,
      data: slotsQuery.rows
    });

  } catch (error) {
    console.error('Eroare la getAvailableSlots:', error);
    res.status(500).json({
      success: false,
      message: 'Eroare la obținerea sloturilor disponibile'
    });
  }
};

// Creează o programare nouă
const createBooking = async (req, res) => {
  try {
    const { slotId, notes } = req.body;
    const userId = req.user.id;

    // Verifică dacă slot-ul există și mai are locuri
    const slotCheck = await pool.query(`
      SELECT 
        s.*,
        COUNT(b.id) as booked_count
      FROM time_slots s
      LEFT JOIN bookings b ON s.id = b.slot_id AND b.status != 'cancelled'
      WHERE s.id = $1 AND s.is_active = true
      GROUP BY s.id
    `, [slotId]);

    if (slotCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Slot-ul selectat nu există!'
      });
    }

    const slot = slotCheck.rows[0];

    if (slot.booked_count >= slot.max_capacity) {
      return res.status(400).json({
        success: false,
        message: 'Nu mai sunt locuri disponibile pentru acest slot!'
      });
    }

    // Verifică dacă utilizatorul mai are o programare activă
    const existingBooking = await pool.query(`
      SELECT id FROM bookings 
      WHERE user_id = $1 AND status IN ('pending', 'confirmed')
    `, [userId]);

    if (existingBooking.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Ai deja o programare activă! Anulează-o pe cea existentă pentru a face o nouă programare.'
      });
    }

    // Creează programarea
    const booking = await pool.query(`
      INSERT INTO bookings (
        user_id, slot_id, status, notes, appointment_date, appointment_time
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [
      userId,
      slotId,
      'confirmed',
      notes || null,
      slot.date,
      slot.start_time
    ]);

    // Obține detalii utilizator pentru email
    const userDetails = await pool.query(
      'SELECT email, first_name FROM users WHERE id = $1',
      [userId]
    );

    const user = userDetails.rows[0];

    // Trimite email de confirmare
    await sendAppointmentConfirmation(
      user.email,
      user.first_name,
      new Date(slot.date).toLocaleDateString('ro-RO'),
      slot.start_time
    );

    // Notifică adminii
    await sendAdminNotification('Programare Nouă', {
      user: `${user.first_name} (${user.email})`,
      date: slot.date,
      time: slot.start_time
    });

    res.status(201).json({
      success: true,
      message: 'Programare creată cu succes!',
      data: booking.rows[0]
    });

  } catch (error) {
    console.error('Eroare la createBooking:', error);
    res.status(500).json({
      success: false,
      message: 'Eroare la crearea programării'
    });
  }
};

// Obține programările utilizatorului
const getUserBookings = async (req, res) => {
  try {
    const userId = req.user.id;

    const bookings = await pool.query(`
      SELECT 
        b.*,
        s.date,
        s.start_time,
        s.end_time
      FROM bookings b
      JOIN time_slots s ON b.slot_id = s.id
      WHERE b.user_id = $1
      ORDER BY s.date DESC, s.start_time DESC
    `, [userId]);

    res.json({
      success: true,
      data: bookings.rows
    });

  } catch (error) {
    console.error('Eroare la getUserBookings:', error);
    res.status(500).json({
      success: false,
      message: 'Eroare la obținerea programărilor'
    });
  }
};

// Anulează o programare
const cancelBooking = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const userId = req.user.id;

    // Verifică dacă programarea aparține utilizatorului
    const booking = await pool.query(
      'SELECT * FROM bookings WHERE id = $1 AND user_id = $2',
      [bookingId, userId]
    );

    if (booking.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Programare negăsită!'
      });
    }

    if (booking.rows[0].status === 'cancelled') {
      return res.status(400).json({
        success: false,
        message: 'Programarea este deja anulată!'
      });
    }

    // Anulează programarea
    await pool.query(
      'UPDATE bookings SET status = $1, updated_at = NOW() WHERE id = $2',
      ['cancelled', bookingId]
    );

    res.json({
      success: true,
      message: 'Programare anulată cu succes!'
    });

  } catch (error) {
    console.error('Eroare la cancelBooking:', error);
    res.status(500).json({
      success: false,
      message: 'Eroare la anularea programării'
    });
  }
};

// [ADMIN] Obține toate programările
const getAllBookings = async (req, res) => {
  try {
    const { date, status, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT 
        b.*,
        s.date,
        s.start_time,
        s.end_time,
        u.email,
        u.first_name,
        u.last_name
      FROM bookings b
      JOIN time_slots s ON b.slot_id = s.id
      JOIN users u ON b.user_id = u.id
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 0;

    if (date) {
      paramCount++;
      query += ` AND s.date = $${paramCount}`;
      params.push(date);
    }

    if (status) {
      paramCount++;
      query += ` AND b.status = $${paramCount}`;
      params.push(status);
    }

    // Număr total
    const countResult = await pool.query(
      query.replace('SELECT b.*', 'SELECT COUNT(*)'),
      params
    );
    const totalCount = parseInt(countResult.rows[0].count);

    // Adaugă paginare
    paramCount++;
    query += ` ORDER BY s.date DESC, s.start_time DESC LIMIT $${paramCount}`;
    params.push(limit);
    
    paramCount++;
    query += ` OFFSET $${paramCount}`;
    params.push(offset);

    const result = await pool.query(query, params);

    res.json({
      success: true,
      data: {
        bookings: result.rows,
        pagination: {
          total: totalCount,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(totalCount / limit)
        }
      }
    });

  } catch (error) {
    console.error('Eroare la getAllBookings:', error);
    res.status(500).json({
      success: false,
      message: 'Eroare la obținerea programărilor'
    });
  }
};

// [ADMIN] Creează sloturi noi
const createTimeSlots = async (req, res) => {
  try {
    const { 
      startDate, 
      endDate, 
      timeSlots, // [{start: "09:00", end: "10:00", capacity: 5}]
      excludeWeekends = true 
    } = req.body;

    const created = [];
    const currentDate = new Date(startDate);
    const lastDate = new Date(endDate);

    while (currentDate <= lastDate) {
      // Skip weekend-uri dacă e cazul
      if (excludeWeekends && (currentDate.getDay() === 0 || currentDate.getDay() === 6)) {
        currentDate.setDate(currentDate.getDate() + 1);
        continue;
      }

      // Creează sloturi pentru ziua curentă
      for (const slot of timeSlots) {
        const result = await pool.query(`
          INSERT INTO time_slots (
            date, start_time, end_time, max_capacity, is_active
          ) VALUES ($1, $2, $3, $4, $5)
          ON CONFLICT (date, start_time) DO NOTHING
          RETURNING *
        `, [
          currentDate.toISOString().split('T')[0],
          slot.start,
          slot.end,
          slot.capacity,
          true
        ]);

        if (result.rows.length > 0) {
          created.push(result.rows[0]);
        }
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }

    res.json({
      success: true,
      message: `${created.length} sloturi create cu succes!`,
      data: created
    });

  } catch (error) {
    console.error('Eroare la createTimeSlots:', error);
    res.status(500).json({
      success: false,
      message: 'Eroare la crearea sloturilor'
    });
  }
};

module.exports = {
  getAvailableSlots,
  createBooking,
  getUserBookings,
  cancelBooking,
  getAllBookings,
  createTimeSlots
};