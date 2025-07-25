import { Router, Request, Response } from 'express';
import { pool } from '../server';

const router = Router();

// Endpoint existent
router.get('/', async (req: Request, res: Response) => {
  try {
    const { period = 'month' } = req.query;
    
    // Statistici bookings
    const bookingsStats = await pool.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
        COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
        COUNT(CASE WHEN status = 'confirmed' THEN 1 END) as confirmed
      FROM client_bookings
      WHERE created_at >= NOW() - INTERVAL '1 ${period}'
    `);
    
    // Statistici users
    const usersStats = await pool.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN last_login >= NOW() - INTERVAL '7 days' THEN 1 END) as active,
        COUNT(CASE WHEN created_at >= NOW() - INTERVAL '1 ${period}' THEN 1 END) as new
      FROM users
    `);
    
    res.json({
      success: true,
      period,
      bookings: bookingsStats.rows[0],
      users: usersStats.rows[0],
      conversion: {
        rate: bookingsStats.rows[0].total > 0 
          ? Math.round((bookingsStats.rows[0].completed / bookingsStats.rows[0].total) * 100)
          : 0
      }
    });
  } catch (error) {
    console.error('Error fetching statistics:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

// Dashboard endpoint actualizat
router.get('/dashboard', async (req: Request, res: Response) => {
  try {
    // Total utilizatori
    const totalUsersResult = await pool.query('SELECT COUNT(*) as total FROM users');
    
    // Total programări
    const totalBookingsResult = await pool.query('SELECT COUNT(*) as total FROM client_bookings');
    
    // Programări azi
    const todayResult = await pool.query(
      'SELECT COUNT(*) as total FROM client_bookings WHERE interview_date = CURRENT_DATE'
    );
    
    // Programări mâine
    const tomorrowResult = await pool.query(
      'SELECT COUNT(*) as total FROM client_bookings WHERE interview_date = CURRENT_DATE + INTERVAL \'1 day\''
    );
    
    // Distribuție status
    const statusResult = await pool.query(`
      SELECT status, COUNT(*) as count 
      FROM client_bookings 
      GROUP BY status
    `);
    
    // Evoluție zilnică pentru ultimele 14 zile (mai relevant și mai frumos în grafic)
    const weeklyResult = await pool.query(`
      SELECT 
        TO_CHAR(interview_date, 'YYYY-MM-DD') as week,
        COUNT(*) as count,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed
      FROM client_bookings
      WHERE interview_date >= CURRENT_DATE - INTERVAL '14 days'
        AND interview_date <= CURRENT_DATE + INTERVAL '7 days'
      GROUP BY interview_date
      ORDER BY interview_date ASC
    `);
    
    // Dacă nu sunt suficiente date, generăm date pentru toate zilele
    const dailyDataResult = await pool.query(`
      WITH date_series AS (
        SELECT generate_series(
          CURRENT_DATE - INTERVAL '13 days',
          CURRENT_DATE,
          '1 day'::interval
        )::date AS date
      )
      SELECT 
        TO_CHAR(ds.date, 'YYYY-MM-DD') as week,
        COALESCE(COUNT(cb.id), 0) as count,
        COALESCE(COUNT(CASE WHEN cb.status = 'completed' THEN 1 END), 0) as completed
      FROM date_series ds
      LEFT JOIN client_bookings cb ON cb.interview_date = ds.date
      GROUP BY ds.date
      ORDER BY ds.date ASC
    `);
    
    // Tipuri de interviu
    const interviewTypesResult = await pool.query(`
      SELECT 
        COALESCE(interview_type, 'online') as interview_type, 
        COUNT(*) as count
      FROM client_bookings
      GROUP BY interview_type
    `);
    
    // Ore de vârf
    const peakHoursResult = await pool.query(`
      SELECT interview_time, COUNT(*) as count
      FROM client_bookings
      WHERE interview_time IS NOT NULL
      GROUP BY interview_time
      ORDER BY count DESC
      LIMIT 6
    `);
    
    // Rata de conversie
    const conversionResult = await pool.query(`
      SELECT 
        COUNT(CASE WHEN status = 'completed' THEN 1 END)::float / 
        NULLIF(COUNT(*), 0) * 100 as conversion_rate
      FROM client_bookings
    `);
    
    // Documente
    const documentsResult = await pool.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(DISTINCT user_id) as users_with_docs
      FROM documents
    `);
    
    // Statistici utilizatori activi
    const activeUsersResult = await pool.query(`
      SELECT COUNT(*) as active
      FROM users
      WHERE last_login >= CURRENT_DATE - INTERVAL '30 days'
        OR created_at >= CURRENT_DATE - INTERVAL '30 days'
    `);
    
    res.json({
      success: true,
      data: {
        totalUsers: parseInt(totalUsersResult.rows[0].total),
        activeUsers: parseInt(activeUsersResult.rows[0].active),
        totalBookings: parseInt(totalBookingsResult.rows[0].total),
        todayInterviews: parseInt(todayResult.rows[0].total),
        tomorrowInterviews: parseInt(tomorrowResult.rows[0].total),
        statusDistribution: statusResult.rows,
        weeklyEvolution: dailyDataResult.rows.length > 0 ? dailyDataResult.rows : weeklyResult.rows,
        interviewTypes: interviewTypesResult.rows,
        peakHours: peakHoursResult.rows,
        conversionRate: parseFloat(conversionResult.rows[0]?.conversion_rate || 0).toFixed(2),
        documentsUploaded: parseInt(documentsResult.rows[0]?.total || 0),
        usersWithDocuments: parseInt(documentsResult.rows[0]?.users_with_docs || 0)
      }
    });
  } catch (error) {
    console.error('Error fetching dashboard statistics:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Eroare la obținerea statisticilor',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Endpoint pentru statistici pe perioada selectată
router.get('/period/:period', async (req: Request, res: Response) => {
  try {
    const { period } = req.params; // today, week, month, year
    
    let interval;
    switch(period) {
      case 'today':
        interval = '1 day';
        break;
      case 'week':
        interval = '7 days';
        break;
      case 'month':
        interval = '30 days';
        break;
      case 'year':
        interval = '365 days';
        break;
      default:
        interval = '7 days';
    }

    const statsResult = await pool.query(`
      SELECT 
        COUNT(*) as total_bookings,
        COUNT(CASE WHEN status = 'confirmed' THEN 1 END) as confirmed_bookings,
        COUNT(DISTINCT client_email) as unique_clients
      FROM client_bookings
      WHERE created_at >= CURRENT_DATE - INTERVAL '${interval}'
    `);

    res.json({
      success: true,
      period,
      stats: statsResult.rows[0]
    });
  } catch (error) {
    console.error('Error fetching period statistics:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Eroare la obținerea statisticilor pentru perioada selectată' 
    });
  }
});

// Endpoint pentru statistici utilizatori
router.get('/user', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Nu ești autentificat' });
    }

    const token = authHeader.split(' ')[1];
    const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-2024';
    
    try {
      const jwt = require('jsonwebtoken');
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      const userId = decoded.userId || decoded.id;

      // Get user email
      const userResult = await pool.query('SELECT email FROM users WHERE id = $1', [userId]);
      if (userResult.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }
      
      const userEmail = userResult.rows[0].email;

      // Statistici programări user
      const userBookingsResult = await pool.query(`
        SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
          COUNT(CASE WHEN status = 'confirmed' THEN 1 END) as confirmed,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
          COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled
        FROM client_bookings
        WHERE client_email = $1
      `, [userEmail]);

      // Următoarea programare
      const nextBookingResult = await pool.query(`
        SELECT * 
        FROM client_bookings
        WHERE client_email = $1 
          AND interview_date >= CURRENT_DATE
          AND status IN ('pending', 'confirmed')
        ORDER BY interview_date, interview_time
        LIMIT 1
      `, [userEmail]);

      // Documente user
      const userDocumentsResult = await pool.query(`
        SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
          COUNT(CASE WHEN status = 'verified' THEN 1 END) as verified
        FROM documents
        WHERE user_id = $1
      `, [userId]);

      res.json({
        success: true,
        stats: {
          bookings: {
            total: parseInt(userBookingsResult.rows[0].total),
            pending: parseInt(userBookingsResult.rows[0].pending),
            confirmed: parseInt(userBookingsResult.rows[0].confirmed),
            completed: parseInt(userBookingsResult.rows[0].completed),
            cancelled: parseInt(userBookingsResult.rows[0].cancelled),
            next: nextBookingResult.rows[0] || null
          },
          documents: {
            total: parseInt(userDocumentsResult.rows[0].total),
            pending: parseInt(userDocumentsResult.rows[0].pending),
            verified: parseInt(userDocumentsResult.rows[0].verified)
          }
        }
      });
    } catch (error) {
      return res.status(401).json({ success: false, message: 'Token invalid' });
    }
  } catch (error) {
    console.error('Error fetching user statistics:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Eroare la obținerea statisticilor utilizatorului' 
    });
  }
});

export default router;