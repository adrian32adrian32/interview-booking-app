import { Router, Request, Response } from 'express';
import { pool } from '../server';
import { authenticateToken, authorize } from '../middleware/auth';

const router = Router();

// Obține sloturile disponibile pentru o zi
router.get('/available/:date', async (req: Request, res: Response) => {
  try {
    const { date } = req.params;
    const requestedDate = new Date(date);
    const dayOfWeek = requestedDate.getDay();
    
    // 1. Verifică dacă ziua este blocată
    const blockedDay = await pool.query(
      'SELECT * FROM blocked_dates WHERE blocked_date = $1',
      [date]
    );
    
    if (blockedDay.rows.length > 0) {
      return res.json({
        success: true,
        available: false,
        reason: blockedDay.rows[0].reason || 'Zi indisponibilă',
        slots: []
      });
    }
    
    // 2. Obține configurația pentru ziua respectivă
    const config = await pool.query(
      'SELECT * FROM time_slot_config WHERE day_of_week = $1 AND is_active = true',
      [dayOfWeek]
    );
    
    if (config.rows.length === 0) {
      return res.json({
        success: true,
        available: false,
        reason: 'Nu sunt programări disponibile în această zi',
        slots: []
      });
    }
    
    const { start_time, end_time, slot_duration } = config.rows[0];
    
    // 3. Obține sloturile ocupate
    const occupiedSlots = await pool.query(`
      SELECT interview_time as start_time, 
             COALESCE(end_time, (interview_time::TIME + INTERVAL '1 hour')) as end_time
      FROM client_bookings
      WHERE interview_date = $1 
      AND status NOT IN ('cancelled', 'rejected')
      ORDER BY interview_time
    `, [date]);
    
    // 4. Obține sloturile blocate specific
    const blockedSlots = await pool.query(
      'SELECT start_time, end_time FROM blocked_time_slots WHERE date = $1',
      [date]
    );
    
    // 5. Generează toate sloturile posibile
    const allSlots = generateTimeSlots(start_time, end_time, slot_duration);
    
    // 6. Filtrează sloturile disponibile
    const availableSlots = allSlots.filter(slot => {
      // Verifică dacă slotul nu este ocupat
      const isOccupied = occupiedSlots.rows.some(occupied => {
        return isTimeOverlap(slot.start, slot.end, occupied.start_time, occupied.end_time);
      });
      
      // Verifică dacă slotul nu este blocat
      const isBlocked = blockedSlots.rows.some(blocked => {
        return isTimeOverlap(slot.start, slot.end, blocked.start_time, blocked.end_time);
      });
      
      // Verifică dacă nu e în trecut (pentru ziua curentă)
      if (isToday(requestedDate)) {
        const now = new Date();
        const slotTime = new Date(`${date} ${slot.start}`);
        if (slotTime <= now) {
          return false;
        }
      }
      
      return !isOccupied && !isBlocked;
    });
    
    res.json({
      success: true,
      available: true,
      date: date,
      dayOfWeek: getDayName(dayOfWeek),
      workingHours: {
        start: start_time,
        end: end_time
      },
      slotDuration: slot_duration,
      slots: availableSlots
    });
    
  } catch (error) {
    console.error('Error fetching available slots:', error);
    res.status(500).json({
      success: false,
      message: 'Eroare la obținerea sloturilor disponibile'
    });
  }
});

// Configurare program de lucru (admin only)
router.post('/config', authenticateToken, authorize(['admin']), async (req: Request, res: Response) => {
  try {
    const { dayOfWeek, startTime, endTime, slotDuration } = req.body;
    
    // Verifică dacă există deja configurare pentru această zi
    const existing = await pool.query(
      'SELECT * FROM time_slot_config WHERE day_of_week = $1',
      [dayOfWeek]
    );
    
    if (existing.rows.length > 0) {
      // Update
      await pool.query(`
        UPDATE time_slot_config 
        SET start_time = $1, end_time = $2, slot_duration = $3, updated_at = CURRENT_TIMESTAMP
        WHERE day_of_week = $4
      `, [startTime, endTime, slotDuration, dayOfWeek]);
    } else {
      // Insert
      await pool.query(`
        INSERT INTO time_slot_config (day_of_week, start_time, end_time, slot_duration)
        VALUES ($1, $2, $3, $4)
      `, [dayOfWeek, startTime, endTime, slotDuration]);
    }
    
    res.json({
      success: true,
      message: 'Configurare salvată cu succes'
    });
  } catch (error) {
    console.error('Error saving config:', error);
    res.status(500).json({
      success: false,
      message: 'Eroare la salvarea configurării'
    });
  }
});

