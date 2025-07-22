import { Router, Request, Response } from 'express';
import { pool, JWT_SECRET } from '../server';
import jwt from 'jsonwebtoken';

const router = Router();

// Middleware pentru verificare autentificare
const authMiddleware = async (req: Request, res: Response, next: Function) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Nu ești autentificat' });
    }
    
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    (req as any).userId = decoded.userId || decoded.id;
    
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Token invalid' });
  }
};

// Get user's own bookings
router.get('/my-bookings', authMiddleware, async (req: Request, res: Response) => {
  try {
    console.log('📥 My-bookings route hit');
    
    const userId = (req as any).userId;
    console.log('User ID:', userId);
    
    // Get user's email
    const userResult = await pool.query('SELECT email FROM users WHERE id = $1', [userId]);
    if (userResult.rows.length === 0) {
      console.log('User not found for ID:', userId);
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    const userEmail = userResult.rows[0].email;
    console.log('User email:', userEmail);
    
    // Get bookings
    const result = await pool.query(`
      SELECT 
        cb.id,
        cb.client_name,
        cb.client_email,
        cb.client_phone,
        cb.interview_date,
        cb.interview_time,
        cb.interview_type,
        cb.status,
        cb.notes,
        cb.created_at,
        COUNT(DISTINCT d.id) as documents_count
      FROM client_bookings cb
      LEFT JOIN documents d ON d.booking_id = cb.id
      WHERE cb.client_email = $1
      GROUP BY cb.id
      ORDER BY cb.interview_date DESC, cb.interview_time DESC
    `, [userEmail]);
    
    console.log('Found bookings:', result.rows.length);
    
    res.json({
      success: true,
      bookings: result.rows
    });
  } catch (error) {
    console.error('Error in my-bookings route:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch bookings',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get available time slots for a specific date
router.get('/available-slots', async (req: Request, res: Response) => {
  try {
    const { date } = req.query;
    
    if (!date) {
      return res.status(400).json({ 
        success: false, 
        message: 'Data este obligatorie' 
      });
    }
    
    // Default slots pentru toate zilele
    const defaultSlots = [
      '09:00', '09:30', '10:00', '10:30', '11:00', '11:30', 
      '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', 
      '15:00', '15:30', '16:00', '16:30', '17:00', '17:30'
    ];
    
    // Get existing bookings for this date
    const bookingsResult = await pool.query(`
      SELECT interview_time, status 
      FROM client_bookings 
      WHERE interview_date = $1 
      AND status IN ('pending', 'confirmed')
    `, [date]);
    
    const bookedTimes = bookingsResult.rows.map(b => b.interview_time);
    
    // Create available slots
    const slots = defaultSlots.map((time, index) => ({
      id: `slot-${date}-${index}`,
      date: date as string,
      time: time,
      available: !bookedTimes.includes(time),
      available_spots: bookedTimes.includes(time) ? 0 : 1
    }));
    
    res.json({
      success: true,
      data: {
        date: date,
        slots: slots
      }
    });
    
  } catch (error) {
    console.error('Error fetching available slots:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Eroare la încărcarea sloturilor disponibile' 
    });
  }
});

// Get all bookings (admin)
router.get('/', async (req: Request, res: Response) => {
  try {
    const { status, date, search } = req.query;
    
    let query = `
      SELECT 
        cb.*,
        COUNT(DISTINCT d.id) as documents_count
      FROM client_bookings cb
      LEFT JOIN documents d ON d.booking_id = cb.id
      WHERE 1=1
    `;
    
    const params: any[] = [];
    let paramIndex = 1;
    
    if (status) {
      query += ` AND cb.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }
    
    if (date) {
      query += ` AND cb.interview_date = $${paramIndex}`;
      params.push(date);
      paramIndex++;
    }
    
    if (search) {
      query += ` AND (cb.client_name ILIKE $${paramIndex} OR cb.client_email ILIKE $${paramIndex} OR cb.client_phone ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }
    
    query += ` GROUP BY cb.id ORDER BY cb.interview_date DESC, cb.interview_time DESC`;
    
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching bookings:', error);
    res.status(500).json({ error: 'Failed to fetch bookings' });
  }
});

// Get single booking
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'SELECT * FROM client_bookings WHERE id = $1',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Booking not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch booking' });
  }
});

// Create booking with validation
router.post('/', async (req: Request, res: Response) => {
  try {
    const { 
      client_name, 
      client_email, 
      client_phone, 
      interview_date, 
      interview_time, 
      interview_type, 
      notes 
    } = req.body;
    
    // Validări
    if (!client_name || !client_email || !client_phone || !interview_date || !interview_time) {
      return res.status(400).json({ 
        error: 'Toate câmpurile obligatorii trebuie completate' 
      });
    }
    
    // Validare email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(client_email)) {
      return res.status(400).json({ 
        error: 'Adresa de email nu este validă' 
      });
    }
    
    // Validare telefon (pentru România)
    const phoneRegex = /^(\+?4?0)?[0-9]{9,10}$/;
    if (!phoneRegex.test(client_phone.replace(/\s/g, ''))) {
      return res.status(400).json({ 
        error: 'Numărul de telefon nu este valid' 
      });
    }
    
    // Verifică dacă slotul este disponibil
    const existingBooking = await pool.query(
      `SELECT id FROM client_bookings 
       WHERE interview_date = $1 
       AND interview_time = $2 
       AND status IN ('pending', 'confirmed')`,
      [interview_date, interview_time]
    );
    
    if (existingBooking.rows.length > 0) {
      return res.status(400).json({ 
        error: 'Acest slot de timp este deja rezervat' 
      });
    }
    
    const result = await pool.query(
      `INSERT INTO client_bookings 
       (client_name, client_email, client_phone, interview_date, interview_time, interview_type, notes, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'confirmed')
       RETURNING *`,
      [client_name, client_email, client_phone, interview_date, interview_time, interview_type || 'online', notes]
    );
    
    res.status(201).json({ 
      success: true, 
      data: result.rows[0],
      message: 'Programarea a fost creată cu succes'
    });
  } catch (error) {
    console.error('Error creating booking:', error);
    res.status(500).json({ error: 'Failed to create booking' });
  }
});

// Update booking
router.put('/:id', async (req: Request, res: Response) => {
  try {
    console.log('=== BOOKING ROUTES - UPDATE REQUEST ===');
    console.log('Path:', req.path);
    console.log('Params:', req.params);
    console.log('Body:', JSON.stringify(req.body, null, 2));
    console.log('=====================================');
    
    const { id } = req.params;
    const updateData = req.body;
    
    // Verificăm dacă booking-ul există
    const checkBooking = await pool.query('SELECT * FROM client_bookings WHERE id = $1', [id]);
    if (checkBooking.rows.length === 0) {
      return res.status(404).json({ error: 'Booking not found' });
    }
    
    // Verificăm dacă e doar update de status
    if (Object.keys(updateData).length === 1 && updateData.status !== undefined) {
      console.log('>>> Update doar pentru status:', updateData.status);
      
      const result = await pool.query(
        `UPDATE client_bookings 
         SET status = $1, updated_at = CURRENT_TIMESTAMP
         WHERE id = $2
         RETURNING *`,
        [updateData.status, id]
      );
      
      console.log('>>> Status actualizat cu succes');
      return res.json({ success: true, data: result.rows[0] });
    }
    
    // Pentru update complet, construim query dinamic
    const fields = [];
    const values = [];
    let paramIndex = 1;
    
    const allowedFields = ['client_name', 'client_email', 'client_phone', 
                          'interview_date', 'interview_time', 'interview_type', 
                          'notes', 'status'];
    
    for (const field of allowedFields) {
      if (updateData[field] !== undefined) {
        fields.push(`${field} = $${paramIndex}`);
        
        if (field === 'interview_date' && updateData[field]) {
          const dateValue = updateData[field].split('T')[0];
          console.log(`>>> Formatare dată: ${updateData[field]} -> ${dateValue}`);
          values.push(dateValue);
        } else {
          values.push(updateData[field]);
        }
        
        paramIndex++;
      }
    }
    
    if (fields.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }
    
    // Validări pentru update
    if (updateData.client_email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(updateData.client_email)) {
        return res.status(400).json({ error: 'Adresa de email nu este validă' });
      }
    }
    
    if (updateData.client_phone) {
      const phoneRegex = /^(\+?4?0)?[0-9]{9,10}$/;
      if (!phoneRegex.test(updateData.client_phone.replace(/\s/g, ''))) {
        return res.status(400).json({ error: 'Numărul de telefon nu este valid' });
      }
    }
    
    // Verifică disponibilitatea slotului dacă se schimbă data sau ora
    if (updateData.interview_date || updateData.interview_time) {
      const newDate = updateData.interview_date || checkBooking.rows[0].interview_date;
      const newTime = updateData.interview_time || checkBooking.rows[0].interview_time;
      
      const existingBooking = await pool.query(
        `SELECT id FROM client_bookings 
         WHERE interview_date = $1 
         AND interview_time = $2 
         AND status IN ('pending', 'confirmed')
         AND id != $3`,
        [newDate, newTime, id]
      );
      
      if (existingBooking.rows.length > 0) {
        return res.status(400).json({ error: 'Acest slot de timp este deja rezervat' });
      }
    }
    
    fields.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);
    
    const query = `
      UPDATE client_bookings 
      SET ${fields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;
    
    console.log('>>> Update query:', query);
    console.log('>>> Update values:', values);
    
    const result = await pool.query(query, values);
    
    console.log('>>> Update complet executat cu succes');
    res.json({ 
      success: true, 
      data: result.rows[0],
      message: 'Programarea a fost actualizată cu succes'
    });
  } catch (error) {
    console.error('>>> Update booking error:', error);
    res.status(500).json({ error: 'Failed to update booking' });
  }
});

// Delete booking
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // Verifică dacă există documente asociate
    const documentsCheck = await pool.query(
      'SELECT COUNT(*) as count FROM documents WHERE booking_id = $1',
      [id]
    );
    
    if (parseInt(documentsCheck.rows[0].count) > 0) {
      return res.status(400).json({ 
        error: 'Nu se poate șterge programarea deoarece are documente asociate' 
      });
    }
    
    const result = await pool.query(
      'DELETE FROM client_bookings WHERE id = $1 RETURNING id',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Booking not found' });
    }
    
    res.json({ 
      success: true, 
      message: 'Programarea a fost ștearsă cu succes' 
    });
  } catch (error) {
    console.error('Error deleting booking:', error);
    res.status(500).json({ error: 'Failed to delete booking' });
  }
});

// Get booking documents
router.get('/:id/documents', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      `SELECT 
        d.*,
        u.username as uploaded_by_username
      FROM documents d
      LEFT JOIN users u ON u.id = d.user_id
      WHERE d.booking_id = $1 
      ORDER BY d.uploaded_at DESC`,
      [id]
    );
    
    res.json({ 
      success: true, 
      documents: result.rows 
    });
  } catch (error) {
    console.error('Error fetching documents:', error);
    res.status(500).json({ error: 'Failed to fetch documents' });
  }
});

// Get available time slots (legacy endpoint)
router.get('/time-slots/available/:date', async (req: Request, res: Response) => {
  try {
    const { date } = req.params;
    const allSlots = ['09:00', '09:30', '10:00', '10:30', '11:00', '11:30', 
                      '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', 
                      '15:00', '15:30', '16:00', '16:30', '17:00', '17:30'];
    
    const bookedSlots = await pool.query(
      'SELECT interview_time FROM client_bookings WHERE interview_date = $1 AND status != $2',
      [date, 'cancelled']
    );
    
    const bookedTimes = bookedSlots.rows.map(row => row.interview_time);
    const availableSlots = allSlots.filter(slot => !bookedTimes.includes(slot));
    
    res.json({ 
      success: true, 
      date, 
      availableSlots, 
      bookedSlots: bookedTimes 
    });
  } catch (error) {
    console.error('Error fetching available slots:', error);
    res.status(500).json({ error: 'Failed to fetch available slots' });
  }
});

export default router;