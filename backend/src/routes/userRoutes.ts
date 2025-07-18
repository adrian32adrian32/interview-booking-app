// backend/src/routes/userRoutes.ts

import { Router, Request, Response } from 'express';
import { pool } from '../server';
import { authenticateToken } from '../middleware/auth';
import { authorize } from '../middleware/authorize';
import bcrypt from 'bcryptjs';

const router = Router();

// Toate rutele necesită autentificare
router.use(authenticateToken);

// GET /api/users - Obține toți utilizatorii (doar admin)
router.get('/', authorize(['admin']), async (req: Request, res: Response) => {
  try {
    const { search, role, status, page = 1, limit = 10 } = req.query;
    
    let query = `
      SELECT id, name, email, role, phone, avatar, is_active, created_at, updated_at 
      FROM users 
      WHERE 1=1
    `;
    
    const params: any[] = [];
    let paramCount = 0;
    
    // Filtrare după căutare
    if (search) {
      query += ` AND (name ILIKE $${++paramCount} OR email ILIKE $${paramCount})`;
      params.push(`%${search}%`);
    }
    
    // Filtrare după rol
    if (role) {
      query += ` AND role = $${++paramCount}`;
      params.push(role);
    }
    
    // Filtrare după status
    if (status !== undefined) {
      query += ` AND is_active = $${++paramCount}`;
      params.push(status === 'active');
    }
    
    // Paginare
    const offset = (Number(page) - 1) * Number(limit);
    query += ` ORDER BY created_at DESC LIMIT $${++paramCount} OFFSET $${++paramCount}`;
    params.push(limit, offset);
    
    // Execută query
    const result = await pool.query(query, params);
    
    // Obține numărul total pentru paginare
    const countResult = await pool.query(
      'SELECT COUNT(*) FROM users WHERE 1=1' + 
      (search ? ' AND (name ILIKE $1 OR email ILIKE $1)' : '') +
      (role ? ` AND role = $${search ? 2 : 1}` : '') +
      (status !== undefined ? ` AND is_active = $${search ? (role ? 3 : 2) : (role ? 2 : 1)}` : ''),
      params.slice(0, -2)
    );
    
    const total = parseInt(countResult.rows[0].count);
    
    res.json({
      success: true,
      data: result.rows,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    });
    
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({
      success: false,
      message: 'Eroare la obținerea utilizatorilor'
    });
  }
});

// GET /api/users/:id - Obține un utilizator specific
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    const userRole = req.user?.role;
    
    // Verifică permisiuni - doar admin sau propriul profil
    if (userRole !== 'admin' && userId !== parseInt(id)) {
      return res.status(403).json({
        success: false,
        message: 'Nu ai permisiunea să vezi acest profil'
      });
    }
    
    const result = await pool.query(
      'SELECT id, name, email, role, phone, avatar, is_active, created_at, updated_at FROM users WHERE id = $1',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Utilizator negăsit'
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
      message: 'Eroare la obținerea utilizatorului'
    });
  }
});

// POST /api/users - Creează un utilizator nou (doar admin)
router.post('/', authorize(['admin']), async (req: Request, res: Response) => {
  try {
    const { name, email, password, role, phone } = req.body;
    
    // Validare
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Nume, email și parolă sunt obligatorii'
      });
    }
    
    // Verifică dacă email-ul există
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );
    
    if (existingUser.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'Email-ul este deja înregistrat'
      });
    }
    
    // Hash parolă
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Creează utilizator
    const result = await pool.query(
      `INSERT INTO users (name, email, password, role, phone) 
       VALUES ($1, $2, $3, $4, $5) 
       RETURNING id, name, email, role, phone, is_active, created_at`,
      [name, email, hashedPassword, role || 'user', phone || null]
    );
    
    res.status(201).json({
      success: true,
      message: 'Utilizator creat cu succes',
      data: result.rows[0]
    });
    
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({
      success: false,
      message: 'Eroare la crearea utilizatorului'
    });
  }
});

