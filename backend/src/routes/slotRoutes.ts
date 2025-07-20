import express, { Request, Response } from 'express';
import { pool } from '../server';
import { authMiddleware } from '../middleware/authMiddleware';

const router = express.Router();

// Get all time slots - TEMPORAR FĂRĂ AUTH
router.get('/', async (req: Request, res: Response) => {
  try {
    const { date, active } = req.query;
    
    let query = `
      SELECT 
        id,
        date,
        start_time,
        end_time,
        max_capacity,
        available_spots,
        is_active,
        created_at
      FROM time_slots
      WHERE 1=1
    `;
    const params: any[] = [];
    
    if (date) {
      params.push(date);
      query += ` AND date = $${params.length}`;
    }
    
    if (active !== undefined) {
      params.push(active === 'true');
      query += ` AND is_active = $${params.length}`;
    }
    
    query += ` ORDER BY date, start_time`;
    
    const result = await pool.query(query, params);
    
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching time slots:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch time slots',
      error: error.message
    });
  }
});

// Create new time slot
router.post('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { date, start_time, end_time, max_capacity = 1 } = req.body;
    
    const result = await pool.query(
      `INSERT INTO time_slots (date, start_time, end_time, max_capacity, available_spots, is_active)
       VALUES ($1, $2, $3, $4, $4, true)
       RETURNING *`,
      [date, start_time, end_time, max_capacity]
    );
    
    res.status(201).json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error creating time slot:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create time slot'
    });
  }
});

// Update time slot
router.put('/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { date, start_time, end_time, is_active, max_capacity } = req.body;
    
    const result = await pool.query(
      `UPDATE time_slots 
       SET date = $1, start_time = $2, end_time = $3, is_active = $4, max_capacity = $5
       WHERE id = $6
       RETURNING *`,
      [date, start_time, end_time, is_active, max_capacity, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Slot not found'
      });
    }
    
    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating time slot:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update time slot'
    });
  }
});

// Delete time slot
router.delete('/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      'DELETE FROM time_slots WHERE id = $1 RETURNING id',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Slot not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Slot deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting time slot:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete time slot'
    });
  }
});

export default router;
