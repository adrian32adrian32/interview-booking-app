import { Router, Request, Response } from 'express';
import { pool, JWT_SECRET } from '../server';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const router = Router();

// Interface pentru request cu user
interface AuthRequest extends Request {
  user?: {
    id: number;
    role: string;
  };
}

// Middleware pentru verificare admin
const adminMiddleware = async (req: Request, res: Response, next: Function) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Nu ești autentificat' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    const userId = decoded.userId || decoded.id;

    const adminCheck = await pool.query('SELECT role FROM users WHERE id = $1', [userId]);
    if (adminCheck.rows.length === 0 || adminCheck.rows[0].role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Nu ai permisiuni de admin' });
    }

    (req as any).adminId = userId;
    (req as any).user = { id: userId, role: 'admin' };
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Token invalid' });
  }
};

// Get all users (admin)
router.get('/', async (req: Request, res: Response) => {
  try {
    let query = `
      SELECT 
        u.id, 
        u.username,
        u.first_name,
        u.last_name,
        COALESCE(CONCAT(u.first_name, ' ', u.last_name), u.username) as name,
        u.email, 
        u.role,
        COALESCE(u.status, 'active') as status,
        u.phone, 
        u.created_at,
        u.last_login,
        (SELECT COUNT(*) FROM client_bookings WHERE client_email = u.email) as bookings_count,
        (SELECT COUNT(*) FROM documents WHERE user_id = u.id) as documents_count
      FROM users u
    `;
    const queryParams: any[] = [];

    if (req.query.role) {
      query += ' WHERE u.role = $1';
      queryParams.push(req.query.role);
    }

    query += ' ORDER BY u.created_at DESC';

    const result = await pool.query(query, queryParams);

    res.json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({
      success: false,
      message: 'Eroare la obținerea utilizatorilor',
      data: [],
    });
  }
});

// Get single user
router.get('/:id', adminMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT 
        u.id, 
        u.username,
        u.first_name,
        u.last_name,
        COALESCE(CONCAT(u.first_name, ' ', u.last_name), u.username) as name,
        u.email, 
        u.role,
        COALESCE(u.status, 'active') as status,
        u.phone, 
        u.created_at,
        u.last_login,
        (SELECT COUNT(*) FROM client_bookings WHERE client_email = u.email) as bookings_count,
        (SELECT COUNT(*) FROM documents WHERE user_id = u.id) as documents_count
      FROM users u
      WHERE u.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Utilizator negăsit' });
    }

    res.json({
      success: true,
      user: result.rows[0],
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ success: false, message: 'Eroare la obținerea utilizatorului' });
  }
});

// Update user (admin)
router.put('/:id', adminMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { first_name, last_name, phone, role, status } = req.body;

    // Verifică dacă utilizatorul există
    const checkUser = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
    if (checkUser.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Utilizator negăsit' });
    }

    // Nu permite modificarea propriului rol sau status
    if (id === (req as any).adminId && (role !== checkUser.rows[0].role || status !== checkUser.rows[0].status)) {
      return res.status(400).json({
        success: false,
        message: 'Nu poți modifica propriul rol sau status',
      });
    }

    const result = await pool.query(
      `UPDATE users 
       SET first_name = $1, 
           last_name = $2, 
           phone = $3, 
           role = $4, 
           status = $5, 
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $6
       RETURNING id, username, first_name, last_name, email, phone, role, status`,
      [first_name, last_name, phone, role, status || 'active', id]
    );

    res.json({
      success: true,
      user: result.rows[0],
      message: 'Utilizator actualizat cu succes',
    });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ success: false, message: 'Eroare la actualizarea utilizatorului' });
  }
});

// Toggle user status (enable/disable)
router.patch('/:id/toggle-status', adminMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Nu permite dezactivarea propriului cont
    if (id === (req as any).adminId) {
      return res.status(400).json({
        success: false,
        message: 'Nu poți dezactiva propriul cont',
      });
    }

    // Obține statusul curent
    const currentStatus = await pool.query('SELECT status FROM users WHERE id = $1', [id]);

    if (currentStatus.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Utilizator negăsit' });
    }

    const newStatus = currentStatus.rows[0].status === 'active' ? 'inactive' : 'active';

    const result = await pool.query(
      `UPDATE users 
       SET status = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING id, status`,
      [newStatus, id]
    );

    res.json({
      success: true,
      user: result.rows[0],
      message: `Utilizator ${newStatus === 'active' ? 'activat' : 'dezactivat'} cu succes`,
    });
  } catch (error) {
    console.error('Error toggling user status:', error);
    res.status(500).json({ success: false, message: 'Eroare la schimbarea statusului' });
  }
});