// PUT /api/users/:id - Actualizează un utilizator
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    const userRole = req.user?.role;
    const { name, email, role, phone, avatar, password } = req.body;
    
    // Verifică permisiuni
    if (userRole !== 'admin' && userId !== parseInt(id)) {
      return res.status(403).json({
        success: false,
        message: 'Nu ai permisiunea să modifici acest profil'
      });
    }
    
    // Doar admin poate schimba roluri
    if (role && userRole !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Nu ai permisiunea să schimbi rolul'
      });
    }
    
    // Construiește query dinamic
    const updateFields: string[] = [];
    const values: any[] = [];
    let paramCount = 0;
    
    if (name) {
      updateFields.push(`name = $${++paramCount}`);
      values.push(name);
    }
    
    if (email) {
      // Verifică dacă email-ul nou este unic
      const existingUser = await pool.query(
        'SELECT id FROM users WHERE email = $1 AND id != $2',
        [email, id]
      );
      
      if (existingUser.rows.length > 0) {
        return res.status(409).json({
          success: false,
          message: 'Email-ul este deja folosit'
        });
      }
      
      updateFields.push(`email = $${++paramCount}`);
      values.push(email);
    }
    
    if (role && userRole === 'admin') {
      updateFields.push(`role = $${++paramCount}`);
      values.push(role);
    }
    
    if (phone !== undefined) {
      updateFields.push(`phone = $${++paramCount}`);
      values.push(phone);
    }
    
    if (avatar !== undefined) {
      updateFields.push(`avatar = $${++paramCount}`);
      values.push(avatar);
    }
    
    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      updateFields.push(`password = $${++paramCount}`);
      values.push(hashedPassword);
    }
    
    if (updateFields.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Nu există date pentru actualizare'
      });
    }
    
    updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);
    
    const updateQuery = `
      UPDATE users 
      SET ${updateFields.join(', ')}
      WHERE id = $${++paramCount}
      RETURNING id, name, email, role, phone, avatar, is_active, updated_at
    `;
    
    const result = await pool.query(updateQuery, values);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Utilizator negăsit'
      });
    }
    
    res.json({
      success: true,
      message: 'Utilizator actualizat cu succes',
      data: result.rows[0]
    });
    
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({
      success: false,
      message: 'Eroare la actualizarea utilizatorului'
    });
  }
});

// DELETE /api/users/:id - Șterge un utilizator (doar admin)
router.delete('/:id', authorize(['admin']), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const adminId = req.user?.id;
    
    // Nu permite ștergerea propriului cont admin
    if (parseInt(id) === adminId) {
      return res.status(400).json({
        success: false,
        message: 'Nu poți șterge propriul cont de admin'
      });
    }
    
    const result = await pool.query(
      'DELETE FROM users WHERE id = $1 RETURNING id, name, email',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Utilizator negăsit'
      });
    }
    
    res.json({
      success: true,
      message: 'Utilizator șters cu succes',
      data: result.rows[0]
    });
    
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({
      success: false,
      message: 'Eroare la ștergerea utilizatorului'
    });
  }
});

// PATCH /api/users/:id/toggle-status - Activează/Dezactivează utilizator (doar admin)
router.patch('/:id/toggle-status', authorize(['admin']), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      `UPDATE users 
       SET is_active = NOT is_active, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $1 
       RETURNING id, name, email, is_active`,
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Utilizator negăsit'
      });
    }
    
    const user = result.rows[0];
    
    res.json({
      success: true,
      message: `Utilizator ${user.is_active ? 'activat' : 'dezactivat'} cu succes`,
      data: user
    });
    
  } catch (error) {
    console.error('Error toggling user status:', error);
    res.status(500).json({
      success: false,
      message: 'Eroare la schimbarea statusului'
    });
  }
});

export default router;