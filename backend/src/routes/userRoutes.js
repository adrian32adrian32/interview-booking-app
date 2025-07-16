const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { protect } = require('../middleware/authMiddleware');
const { pool } = require('../config/database');

// Configurare multer pentru upload
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads', req.user.id.toString());
    
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      cb(error, null);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const type = req.body.type || 'document';
    cb(null, `${type}-${uniqueSuffix}${ext}`);
  }
});

// Validare fișiere
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|pdf/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Doar fișiere JPG, PNG sau PDF sunt permise!'));
  }
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB max
  },
  fileFilter: fileFilter
});

// Upload document
router.post('/upload', protect, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Nu a fost încărcat niciun fișier!'
      });
    }

    const { type } = req.body;
    const validTypes = ['id_front', 'id_back', 'selfie', 'other'];
    
    if (!type || !validTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        message: 'Tip de document invalid!'
      });
    }

    // Salvează în baza de date
    const document = await pool.query(
      `INSERT INTO user_documents (user_id, document_type, file_name, file_path, file_size, mime_type)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        req.user.id,
        type,
        req.file.originalname,
        req.file.filename,
        req.file.size,
        req.file.mimetype
      ]
    );

    res.json({
      success: true,
      message: 'Document încărcat cu succes!',
      data: {
        id: document.rows[0].id,
        type: document.rows[0].document_type,
        fileName: document.rows[0].file_name,
        uploadedAt: document.rows[0].uploaded_at
      }
    });

  } catch (error) {
    console.error('Eroare la upload:', error);
    res.status(500).json({
      success: false,
      message: 'Eroare la încărcarea documentului!'
    });
  }
});

// Obține documentele utilizatorului
router.get('/documents', protect, async (req, res) => {
  try {
    const documents = await pool.query(
      `SELECT id, document_type, file_name, file_size, uploaded_at, verified_at, verified_by
       FROM user_documents
       WHERE user_id = $1
       ORDER BY uploaded_at DESC`,
      [req.user.id]
    );

    res.json({
      success: true,
      data: documents.rows
    });

  } catch (error) {
    console.error('Eroare la obținere documente:', error);
    res.status(500).json({
      success: false,
      message: 'Eroare la obținerea documentelor!'
    });
  }
});

// Descarcă/vizualizează document
router.get('/documents/:id/download', protect, async (req, res) => {
  try {
    const { id } = req.params;
    
    const document = await pool.query(
      `SELECT * FROM user_documents WHERE id = $1 AND user_id = $2`,
      [id, req.user.id]
    );

    if (document.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Document negăsit!'
      });
    }

    const filePath = path.join(__dirname, '../../uploads', req.user.id.toString(), document.rows[0].file_path);
    
    // Verifică dacă fișierul există
    try {
      await fs.access(filePath);
    } catch {
      return res.status(404).json({
        success: false,
        message: 'Fișierul nu mai există!'
      });
    }

    res.sendFile(filePath);

  } catch (error) {
    console.error('Eroare la descărcare document:', error);
    res.status(500).json({
      success: false,
      message: 'Eroare la descărcarea documentului!'
    });
  }
});

// Șterge document
router.delete('/documents/:id', protect, async (req, res) => {
  try {
    const { id } = req.params;
    
    const document = await pool.query(
      `SELECT * FROM user_documents WHERE id = $1 AND user_id = $2`,
      [id, req.user.id]
    );

    if (document.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Document negăsit!'
      });
    }

    // Șterge fișierul
    const filePath = path.join(__dirname, '../../uploads', req.user.id.toString(), document.rows[0].file_path);
    
    try {
      await fs.unlink(filePath);
    } catch (error) {
      console.error('Eroare la ștergerea fișierului:', error);
    }

    // Șterge din baza de date
    await pool.query(
      `DELETE FROM user_documents WHERE id = $1`,
      [id]
    );

    res.json({
      success: true,
      message: 'Document șters cu succes!'
    });

  } catch (error) {
    console.error('Eroare la ștergere document:', error);
    res.status(500).json({
      success: false,
      message: 'Eroare la ștergerea documentului!'
    });
  }
});

module.exports = router;