import express, { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { pool } from '../server';
import { authMiddleware } from '../middleware/authMiddleware';

const router = express.Router();

// Get all users - CU MIDDLEWARE
router.get('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const result = await pool.query(`
      SELECT 
        id, 
        username, 
        email, 
        first_name, 
        last_name,
        COALESCE(CONCAT(first_name, ' ', last_name), username) as name,
        phone, 
        role, 
        status,
        created_at,
        last_login
      FROM users
      ORDER BY created_at DESC
    `);
    
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch users'
    });
  }
});

// Get single user
router.get('/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(`
      SELECT 
        id, 
        username, 
        email, 
        first_name, 
        last_name,
        COALESCE(CONCAT(first_name, ' ', last_name), username) as name,
        phone, 
        role, 
        status,
        created_at,
        last_login
      FROM users
      WHERE id = $1
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user'
    });
  }
});

// Update user status
router.patch('/:id/status', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    if (!['active', 'inactive'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status'
      });
    }
    
    const result = await pool.query(
      'UPDATE users SET status = $1 WHERE id = $2 RETURNING id, status',
      [status, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    res.json({
      success: true,
      message: `User ${status === 'active' ? 'activated' : 'deactivated'} successfully`
    });
  } catch (error) {
    console.error('Error updating user status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update user status'
    });
  }
});

// Update user
router.put('/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { username, email, first_name, last_name, phone, role, password } = req.body;
    
    let query = `
      UPDATE users 
      SET username = $1, email = $2, first_name = $3, last_name = $4, phone = $5, role = $6
    `;
    let values = [username, email, first_name, last_name, phone, role];
    let paramCount = 6;
    
    if (password && password.trim() !== '') {
      const hashedPassword = await bcrypt.hash(password, 10);
      query += `, password_hash = $${++paramCount}`;
      values.push(hashedPassword);
    }
    
    query += ` WHERE id = $${++paramCount} RETURNING *`;
    values.push(id);
    
    const result = await pool.query(query, values);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    res.json({
      success: true,
      message: 'User updated successfully',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update user'
    });
  }
});

// Delete user
router.delete('/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const userCheck = await pool.query('SELECT role FROM users WHERE id = $1', [id]);
    if (userCheck.rows.length > 0 && userCheck.rows[0].role === 'admin') {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete admin users'
      });
    }
    
    const result = await pool.query(
      'DELETE FROM users WHERE id = $1 RETURNING id',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete user'
    });
  }
});

// Get user documents
router.get('/:id/documents', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const userResult = await pool.query('SELECT email FROM users WHERE id = $1', [id]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    const userEmail = userResult.rows[0].email;
    
    const documentsResult = await pool.query(`
      SELECT DISTINCT d.* 
      FROM documents d
      LEFT JOIN client_bookings cb ON d.booking_id = cb.id
      WHERE d.user_id = $1 
         OR cb.client_email = $2
      ORDER BY d.uploaded_at DESC
    `, [id, userEmail]);
    
    res.json({
      success: true,
      documents: documentsResult.rows
    });
  } catch (error) {
    console.error('Error fetching user documents:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch documents'
    });
  }
});

export default router;
