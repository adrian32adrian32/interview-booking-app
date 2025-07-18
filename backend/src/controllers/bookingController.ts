import { Request, Response } from 'express';
import { pool } from '../server';

// Obține toate programările
export const getAllBookings = async (req: Request, res: Response) => {
  try {
    const result = await pool.query(
      'SELECT * FROM bookings ORDER BY interview_date DESC, interview_time ASC'
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching bookings:', error);
    res.status(500).json({ error: 'Failed to fetch bookings' });
  }
};

// Obține o programare după ID
export const getBookingById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'SELECT * FROM bookings WHERE id = $1',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Booking not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching booking:', error);
    res.status(500).json({ error: 'Failed to fetch booking' });
  }
};

// Creează o programare nouă
export const createBooking = async (req: Request, res: Response) => {
  try {
    // Acceptă ambele formate de nume câmpuri (camelCase și snake_case)
    const {
      clientName,
      clientEmail,
      clientPhone,
      interviewDate,
      interviewTime,
      interviewType,
      notes,
      // Alternative cu snake_case
      client_name,
      client_email,
      client_phone,
      interview_date,
      interview_time,
      interview_type,
      status,
      created_by
    } = req.body;

    // Folosește valorile disponibile (prioritate la snake_case pentru compatibilitate cu frontend)
    const name = client_name || clientName;
    const email = client_email || clientEmail;
    const phone = client_phone || clientPhone;
    const date = interview_date || interviewDate;
    const time = interview_time || interviewTime;
    const type = interview_type || interviewType || 'online';
    const bookingNotes = notes || '';
    const bookingStatus = status || 'pending';

    // Validare
    if (!name || !email || !phone || !date || !time) {
      return res.status(400).json({ 
        success: false,
        message: 'Toate câmpurile obligatorii trebuie completate' 
      });
    }

    // Verifică dacă slotul este disponibil
    const slotCheck = await pool.query(
      'SELECT * FROM bookings WHERE interview_date = $1 AND interview_time = $2 AND status != $3',
      [date, time, 'cancelled']
    );

    if (slotCheck.rows.length > 0) {
      return res.status(400).json({ 
        success: false,
        message: 'Acest slot este deja rezervat' 
      });
    }

    // Creează programarea
    const result = await pool.query(
      `INSERT INTO bookings 
       (client_name, client_email, client_phone, interview_date, interview_time, interview_type, status, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [name, email, phone, date, time, type, bookingStatus, bookingNotes]
    );

    res.status(201).json({
      success: true,
      message: 'Programare creată cu succes',
      booking: result.rows[0],
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error creating booking:', error);
    res.status(500).json({ 
      success: false,
      message: 'Eroare la crearea programării',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Actualizează o programare
export const updateBooking = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    const result = await pool.query(
      `UPDATE bookings 
       SET status = COALESCE($1, status), 
           notes = COALESCE($2, notes),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $3
       RETURNING *`,
      [status, notes, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    res.json({
      success: true,
      message: 'Booking updated successfully',
      booking: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating booking:', error);
    res.status(500).json({ error: 'Failed to update booking' });
  }
};

// Șterge o programare
export const deleteBooking = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      'DELETE FROM bookings WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    res.json({ 
      success: true,
      message: 'Booking deleted successfully' 
    });
  } catch (error) {
    console.error('Error deleting booking:', error);
    res.status(500).json({ error: 'Failed to delete booking' });
  }
};

// Obține programările pentru o dată specifică
export const getBookingsByDate = async (req: Request, res: Response) => {
  try {
    const { date } = req.params;
    
    const result = await pool.query(
      'SELECT * FROM bookings WHERE interview_date = $1 ORDER BY interview_time ASC',
      [date]
    );
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching bookings by date:', error);
    res.status(500).json({ error: 'Failed to fetch bookings' });
  }
};

// Obține sloturile disponibile pentru o dată specifică
export const getAvailableTimeSlots = async (req: Request, res: Response) => {
  try {
    const { date } = req.params;
    
    // Toate sloturile posibile (9:00 - 18:00, interval 30 min)
    const allSlots = [
      '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
      '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
      '15:00', '15:30', '16:00', '16:30', '17:00', '17:30'
    ];
    
    // Obține sloturile ocupate pentru data respectivă
    const bookedSlots = await pool.query(
      `SELECT interview_time FROM bookings 
       WHERE interview_date = $1 
       AND status != 'cancelled'`,
      [date]
    );
    
    const bookedTimes = bookedSlots.rows.map(row => row.interview_time);
    const availableSlots = allSlots.filter(slot => !bookedTimes.includes(slot));
    
    res.json({
      success: true,
      date,
      allSlots,
      availableSlots,
      bookedSlots: bookedTimes,
      workingHours: {
        start: '09:00',
        end: '18:00',
        interval: 30
      }
    });
  } catch (error) {
    console.error('Error fetching available slots:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch available slots' 
    });
  }
};