// Delete user (admin)
router.delete('/:id', adminMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Nu permite ștergerea propriului cont
    if (id === (req as any).adminId) {
      return res.status(400).json({
        success: false,
        message: 'Nu poți șterge propriul cont',
      });
    }

    // Verifică dacă are documente sau bookings
    const checkDocs = await pool.query('SELECT COUNT(*) FROM documents WHERE user_id = $1', [id]);
    const checkBookings = await pool.query(
      'SELECT COUNT(*) FROM client_bookings WHERE client_email = (SELECT email FROM users WHERE id = $1)',
      [id]
    );

    if (parseInt(checkDocs.rows[0].count) > 0 || parseInt(checkBookings.rows[0].count) > 0) {
      return res.status(400).json({
        success: false,
        message: 'Nu se poate șterge utilizatorul deoarece are documente sau programări asociate',
      });
    }

    await pool.query('DELETE FROM users WHERE id = $1', [id]);

    res.json({
      success: true,
      message: 'Utilizator șters cu succes',
    });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ success: false, message: 'Eroare la ștergerea utilizatorului' });
  }
});

// Get user documents with booking info - ACTUALIZAT
router.get('/:id/documents', adminMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = parseInt(req.params.id);
    
    // Obține toate documentele utilizatorului cu informații despre sursa lor
    const documentsResult = await pool.query(`
      SELECT 
        d.*,
        cb.id as booking_ref,
        cb.interview_date,
        cb.status as booking_status,
        CASE 
          WHEN d.booking_id IS NOT NULL THEN 
            'Programare #' || d.booking_id || ' - ' || TO_CHAR(cb.interview_date, 'DD.MM.YYYY')
          ELSE 'Documente profil'
        END as upload_source,
        CASE 
          WHEN d.booking_id IS NOT NULL THEN 'booking'
          ELSE 'profile'
        END as source_type,
        CASE 
          WHEN d.uploaded_by = 'admin' THEN 'Admin'
          ELSE 'User'
        END as uploaded_by_role
      FROM documents d
      LEFT JOIN client_bookings cb ON d.booking_id = cb.id
      WHERE d.user_id = $1
      ORDER BY d.uploaded_at DESC
    `, [userId]);
    
    // Obține statistici despre documente
    const statsResult = await pool.query(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN booking_id IS NULL THEN 1 ELSE 0 END) as profile_docs,
        SUM(CASE WHEN booking_id IS NOT NULL THEN 1 ELSE 0 END) as booking_docs,
        SUM(CASE WHEN status = 'verified' OR verified_by_admin = true THEN 1 ELSE 0 END) as verified_docs
      FROM documents 
      WHERE user_id = $1
    `, [userId]);
    
    res.json({ 
      success: true, 
      documents: documentsResult.rows,
      stats: statsResult.rows[0],
      user_id: userId
    });
  } catch (error) {
    console.error('Error fetching user documents:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch documents' 
    });
  }
});

// Update user profile (for logged in user)
router.put('/profile', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Nu ești autentificat' });
    }

    const token = authHeader.split(' ')[1];
    let userId: number;

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      userId = decoded.userId || decoded.id;
    } catch (error) {
      return res.status(401).json({ success: false, message: 'Token invalid' });
    }

    const { first_name, last_name, phone } = req.body;

    const result = await pool.query(
      `UPDATE users 
       SET first_name = $1, last_name = $2, phone = $3, updated_at = CURRENT_TIMESTAMP
       WHERE id = $4
       RETURNING id, username, first_name, last_name, email, phone, role`,
      [first_name, last_name, phone, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({
      success: true,
      user: result.rows[0],
    });
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ success: false, message: 'Eroare la actualizarea profilului' });
  }
});

// Create new user (admin)
router.post('/', adminMiddleware, async (req: Request, res: Response) => {
  try {
    const { username, email, password, first_name, last_name, phone, role } = req.body;

    // Validări
    if (!username || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Username, email și parolă sunt obligatorii',
      });
    }

    // Verifică dacă există deja
    const existingUser = await pool.query('SELECT id FROM users WHERE username = $1 OR email = $2', [username, email]);

    if (existingUser.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Username sau email deja există',
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Creează user
    const result = await pool.query(
      `INSERT INTO users (username, email, password_hash, first_name, last_name, phone, role, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'active')
       RETURNING id, username, email, first_name, last_name, phone, role, status`,
      [username, email, hashedPassword, first_name, last_name, phone, role || 'user']
    );

    res.status(201).json({
      success: true,
      user: result.rows[0],
      message: 'Utilizator creat cu succes',
    });
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({
      success: false,
      message: 'Eroare la crearea utilizatorului',
    });
  }
});

export default router;