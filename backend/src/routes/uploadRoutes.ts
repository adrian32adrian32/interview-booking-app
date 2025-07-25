// backend/src/routes/uploadRoutes.ts

import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { pool, JWT_SECRET } from '../server';
import jwt from 'jsonwebtoken';

// Definim interfața pentru AuthRequest
interface AuthRequest extends Request {
  user?: {
    id: number;
    role: string;
    email?: string;
  };
}

// Middleware de autentificare real
const authenticate = async (req: Request, res: Response, next: Function) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Nu ești autentificat' });
    }
    
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    const userId = decoded.userId || decoded.id;
    
    // Obține detaliile utilizatorului
    const userResult = await pool.query('SELECT id, role, email FROM users WHERE id = $1', [userId]);
    
    if (userResult.rows.length === 0) {
      return res.status(401).json({ success: false, message: 'Utilizator negăsit' });
    }
    
    (req as AuthRequest).user = {
      id: userId,
      role: userResult.rows[0].role,
      email: userResult.rows[0].email
    };
    
    next();
  } catch (error) {
    console.error('Auth error:', error);
    return res.status(401).json({ success: false, message: 'Token invalid' });
  }
};

const router = Router();

// Configurare multer pentru upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../../uploads/documents');

    // Creează folderul dacă nu există
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }

    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    // Generează nume unic pentru fișier
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `file-${uniqueSuffix}${ext}`);
  }
});

// Filtrare tipuri de fișiere
const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // Tipuri de fișiere permise
  const allowedTypes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Tip de fișier nepermis. Sunt permise doar imagini, PDF și documente Word.'));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB maxim
  }
});

// GET /api/upload/my-documents - Get current user's documents
router.get('/my-documents', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    
    console.log('Fetching documents for user ID:', userId);
    
    const result = await pool.query(`
      SELECT 
        d.*,
        cb.id as booking_ref,
        cb.interview_date,
        cb.client_name,
        CASE 
          WHEN d.booking_id IS NOT NULL THEN 'Programare #' || d.booking_id
          ELSE 'Documente profil'
        END as source
      FROM documents d
      LEFT JOIN client_bookings cb ON d.booking_id = cb.id
      WHERE d.user_id = $1
      ORDER BY d.uploaded_at DESC
    `, [userId]);
    
    console.log('Found documents:', result.rows.length);
    
    res.json({
      success: true,
      documents: result.rows,
      total: result.rows.length
    });
  } catch (error) {
    console.error('Error fetching user documents:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch documents'
    });
  }
});

// GET /api/upload/documents - Obține toate documentele utilizatorului
router.get('/documents', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;

    // Obține toate documentele utilizatorului cu informații despre programări
    const result = await pool.query(`
      SELECT 
        d.*,
        d.type as doc_type,
        cb.id as booking_ref,
        cb.interview_date,
        cb.status as booking_status,
        CASE 
          WHEN d.booking_id IS NOT NULL THEN 
            'Programare #' || d.booking_id || ' - ' || 
            TO_CHAR(cb.interview_date, 'DD.MM.YYYY') || ' ' || 
            cb.interview_time
          ELSE 'Documente profil'
        END as upload_source,
        CASE 
          WHEN d.booking_id IS NOT NULL THEN 'booking'
          ELSE 'profile'
        END as source_type
      FROM documents d
      LEFT JOIN client_bookings cb ON d.booking_id = cb.id
      WHERE d.user_id = $1
      ORDER BY d.uploaded_at DESC
    `, [userId]);

    // Grupează documentele pe categorii
    const documents = result.rows;
    const groupedDocs = {
      profile: documents.filter((d: any) => !d.booking_id),
      bookings: documents.filter((d: any) => d.booking_id)
    };

    res.json({
      success: true,
      documents,
      grouped: groupedDocs,
      total: documents.length,
      profile_count: groupedDocs.profile.length,
      booking_count: groupedDocs.bookings.length
    });
  } catch (error) {
    console.error('Error fetching user documents:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch documents'
    });
  }
});

// POST /api/upload/avatar - Upload avatar utilizator
router.post('/avatar', authenticate, upload.single('avatar'), async (req: AuthRequest, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Nu a fost încărcat niciun fișier'
      });
    }

    const userId = req.user?.id;
    const fileUrl = `/uploads/documents/${req.file.filename}`;

    res.json({
      success: true,
      message: 'Avatar încărcat cu succes',
      data: {
        url: fileUrl,
        filename: req.file.filename,
        size: req.file.size
      }
    });

  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Eroare la încărcarea fișierului'
    });
  }
});

