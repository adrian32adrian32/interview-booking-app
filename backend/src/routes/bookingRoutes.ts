import { Router, Request, Response } from 'express';
import { pool, JWT_SECRET } from '../server';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import emailService from '../services/emailService';
import { socketService } from '../services/socketService';

const router = Router();

// Configurare multer pentru upload - ACCEPTĂ ORICE TIP DE FIȘIER
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads/documents');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `doc-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB pentru orice tip de fișier
  fileFilter: (req, file, cb) => {
    // ACCEPTĂ ORICE TIP DE FIȘIER
    cb(null, true);
  }
});

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
    (req as any).user = { id: decoded.userId || decoded.id };
    
    // Get user role
    const userResult = await pool.query('SELECT role FROM users WHERE id = $1', [(req as any).userId]);
    (req as any).userRole = userResult.rows[0]?.role || 'user';
    
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Token invalid' });
  }
};

// Verifică dacă există un client cu email-ul dat (PUBLIC ENDPOINT - NU NECESITĂ AUTENTIFICARE)
router.get('/check-client', async (req: Request, res: Response) => {
  try {
    const { email } = req.query;
    
    if (!email) {
      return res.json({ exists: false });
    }
    
    // Caută utilizatorul după email
    const query = `
      SELECT id, email, username, first_name, last_name, phone 
      FROM users 
      WHERE email = $1 AND status = 'active'
    `;
    
    const result = await pool.query(query, [email]);
    
    if (result.rows.length > 0) {
      const user = result.rows[0];
      res.json({
        exists: true,
        client: {
          email: user.email,
          username: user.username,
          first_name: user.first_name,
          last_name: user.last_name,
          phone: user.phone
        }
      });
    } else {
      res.json({ exists: false });
    }
  } catch (error) {
    console.error('Error checking client:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error checking client' 
    });
  }
});

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

