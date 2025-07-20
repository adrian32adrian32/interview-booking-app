import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { authMiddleware } from '../middleware/authMiddleware';
import { uploadDocument, getUserDocuments, deleteDocument } from '../controllers/uploadController';

const router = Router();

// Configurare multer direct în routes
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../../uploads/documents');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'doc-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const uploadMiddleware = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }
});

// Routes
router.post('/document', authMiddleware, uploadMiddleware.single('file'), uploadDocument);
router.get('/documents', authMiddleware, getUserDocuments);
router.delete('/document/:id', authMiddleware, deleteDocument);

export default router;
