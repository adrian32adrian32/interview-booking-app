import { Router, Request, Response } from 'express';
import { pool } from '../server';

const router = Router();

// Get all bookings
router.get('/', async (req: Request, res: Response) => {
  try {
    const result = await pool.query('SELECT * FROM client_bookings ORDER BY interview_date DESC');
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch bookings' });
  }
});

// Create booking
router.post('/', async (req: Request, res: Response) => {
  try {
    const { client_name, client_email, client_phone, interview_date, interview_time, interview_type, notes } = req.body;
    
    const result = await pool.query(
      `INSERT INTO client_bookings (client_name, client_email, client_phone, interview_date, interview_time, interview_type, notes, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'confirmed')
       RETURNING *`,
      [client_name, client_email, client_phone, interview_date, interview_time, interview_type, notes]
    );
    
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create booking' });
  }
});

// Get available time slots
router.get('/time-slots/available/:date', async (req: Request, res: Response) => {
  try {
    const { date } = req.params;
    const allSlots = ['09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30'];
    
    const bookedSlots = await pool.query(
      'SELECT interview_time FROM client_bookings WHERE interview_date = $1 AND status != $2',
      [date, 'cancelled']
    );
    
    const bookedTimes = bookedSlots.rows.map(row => row.interview_time);
    const availableSlots = allSlots.filter(slot => !bookedTimes.includes(slot));
    
    res.json({ success: true, date, availableSlots, bookedSlots: bookedTimes });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch available slots' });
  }
});

export default router;
