import { Router, Request, Response } from 'express';
import { pool } from '../server';
import bcrypt from 'bcryptjs';

const router = Router();

// Endpoint-ul /api/users GET există deja în server.ts
// Dar să adăugăm și alte operații CRUD aici

// Create new user
router.post('/', async (req: Request, res: Response) => {
  try {
    const { email, password, first_name, last_name, username, phone, role = 'user' } = req.body;
    
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const result = await pool.query(
      `INSERT INTO users (email, username, password_hash, first_name, last_name, phone, role)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, email, username, first_name, last_name, role`,
      [email, username, hashedPassword, first_name, last_name, phone, role]
    );
    
    res.status(201).json({
      success: true,
      data: result.rows[0]
    });
  } catch (error: any) {
    console.error('Error creating user:', error);
    if (error.code === '23505') {
      res.status(400).json({ success: false, error: 'Email or username already exists' });
    } else {
      res.status(500).json({ success: false, error: 'Failed to create user' });
    }
  }
});

// Update user
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { first_name, last_name, role, phone } = req.body;
    
    const result = await pool.query(
      `UPDATE users 
       SET first_name = COALESCE($1, first_name),
           last_name = COALESCE($2, last_name),
           role = COALESCE($3, role),
           phone = COALESCE($4, phone)
       WHERE id = $5
       RETURNING id, email, username, first_name, last_name, role, phone`,
      [first_name, last_name, role, phone, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ success: false, error: 'Failed to update user' });
  }
});

// Delete user
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // Check if user has bookings
    const bookingsCheck = await pool.query(
      'SELECT COUNT(*) FROM client_bookings WHERE client_email IN (SELECT email FROM users WHERE id = $1)',
      [id]
    );
    
    if (parseInt(bookingsCheck.rows[0].count) > 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'Cannot delete user with existing bookings' 
      });
    }
    
    const result = await pool.query(
      'DELETE FROM users WHERE id = $1 RETURNING id',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    
    res.json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ success: false, error: 'Failed to delete user' });
  }
});

export default router;