// Obține configurarea curentă (admin only)
router.get('/config', authenticateToken, authorize(['admin']), async (req: Request, res: Response) => {
  try {
    const config = await pool.query(
      'SELECT * FROM time_slot_config ORDER BY day_of_week'
    );
    
    res.json({
      success: true,
      config: config.rows
    });
  } catch (error) {
    console.error('Error fetching config:', error);
    res.status(500).json({
      success: false,
      message: 'Eroare la obținerea configurării'
    });
  }
});

// Blochează o zi întreagă (admin only)
router.post('/block-date', authenticateToken, authorize(['admin']), async (req: Request, res: Response) => {
  try {
    const { date, reason } = req.body;
    const adminId = (req as any).user.id;
    
    await pool.query(`
      INSERT INTO blocked_dates (blocked_date, reason, blocked_by)
      VALUES ($1, $2, $3)
      ON CONFLICT (blocked_date) 
      DO UPDATE SET reason = $2, blocked_by = $3
    `, [date, reason, adminId]);
    
    res.json({
      success: true,
      message: 'Zi blocată cu succes'
    });
  } catch (error) {
    console.error('Error blocking date:', error);
    res.status(500).json({
      success: false,
      message: 'Eroare la blocarea zilei'
    });
  }
});

// Deblochează o zi (admin only)
router.delete('/block-date/:date', authenticateToken, authorize(['admin']), async (req: Request, res: Response) => {
  try {
    const { date } = req.params;
    
    await pool.query('DELETE FROM blocked_dates WHERE blocked_date = $1', [date]);
    
    res.json({
      success: true,
      message: 'Zi deblocată cu succes'
    });
  } catch (error) {
    console.error('Error unblocking date:', error);
    res.status(500).json({
      success: false,
      message: 'Eroare la deblocarea zilei'
    });
  }
});

// Obține zilele blocate
router.get('/blocked-dates', async (req: Request, res: Response) => {
  try {
    const blockedDates = await pool.query(`
      SELECT bd.*, u.username as blocked_by_name
      FROM blocked_dates bd
      LEFT JOIN users u ON bd.blocked_by = u.id
      WHERE bd.blocked_date >= CURRENT_DATE
      ORDER BY bd.blocked_date
    `);
    
    res.json({
      success: true,
      blockedDates: blockedDates.rows
    });
  } catch (error) {
    console.error('Error fetching blocked dates:', error);
    res.status(500).json({
      success: false,
      message: 'Eroare la obținerea zilelor blocate'
    });
  }
});

// Funcții helper
function generateTimeSlots(startTime: string, endTime: string, duration: number): any[] {
  const slots = [];
  const start = parseTime(startTime);
  const end = parseTime(endTime);
  
  let current = new Date(start);
  
  while (current < end) {
    const slotEnd = new Date(current.getTime() + duration * 60000);
    
    if (slotEnd <= end) {
      slots.push({
        start: formatTime(current),
        end: formatTime(slotEnd),
        display: `${formatTime(current)} - ${formatTime(slotEnd)}`
      });
    }
    
    current = new Date(current.getTime() + duration * 60000);
  }
  
  return slots;
}

function parseTime(timeStr: string): Date {
  const [hours, minutes] = timeStr.split(':').map(Number);
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return date;
}

function formatTime(date: Date): string {
  return date.toTimeString().slice(0, 5);
}

function isTimeOverlap(start1: string, end1: string, start2: string, end2: string): boolean {
  const s1 = parseTime(start1);
  const e1 = parseTime(end1);
  const s2 = parseTime(start2);
  const e2 = parseTime(end2);
  
  return s1 < e2 && e1 > s2;
}

function isToday(date: Date): boolean {
  const today = new Date();
  return date.toDateString() === today.toDateString();
}

function getDayName(dayOfWeek: number): string {
  const days = ['Duminică', 'Luni', 'Marți', 'Miercuri', 'Joi', 'Vineri', 'Sâmbătă'];
  return days[dayOfWeek];
}

export default router;