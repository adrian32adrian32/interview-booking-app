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
    const {
      clientName,
      clientEmail,
      clientPhone,
      interviewDate,
      interviewTime,
      interviewType,
      notes
    } = req.body;

    // Verifică dacă slotul este disponibil
    const slotCheck = await pool.query(
      'SELECT * FROM bookings WHERE interview_date = $1 AND interview_time = $2 AND status != $3',
      [interviewDate, interviewTime, 'cancelled']
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
      [clientName, clientEmail, clientPhone, interviewDate, interviewTime, interviewType, 'pending', notes || null]
    );

    res.status(201).json({
      success: true,
      message: 'Programare creată cu succes',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error creating booking:', error);
    res.status(500).json({ 
      success: false,
      message: 'Eroare la crearea programării' 
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

    res.json({ message: 'Booking deleted successfully' });
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