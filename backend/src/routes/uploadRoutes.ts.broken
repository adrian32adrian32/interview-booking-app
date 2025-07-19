// backend/src/routes/uploadRoutes.ts

import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();

// Configurare multer pentru upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const userId = req.user?.id || 'anonymous';
    const uploadPath = path.join(__dirname, '../../uploads', userId.toString());
    
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
    const name = path.basename(file.originalname, ext);
    cb(null, `${name}-${uniqueSuffix}${ext}`);
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

// Middleware de autentificare
router.use(authMiddleware);

// POST /api/upload/avatar - Upload avatar utilizator
router.post('/avatar', upload.single('avatar'), async (req: AuthRequest, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Nu a fost încărcat niciun fișier'
      });
    }
    
    const userId = req.user?.id;
    const fileUrl = `/uploads/${userId}/${req.file.filename}`;
    
    // Aici poți actualiza și baza de date cu URL-ul avatarului
    // await pool.query('UPDATE users SET avatar = $1 WHERE id = $2', [fileUrl, userId]);
    
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

// POST /api/upload/document - Upload documente
router.post('/document', upload.single('document'), async (req: AuthRequest, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Nu a fost încărcat niciun fișier'
      });
    }
    
    const userId = req.user?.id;
    const fileUrl = `/uploads/${userId}/${req.file.filename}`;
    
    res.json({
      success: true,
      message: 'Document încărcat cu succes',
      data: {
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
router.post('/multiple', upload.array('files', 5), async (req: AuthRequest, res: Response) => {
  try {
    if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Nu au fost încărcate fișiere'
      });
    }
    
    const userId = req.user?.id;
    const uploadedFiles = req.files.map(file => ({
      url: `/uploads/${userId}/${file.filename}`,
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

// DELETE /api/upload/:filename - Șterge un fișier
router.delete('/:filename', async (req: AuthRequest, res: Response) => {
  try {
    const { filename } = req.params;
    const userId = req.user?.id;
    const filePath = path.join(__dirname, '../../uploads', userId.toString(), filename);
    
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
router.use((error: any, req: AuthRequest, res: Response, next: any) => {
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