const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { pool } = require('../config/database');

// Obține sloturile disponibile pentru o dată
router.get('/slots', protect, async (req, res) => {
  try {
    const { date } = req.query;
    
    if (!date) {
      return res.status(400).json({
        success: false,
        message: 'Data este obligatorie!'
      });
    }

    // Obține toate sloturile pentru data specificată
    const slots = await pool.query(
      `SELECT 
        id, 
        date, 
        time, 
        max_capacity, 
        current_bookings,
        (max_capacity - current_bookings) as available_spots,
        is_available
       FROM interview_slots
       WHERE date = $1 AND is_available = true
       ORDER BY time`,
      [date]
    );

    // Verifică dacă utilizatorul are deja o programare
    const existingBooking = await pool.query(
      `SELECT b.*, s.date, s.time
       FROM bookings b
       JOIN interview_slots s ON b.slot_id = s.id
       WHERE b.user_id = $1 AND b.status = 'confirmed'
       ORDER BY s.date DESC, s.time DESC
       LIMIT 1`,
      [req.user.id]
    );

    res.json({
      success: true,
      data: {
        slots: slots.rows.map(slot => ({
          ...slot,
          date: slot.date.toISOString().split('T')[0],
          time: slot.time.substring(0, 5), // Format HH:MM
          available: slot.available_spots > 0
        })),
        hasExistingBooking: existingBooking.rows.length > 0,
        existingBooking: existingBooking.rows[0] || null
      }
    });

  } catch (error) {
    console.error('Eroare la obținere sloturi:', error);
    res.status(500).json({
      success: false,
      message: 'Eroare la obținerea sloturilor disponibile!'
    });
  }
});

// Creează o programare nouă
router.post('/', protect, async (req, res) => {
  try {
    const { slotId } = req.body;
    
    if (!slotId) {
      return res.status(400).json({
        success: false,
        message: 'Slot-ul este obligatoriu!'
      });
    }

    // Începe tranzacție
    await pool.query('BEGIN');

    try {
      // Verifică dacă utilizatorul are deja o programare
      const existingBooking = await pool.query(
        `SELECT * FROM bookings 
         WHERE user_id = $1 AND status = 'confirmed'`,
        [req.user.id]
      );

      if (existingBooking.rows.length > 0) {
        await pool.query('ROLLBACK');
        return res.status(400).json({
          success: false,
          message: 'Ai deja o programare activă!'
        });
      }

      // Verifică disponibilitatea slot-ului
      const slot = await pool.query(
        `SELECT * FROM interview_slots 
         WHERE id = $1 AND is_available = true
         FOR UPDATE`,
        [slotId]
      );

      if (slot.rows.length === 0) {
        await pool.query('ROLLBACK');
        return res.status(400).json({
          success: false,
          message: 'Slot-ul nu este disponibil!'
        });
      }

      if (slot.rows[0].current_bookings >= slot.rows[0].max_capacity) {
        await pool.query('ROLLBACK');
        return res.status(400).json({
          success: false,
          message: 'Slot-ul este plin!'
        });
      }

      // Creează programarea
      const booking = await pool.query(
        `INSERT INTO bookings (user_id, slot_id, status, booking_type)
         VALUES ($1, $2, 'confirmed', 'interview')
         RETURNING *`,
        [req.user.id, slotId]
      );

      // Actualizează numărul de rezervări
      await pool.query(
        `UPDATE interview_slots 
         SET current_bookings = current_bookings + 1
         WHERE id = $1`,
        [slotId]
      );

      // Commit tranzacție
      await pool.query('COMMIT');

      // Obține detaliile complete ale programării
      const bookingDetails = await pool.query(
        `SELECT 
          b.*,
          s.date,
          s.time,
          u.email,
          u.username
         FROM bookings b
         JOIN interview_slots s ON b.slot_id = s.id
         JOIN users u ON b.user_id = u.id
         WHERE b.id = $1`,
        [booking.rows[0].id]
      );

      res.status(201).json({
        success: true,
        message: 'Programare creată cu succes!',
        data: {
          ...bookingDetails.rows[0],
          date: bookingDetails.rows[0].date.toISOString().split('T')[0],
          time: bookingDetails.rows[0].time.substring(0, 5)
        }
      });

    } catch (error) {
      await pool.query('ROLLBACK');
      throw error;
    }

  } catch (error) {
    console.error('Eroare la creare programare:', error);
    res.status(500).json({
      success: false,
      message: 'Eroare la crearea programării!'
    });
  }
});

// Obține programările utilizatorului
router.get('/my', protect, async (req, res) => {
  try {
    const bookings = await pool.query(
      `SELECT 
        b.*,
        s.date,
        s.time
       FROM bookings b
       JOIN interview_slots s ON b.slot_id = s.id
       WHERE b.user_id = $1
       ORDER BY s.date DESC, s.time DESC`,
      [req.user.id]
    );

    res.json({
      success: true,
      data: bookings.rows.map(booking => ({
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

// Anulează o programare
router.put('/:id/cancel', protect, async (req, res) => {
  try {
    const { id } = req.params;

    // Începe tranzacție
    await pool.query('BEGIN');

    try {
      // Verifică dacă programarea aparține utilizatorului
      const booking = await pool.query(
        `SELECT * FROM bookings 
         WHERE id = $1 AND user_id = $2 AND status = 'confirmed'`,
        [id, req.user.id]
      );

      if (booking.rows.length === 0) {
        await pool.query('ROLLBACK');
        return res.status(404).json({
          success: false,
          message: 'Programarea nu a fost găsită!'
        });
      }

      // Actualizează statusul
      await pool.query(
        `UPDATE bookings 
         SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [id]
      );

      // Decrementează numărul de rezervări
      await pool.query(
        `UPDATE interview_slots 
         SET current_bookings = current_bookings - 1
         WHERE id = $1`,
        [booking.rows[0].slot_id]
      );

      // Commit tranzacție
      await pool.query('COMMIT');

      res.json({
        success: true,
        message: 'Programare anulată cu succes!'
      });

    } catch (error) {
      await pool.query('ROLLBACK');
      throw error;
    }

  } catch (error) {
    console.error('Eroare la anulare programare:', error);
    res.status(500).json({
      success: false,
      message: 'Eroare la anularea programării!'
    });
  }
});

module.exports = router;