// POST /api/upload/document - Upload documente pentru profil
router.post('/document', authenticate, upload.single('document'), async (req: AuthRequest, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Nu a fost încărcat niciun fișier'
      });
    }

    const userId = req.user?.id;
    const docType = req.body.docType || 'other';
    const fileUrl = `/uploads/documents/${req.file.filename}`;

    // Salvează documentul în baza de date
    const result = await pool.query(`
      INSERT INTO documents (
        user_id, 
        type, 
        filename, 
        original_name, 
        mime_type, 
        size, 
        path, 
        file_url, 
        file_name, 
        file_size,
        uploaded_by, 
        status, 
        uploaded_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, CURRENT_TIMESTAMP)
      RETURNING *
    `, [
      userId,
      docType,
      req.file.filename,
      req.file.originalname,
      req.file.mimetype,
      req.file.size,
      req.file.path,
      fileUrl,
      req.file.originalname,
      req.file.size,
      'user',
      'pending'
    ]);

    res.json({
      success: true,
      message: 'Document încărcat cu succes',
      data: {
        ...result.rows[0],
        url: fileUrl,
        filename: req.file.filename,
        originalName: req.file.originalname,
        size: req.file.size,
        mimetype: req.file.mimetype
      }
    });

  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Eroare la încărcarea documentului'
    });
  }
});

// POST /api/upload/multiple - Upload multiple fișiere
router.post('/multiple', authenticate, upload.array('files', 5), async (req: AuthRequest, res: Response) => {
  try {
    if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Nu au fost încărcate fișiere'
      });
    }

    const userId = req.user?.id;
    const uploadedFiles = req.files.map(file => ({
      url: `/uploads/documents/${file.filename}`,
      filename: file.filename,
      originalName: file.originalname,
      size: file.size,
      mimetype: file.mimetype
    }));

    res.json({
      success: true,
      message: `${uploadedFiles.length} fișiere încărcate cu succes`,
      data: uploadedFiles
    });

  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Eroare la încărcarea fișierelor'
    });
  }
});

// DELETE /api/upload/document/:id - Șterge un document după ID
router.delete('/document/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    const userRole = req.user?.role;

    // Obține documentul din DB
    const docResult = await pool.query(
      'SELECT * FROM documents WHERE id = $1',
      [id]
    );

    if (docResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Documentul nu a fost găsit'
      });
    }

    const document = docResult.rows[0];

    // Verifică permisiunile
    if (userRole !== 'admin' && document.user_id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Nu ai permisiunea să ștergi acest document'
      });
    }

    // Șterge fișierul fizic
    const filePath = document.path || path.join(__dirname, '../../uploads/documents', document.filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // Șterge din baza de date
    await pool.query('DELETE FROM documents WHERE id = $1', [id]);

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

// GET /api/upload/download/:id - Descarcă un document
router.get('/download/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    const userRole = req.user?.role;

    // Obține documentul din DB
    const docResult = await pool.query(
      'SELECT * FROM documents WHERE id = $1',
      [id]
    );

    if (docResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Documentul nu a fost găsit'
      });
    }

    const document = docResult.rows[0];

    // Verifică permisiunile - admin poate descărca orice document
    if (userRole !== 'admin' && document.user_id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Nu ai permisiunea să descarci acest document'
      });
    }

    const filePath = document.path || path.join(__dirname, '../../uploads/documents', document.filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: 'Fișierul nu a fost găsit pe server'
      });
    }

    // Forțează descărcarea
    res.download(filePath, document.original_name || document.filename);

  } catch (error) {
    console.error('Download error:', error);
    res.status(500).json({
      success: false,
      message: 'Eroare la descărcarea documentului'
    });
  }
});

// DELETE /api/upload/:filename - Șterge un fișier (legacy)
router.delete('/:filename', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { filename } = req.params;
    const userId = req.user?.id;
    const filePath = path.join(__dirname, '../../uploads/documents', filename);

    // Verifică dacă fișierul există
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: 'Fișierul nu a fost găsit'
      });
    }

    // Șterge fișierul
    fs.unlinkSync(filePath);

    res.json({
      success: true,
      message: 'Fișier șters cu succes'
    });

  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({
      success: false,
      message: 'Eroare la ștergerea fișierului'
    });
  }
});

// Middleware pentru gestionarea erorilor multer
router.use((error: any, req: Request, res: Response, next: Function) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'Fișierul este prea mare. Limita este de 10MB.'
      });
    }
    return res.status(400).json({
      success: false,
      message: error.message
    });
  }

  res.status(500).json({
    success: false,
    message: error.message || 'Eroare la procesarea fișierului'
  });
});

export default router;