// GET /api/bookings/:id/documents
router.get('/:id/documents', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userRole = (req as any).userRole;
    const userId = (req as any).userId;
    
    console.log('Fetching documents for booking ID:', id);
    
    // Mai întâi obținem booking-ul
    const bookingResult = await pool.query(
      'SELECT * FROM client_bookings WHERE id = $1',
      [id]
    );
    
    if (bookingResult.rows.length === 0) {
      return res.status(404).json({ error: 'Booking not found' });
    }
    
    const booking = bookingResult.rows[0];
    
    // Verifică permisiunile
    if (userRole !== 'admin' && booking.client_email !== (req as any).userEmail) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Obține TOATE documentele asociate cu acest booking
    const documentsResult = await pool.query(`
      SELECT 
        d.*,
        d.original_name,
        d.mime_type,
        d.file_url,
        d.filename,
        d.size,
        d.uploaded_at,
        d.booking_id
      FROM documents d
      WHERE d.booking_id = $1
      ORDER BY d.uploaded_at DESC
    `, [id]);
    
    console.log(`Found ${documentsResult.rows.length} documents for booking ${id}`);
    
    res.json({ 
      success: true, 
      documents: documentsResult.rows,
      booking_id: id,
      count: documentsResult.rows.length
    });
    
  } catch (error) {
    console.error('Get booking documents error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch documents',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// POST /api/bookings/:id/documents - Upload document pentru booking
router.post('/:id/documents', authMiddleware, upload.single('file'), async (req: Request, res: Response) => {
  try {
    console.log('📤 Upload document pentru booking:', req.params.id);
    
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Nu a fost încărcat niciun fișier'
      });
    }

    const bookingId = parseInt(req.params.id);
    const userId = (req as any).userId;
    const userRole = (req as any).userRole;
    const { type = 'other', description = '' } = req.body;
    
    console.log('File details:', {
      filename: req.file.filename,
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size
    });
    
    // Verifică dacă booking-ul există
    const bookingResult = await pool.query(
      'SELECT * FROM client_bookings WHERE id = $1',
      [bookingId]
    );
    
    if (bookingResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Programarea nu există' });
    }
    
    const booking = bookingResult.rows[0];
    
    // Verifică permisiunile
    const userEmailResult = await pool.query('SELECT email FROM users WHERE id = $1', [userId]);
    const userEmail = userEmailResult.rows[0]?.email;
    
    if (userRole !== 'admin' && booking.client_email !== userEmail) {
      return res.status(403).json({ 
        success: false, 
        message: 'Nu ai permisiunea să încarci documente pentru această programare' 
      });
    }
    
    // Salvează în DB
    const fileUrl = `/uploads/documents/${req.file.filename}`;
    const result = await pool.query(
      `INSERT INTO documents (
        user_id, booking_id, type, filename, original_name, 
        mime_type, size, path, file_url, file_name, file_size,
        uploaded_by, description, status, uploaded_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, CURRENT_TIMESTAMP)
      RETURNING *`,
      [
        userId, 
        bookingId, 
        type, 
        req.file.filename, 
        req.file.originalname, 
        req.file.mimetype, 
        req.file.size, 
        req.file.path,
        fileUrl,
        req.file.originalname,
        req.file.size,
        userRole === 'admin' ? 'admin' : 'user',
        description,
        'pending'
      ]
    );

    console.log('Document salvat în DB:', result.rows[0].id);

    res.json({
      success: true,
      message: 'Document încărcat cu succes',
      document: result.rows[0]
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Eroare la încărcarea documentului',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get available time slots endpoint specific
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

// Reschedule booking
router.put('/:id/reschedule', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { 
      interview_date, 
      interview_time, 
      send_email,
      old_date,
      old_time,
      client_email,
      client_name,
      status 
    } = req.body;
    const userRole = (req as any).userRole;
    
    console.log('🗓️ Reschedule request:', { 
      id, 
      interview_date, 
      interview_time,
      send_email,
      old_date,
      old_time 
    });
    
    // Verifică dacă utilizatorul este admin
    if (userRole !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Doar administratorii pot reprograma prin calendar'
      });
    }
    
    // Verifică dacă booking-ul există
    const bookingCheck = await pool.query(
      'SELECT * FROM client_bookings WHERE id = $1',
      [id]
    );
    
    if (bookingCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Programarea nu a fost găsită'
      });
    }
    
    const existingBooking = bookingCheck.rows[0];
    
    // Verifică conflicte
    const conflictCheck = await pool.query(
      `SELECT id FROM client_bookings 
       WHERE interview_date = $1 
       AND interview_time = $2 
       AND id != $3 
       AND status IN ('confirmed', 'pending')`,
      [interview_date, interview_time, id]
    );
    
    if (conflictCheck.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Există deja o programare la această oră!'
      });
    }
    
    // Update programare
    const result = await pool.query(
      `UPDATE client_bookings 
       SET interview_date = $1, 
           interview_time = $2,
           status = $3,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $4
       RETURNING *`,
      [interview_date, interview_time, status || existingBooking.status, id]
    );
    
    const updatedBooking = result.rows[0];
    
    // Trimite notificare WebSocket
    socketService.broadcastBookingUpdate('rescheduled', {
      ...updatedBooking,
      old_date: existingBooking.interview_date,
      old_time: existingBooking.interview_time
    });
    
    // Log pentru audit
    console.log('✅ Booking rescheduled:', {
      id: updatedBooking.id,
      oldDate: existingBooking.interview_date,
      oldTime: existingBooking.interview_time,
      newDate: interview_date,
      newTime: interview_time,
      by: 'admin'
    });
    
    res.json({
      success: true,
      booking: updatedBooking,
      message: send_email 
        ? 'Programare reprogramată cu succes și email trimis!' 
        : 'Programare reprogramată cu succes!'
    });
    
    // Trimite email de notificare în background
    if (send_email && (client_email || existingBooking.client_email)) {
      setImmediate(async () => {
        try {
          if (process.env.DISABLE_EMAIL !== 'true') {
            const emailTo = client_email || existingBooking.client_email;
            const clientFullName = client_name || existingBooking.client_name;
            
            // Trimite email de reprogramare
            await emailService.sendRescheduleEmail({
              booking: updatedBooking,
              oldDate: old_date || existingBooking.interview_date,
              oldTime: old_time || existingBooking.interview_time,
              clientEmail: emailTo,
              clientName: clientFullName
            });
            
            console.log(`✅ Email de reprogramare trimis către ${emailTo}`);
            
            // Trimite și notificare admin despre reprogramare
            await emailService.sendAdminRescheduleNotification({
              booking: updatedBooking,
              oldDate: old_date || existingBooking.interview_date,
              oldTime: old_time || existingBooking.interview_time
            });
            
            console.log('✅ Notificare admin trimisă pentru reprogramare');
          }
        } catch (emailError) {
          console.error('❌ Email notification error:', emailError);
        }
      });
    }
    
  } catch (error) {
    console.error('Reschedule error:', error);
    res.status(500).json({
      success: false,
      message: 'Eroare la reprogramare',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// DELETE booking document
router.delete('/:bookingId/documents/:docId', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { bookingId, docId } = req.params;
    const userId = (req as any).userId;
    const userRole = (req as any).userRole;
    
    // Get document
    const docResult = await pool.query(
      'SELECT * FROM documents WHERE id = $1 AND booking_id = $2',
      [docId, bookingId]
    );
    
    if (docResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Document negăsit' });
    }
    
    const document = docResult.rows[0];
    
    // Check permissions
    if (userRole !== 'admin' && document.user_id !== userId) {
      return res.status(403).json({ 
        success: false, 
        message: 'Nu ai permisiunea să ștergi acest document' 
      });
    }
    
    // Delete file from disk
    if (fs.existsSync(document.path)) {
      fs.unlinkSync(document.path);
    }
    
    // Delete from database
    await pool.query('DELETE FROM documents WHERE id = $1', [docId]);
    
    res.json({ 
      success: true, 
      message: 'Document șters cu succes' 
    });
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Eroare la ștergerea documentului' 
    });
  }
});

