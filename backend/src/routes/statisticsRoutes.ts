import { Router, Request, Response } from 'express';
import { pool } from '../server';

const router = Router();

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

export default router;
