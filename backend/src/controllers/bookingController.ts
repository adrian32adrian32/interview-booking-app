import { socketService } from '../services/socketService';
import emailService from '../services/emailService';
import { Request, Response } from 'express';
import { pool } from '../server';
import bcrypt from 'bcryptjs';

// Obține toate programările
export const getAllBookings = async (req: Request, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT 
        b.id,
        b.user_id,
        b.client_name,
        b.client_email,
        b.client_phone,
        b.interview_date,
        b.interview_time,
        b.interview_type,
        b.status,
        b.notes,
        b.created_at,
        b.updated_at,
        u.username,
        u.first_name,
        u.last_name
      FROM bookings b
      LEFT JOIN users u ON b.user_id = u.id
      ORDER BY b.interview_date DESC, b.interview_time DESC`
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
      `SELECT b.*, u.username, u.first_name, u.last_name 
       FROM bookings b
       LEFT JOIN users u ON b.user_id = u.id
       WHERE b.id = $1`,
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
      created_by,
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
        message: 'Toate câmpurile obligatorii trebuie completate',
      });
    }

    // Verifică dacă există un utilizator cu acest email
    let userId = req.user?.id; // Dacă e user logat

    if (!userId) {
      // Verifică dacă există deja un user cu acest email
      const existingUserQuery = 'SELECT id FROM users WHERE email = $1';
      const existingUserResult = await pool.query(existingUserQuery, [email]);

      if (existingUserResult.rows.length > 0) {
        // Există deja un user cu acest email
        userId = existingUserResult.rows[0].id;
      } else {
        // Creează un nou user pentru acest email
        const createUserQuery = `
          INSERT INTO users (email, username, password, first_name, last_name, phone, role, status)
          VALUES ($1, $2, $3, $4, $5, $6, 'user', 'active')
          RETURNING id
        `;

        // Generează username din email
        const username = email.split('@')[0] + '_' + Date.now();

        // Generează o parolă temporară
        const tempPassword = Math.random().toString(36).slice(-8);
        const hashedPassword = await bcrypt.hash(tempPassword, 10);

        // Extrage nume și prenume din client_name
        const nameParts = name.trim().split(' ');
        const firstName = nameParts[0] || '';
        const lastName = nameParts.slice(1).join(' ') || '';

        const newUserResult = await pool.query(createUserQuery, [
          email,
          username,
          hashedPassword,
          firstName,
          lastName,
          phone,
        ]);

        userId = newUserResult.rows[0].id;

        // TODO: Trimite email cu credențialele (opțional)
        // await emailService.sendWelcomeEmail(email, tempPassword);
      }
    }

    // Verifică dacă slotul este disponibil
    const slotCheck = await pool.query(
      'SELECT * FROM bookings WHERE interview_date = $1 AND interview_time = $2 AND status != $3',
      [date, time, 'cancelled']
    );

    if (slotCheck.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Acest slot este deja rezervat',
      });
    }

    // Creează programarea în tabelul bookings
    const result = await pool.query(
      `INSERT INTO bookings 
       (user_id, client_name, client_email, client_phone, interview_date, interview_time, interview_type, status, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [userId, name, email, phone, date, time, type, bookingStatus, bookingNotes]
    );
    
    // Obține booking-ul creat
    const newBooking = result.rows[0];

    // Trimite notificare Socket.io
    socketService.broadcastBookingUpdate('created', newBooking);

    // Trimite email de confirmare
    try {
      // Pregătește datele utilizatorului pentru email
      const user = {
        id: userId,
        email: email,
        first_name: name.split(' ')[0],
        last_name: name.split(' ').slice(1).join(' '),
      };

      // Trimite email de confirmare clientului
      await emailService.sendBookingConfirmation(newBooking, user);
      console.log('✅ Confirmation email sent to:', email);

      // Trimite notificare administratorului
      await emailService.sendAdminNotification(newBooking);
      console.log('✅ Admin notification sent');
    } catch (emailError) {
      console.error('❌ Error sending emails:', emailError);
      // Nu bloca crearea booking-ului dacă email-ul eșuează
    }

    res.status(201).json({
      success: true,
      message: userId ? 'Programare creată cu succes!' : 'Programare creată și cont nou creat!',
      booking: result.rows[0],
      data: result.rows[0],
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
    const { 
      status, 
      notes,
      client_name,
      client_email,
      client_phone,
      interview_date,
      interview_time,
      interview_type
    } = req.body;

    // Obține booking-ul vechi pentru comparație
    const oldBookingResult = await pool.query('SELECT * FROM bookings WHERE id = $1', [id]);
    if (oldBookingResult.rows.length === 0) {
      return res.status(404).json({ error: 'Booking not found' });
    }
    const oldBooking = oldBookingResult.rows[0];

    // Construiește query-ul dinamic pentru a actualiza doar câmpurile trimise
    const updateFields = [];
    const values = [];
    let paramCounter = 1;

    if (status !== undefined) {
      updateFields.push(`status = $${paramCounter}`);
      values.push(status);
      paramCounter++;
    }
    if (notes !== undefined) {
      updateFields.push(`notes = $${paramCounter}`);
      values.push(notes);
      paramCounter++;
    }
    if (client_name !== undefined) {
      updateFields.push(`client_name = $${paramCounter}`);
      values.push(client_name);
      paramCounter++;
    }
    if (client_email !== undefined) {
      updateFields.push(`client_email = $${paramCounter}`);
      values.push(client_email);
      paramCounter++;
    }
    if (client_phone !== undefined) {
      updateFields.push(`client_phone = $${paramCounter}`);
      values.push(client_phone);
      paramCounter++;
    }
    if (interview_date !== undefined) {
      updateFields.push(`interview_date = $${paramCounter}`);
      values.push(interview_date);
      paramCounter++;
    }
    if (interview_time !== undefined) {
      updateFields.push(`interview_time = $${paramCounter}`);
      values.push(interview_time);
      paramCounter++;
    }
    if (interview_type !== undefined) {
      updateFields.push(`interview_type = $${paramCounter}`);
      values.push(interview_type);
      paramCounter++;
    }

    // Adaugă timestamp-ul de actualizare
    updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
    
    // Adaugă ID-ul la final
    values.push(id);
    
    const query = `
      UPDATE bookings 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramCounter}
      RETURNING *
    `;

    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    const updatedBooking = result.rows[0];

    // Trimite notificare Socket.io
    if (status !== undefined && oldBooking.status !== status) {
      // Status s-a schimbat
      if (status === 'cancelled') {
        socketService.broadcastBookingUpdate('cancelled', updatedBooking);
      } else {
        socketService.broadcastBookingUpdate('updated', updatedBooking);
      }
    } else {
      // Alte modificări
      socketService.broadcastBookingUpdate('updated', updatedBooking);
    }

    res.json({
      success: true,
      message: 'Booking updated successfully',
      booking: result.rows[0],
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating booking:', error);
    res.status(500).json({ error: 'Failed to update booking' });
  }
};

// FUNCȚIE NOUĂ: Reprogramează o programare cu opțiune de email
export const rescheduleBooking = async (req: Request, res: Response) => {
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

    // Verifică dacă programarea există
    const existingBookingResult = await pool.query(
      'SELECT * FROM bookings WHERE id = $1',
      [id]
    );

    if (existingBookingResult.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Programarea nu a fost găsită' 
      });
    }

    const existingBooking = existingBookingResult.rows[0];

    // Verifică dacă noul slot este disponibil
    const slotCheck = await pool.query(
      'SELECT * FROM bookings WHERE interview_date = $1 AND interview_time = $2 AND status != $3 AND id != $4',
      [interview_date, interview_time, 'cancelled', id]
    );

    if (slotCheck.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Noul slot este deja rezervat',
      });
    }

    // Actualizează programarea în baza de date
    const result = await pool.query(
      `UPDATE bookings 
       SET interview_date = $1, interview_time = $2, status = $3, updated_at = CURRENT_TIMESTAMP
       WHERE id = $4
       RETURNING *`,
      [interview_date, interview_time, status || existingBooking.status, id]
    );

    const updatedBooking = result.rows[0];

    // Trimite notificare Socket.io pentru reprogramare
    socketService.broadcastBookingUpdate('rescheduled', {
      ...updatedBooking,
      old_date: existingBooking.interview_date,
      old_time: existingBooking.interview_time
    });

    // Trimite email dacă este solicitat
    if (send_email && (client_email || existingBooking.client_email)) {
      try {
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

      } catch (emailError) {
        console.error('❌ Eroare la trimiterea emailului de reprogramare:', emailError);
        // Nu oprim procesul dacă emailul eșuează
      }
    }

    res.json({
      success: true,
      message: send_email 
        ? 'Programare reprogramată cu succes și email trimis!' 
        : 'Programare reprogramată cu succes!',
      booking: updatedBooking,
      data: updatedBooking
    });

  } catch (error) {
    console.error('Error rescheduling booking:', error);
    res.status(500).json({ 
      success: false,
      message: 'Eroare la reprogramarea interviului',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
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

    const deletedBooking = result.rows[0];

    // Trimite notificare Socket.io
    socketService.broadcastBookingUpdate('cancelled', deletedBooking);

    res.json({ 
      success: true,
      message: 'Booking deleted successfully',
      data: result.rows[0]
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
      `SELECT b.*, u.username, u.first_name, u.last_name 
       FROM bookings b
       LEFT JOIN users u ON b.user_id = u.id
       WHERE b.interview_date = $1 
       ORDER BY b.interview_time ASC`,
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
    
    // Obține sloturile ocupate pentru data respectivă din bookings
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

// Obține programările utilizatorului curent
export const getMyBookings = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const result = await pool.query(
      `SELECT * FROM bookings 
       WHERE user_id = $1 
       ORDER BY interview_date DESC, interview_time DESC`,
      [userId]
    );
    
    res.json({
      success: true,
      bookings: result.rows
    });
  } catch (error) {
    console.error('Error fetching user bookings:', error);
    res.status(500).json({ error: 'Failed to fetch bookings' });
  }
};