// Download document
router.get('/:bookingId/documents/:docId/download', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { bookingId, docId } = req.params;
    const userId = (req as any).userId;
    const userRole = (req as any).userRole;
    
    // Get document with booking info
    const docResult = await pool.query(
      `SELECT d.*, b.client_email 
       FROM documents d
       JOIN client_bookings b ON d.booking_id = b.id
       WHERE d.id = $1 AND d.booking_id = $2`,
      [docId, bookingId]
    );
    
    if (docResult.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Document negăsit' 
      });
    }
    
    const document = docResult.rows[0];
    
    // Check permissions
    const userEmailResult = await pool.query('SELECT email FROM users WHERE id = $1', [userId]);
    const userEmail = userEmailResult.rows[0]?.email;
    
    if (userRole !== 'admin' && document.client_email !== userEmail) {
      return res.status(403).json({ 
        success: false, 
        message: 'Nu ai permisiunea să descarci acest document' 
      });
    }
    
    const filePath = document.path;
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ 
        success: false, 
        message: 'Fișierul nu a fost găsit pe server' 
      });
    }
    
    // Set headers for download
    res.setHeader('Content-Disposition', `attachment; filename="${document.original_name}"`);
    res.setHeader('Content-Type', document.mime_type || 'application/octet-stream');
    
    // Send file
    res.sendFile(filePath);
  } catch (error) {
    console.error('Download error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Eroare la descărcarea documentului' 
    });
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
    
    // DEBUGGING: Log datele primite
    console.log('📤 Create booking request received:', {
      client_name,
      client_email,
      client_phone,
      interview_date,
      interview_time,
      interview_type,
      notes
    });
    
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
      // MESAJ ÎMBUNĂTĂȚIT
      return res.status(400).json({ 
        error: `Slotul de ${interview_time} din data de ${interview_date} este deja rezervat. Vă rugăm alegeți altă oră.` 
      });
    }
    
    const result = await pool.query(
      `INSERT INTO client_bookings 
       (client_name, client_email, client_phone, interview_date, interview_time, interview_type, notes, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'confirmed')
       RETURNING *`,
      [client_name, client_email, client_phone, interview_date, interview_time, interview_type || 'online', notes]
    );
    
    // Obține booking-ul creat
    const newBooking = result.rows[0];
    
    console.log('✅ Booking created successfully:', newBooking.id);
    
    // IMPORTANT: Trimite răspunsul IMEDIAT
    res.status(201).json({ 
      success: true, 
      data: result.rows[0],
      message: 'Programarea a fost creată cu succes'
    });
    
    // Trimite email-urile în BACKGROUND (după ce am trimis răspunsul)
    setImmediate(async () => {
      // Trimite notificare WebSocket către admini
      socketService.broadcastBookingUpdate('created', newBooking);
      
      try {
        const user = {
          email: client_email,
          first_name: client_name.split(' ')[0],
          last_name: client_name.split(' ').slice(1).join(' ')
        };
        
        // Verifică dacă email-ul este dezactivat
        if (process.env.DISABLE_EMAIL === 'true') {
          console.log('📧 Email service disabled - skipping notifications');
          return;
        }
        
        await emailService.sendBookingConfirmation(newBooking, user);
        console.log('✅ Confirmation email sent for:', client_email);
        
        await emailService.sendAdminNotification(newBooking);
        console.log('✅ Admin notification sent');
      } catch (emailError) {
        console.error('❌ Background email error:', emailError);
        // Nu face nimic - email-ul a eșuat dar booking-ul s-a creat
      }
    });
    
  } catch (error) {
    console.error('❌ Error creating booking:', error);
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

export default router;