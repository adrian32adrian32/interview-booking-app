// backend/src/controllers/uploadController.js
const multer = require('multer');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs').promises;
const fsSync = require('fs');
const { v4: uuidv4 } = require('uuid');
const pool = require('../config/database');

// Configurare multer pentru upload
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads/documents/temp');
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

// Validare tipuri fișiere
const fileFilter = (req, file, cb) => {
  const allowedTypes = {
    'buletin': ['image/jpeg', 'image/png', 'image/jpg'],
    'selfie': ['image/jpeg', 'image/png', 'image/jpg'],
    'cv': ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'],
    'diploma': ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'],
    'adeverinta': ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg']
  };

  const documentType = req.body.type || req.query.type;
  
  if (!documentType || !allowedTypes[documentType]) {
    return cb(new Error('Tip document invalid'), false);
  }

  if (allowedTypes[documentType].includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Format invalid pentru ${documentType}. Formate acceptate: ${allowedTypes[documentType].join(', ')}`), false);
  }
};

// Configurare multer
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  }
}).single('document');

// Controller pentru upload document
const uploadDocument = async (req, res) => {
  upload(req, res, async (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ 
            success: false, 
            message: 'Fișierul este prea mare. Limita este 10MB.' 
          });
        }
      }
      return res.status(400).json({ 
        success: false, 
        message: err.message || 'Eroare la încărcare fișier' 
      });
    }

    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        message: 'Niciun fișier încărcat' 
      });
    }

    try {
      const { type } = req.body;
      const userId = req.user.id;
      const file = req.file;

      // Verifică dacă există deja un document de acest tip
      const existingDoc = await pool.query(
        'SELECT * FROM documents WHERE user_id = $1 AND type = $2 AND status != $3',
        [userId, type, 'deleted']
      );

      if (existingDoc.rows.length > 0) {
        // Șterge fișierul temporar
        await fs.unlink(file.path);
        return res.status(400).json({
          success: false,
          message: `Ai deja un document de tip ${type} încărcat. Șterge-l pe cel vechi pentru a încărca unul nou.`
        });
      }

      // Procesează imaginile (resize dacă e necesar)
      let finalPath = file.path;
      let processedFilename = file.filename;

      if (file.mimetype.startsWith('image/') && type !== 'cv') {
        const outputDir = path.join(__dirname, `../../uploads/documents/${type}`);
        await fs.mkdir(outputDir, { recursive: true });
        
        processedFilename = `${path.parse(file.filename).name}_processed.jpg`;
        finalPath = path.join(outputDir, processedFilename);

        await sharp(file.path)
          .resize(1200, null, { 
            fit: 'inside',
            withoutEnlargement: true 
          })
          .jpeg({ quality: 85 })
          .toFile(finalPath);

        // Șterge fișierul temporar original
        await fs.unlink(file.path);
      } else {
        // Mută fișierul PDF în folderul corespunzător
        const outputDir = path.join(__dirname, `../../uploads/documents/${type}`);
        await fs.mkdir(outputDir, { recursive: true });
        
        const newPath = path.join(outputDir, file.filename);
        await fs.rename(file.path, newPath);
        finalPath = newPath;
      }

      // Salvează în baza de date
      const result = await pool.query(
        `INSERT INTO documents 
        (user_id, type, filename, original_name, path, size, mime_type, status) 
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
        RETURNING *`,
        [
          userId,
          type,
          processedFilename,
          file.originalname,
          finalPath,
          file.size,
          file.mimetype,
          'pending'
        ]
      );

      res.status(201).json({
        success: true,
        message: 'Document încărcat cu succes',
        document: {
          id: result.rows[0].id,
          type: result.rows[0].type,
          originalName: result.rows[0].original_name,
          status: result.rows[0].status,
          uploadedAt: result.rows[0].uploaded_at
        }
      });

    } catch (error) {
      console.error('Eroare upload document:', error);
      // Încearcă să șteargă fișierul în caz de eroare
      if (req.file && req.file.path) {
        try {
          await fs.unlink(req.file.path);
        } catch (unlinkError) {
          console.error('Eroare ștergere fișier:', unlinkError);
        }
      }
      res.status(500).json({ 
        success: false, 
        message: 'Eroare la salvarea documentului' 
      });
    }
  });
};

// Obține lista documentelor utilizatorului
const getUserDocuments = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const result = await pool.query(
      `SELECT id, type, original_name, filename, size, mime_type, status, uploaded_at 
       FROM documents 
       WHERE user_id = $1 AND status != $2 
       ORDER BY uploaded_at DESC`,
      [userId, 'deleted']
    );

    res.json({
      success: true,
      documents: result.rows
    });
  } catch (error) {
    console.error('Eroare obținere documente:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Eroare la obținerea documentelor' 
    });
  }
};

// Șterge un document
const deleteDocument = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Verifică dacă documentul aparține utilizatorului
    const document = await pool.query(
      'SELECT * FROM documents WHERE id = $1 AND user_id = $2',
      [id, userId]
    );

    if (document.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Document negăsit'
      });
    }

    // Marchează ca șters în DB (soft delete)
    await pool.query(
      'UPDATE documents SET status = $1 WHERE id = $2',
      ['deleted', id]
    );

    // Șterge fișierul fizic
    try {
      await fs.unlink(document.rows[0].path);
    } catch (error) {
      console.error('Eroare ștergere fișier fizic:', error);
    }

    res.json({
      success: true,
      message: 'Document șters cu succes'
    });
  } catch (error) {
    console.error('Eroare ștergere document:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Eroare la ștergerea documentului' 
    });
  }
};

// Download document (pentru utilizator) - FUNCȚIE ACTUALIZATĂ
const downloadDocument = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Pentru admin, permite descărcarea oricărui document
    let query = 'SELECT * FROM documents WHERE id = $1';
    let params = [id];
    
    if (req.user.role !== 'admin') {
      query += ' AND user_id = $2';
      params.push(userId);
    }
    
    query += ' AND status != $' + (params.length + 1);
    params.push('deleted');

    const document = await pool.query(query, params);

    if (document.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Document negăsit sau nu ai permisiunea să-l accesezi'
      });
    }

    const doc = document.rows[0];
    
    // Verifică diferite căi posibile pentru fișier
    let filePath = doc.path;
    
    // Dacă nu există calea sau fișierul, încearcă să o construiască
    if (!filePath || !fsSync.existsSync(filePath)) {
      // Încearcă cu filename
      if (doc.filename) {
        filePath = path.join(__dirname, '../../uploads/documents', doc.type, doc.filename);
      }
      // Încearcă cu file_name
      else if (doc.file_name) {
        filePath = path.join(__dirname, '../../uploads/documents', doc.type, doc.file_name);
      }
      
      // Încearcă fără subfolder type
      if (!fsSync.existsSync(filePath)) {
        if (doc.filename) {
          filePath = path.join(__dirname, '../../uploads/documents', doc.filename);
        } else if (doc.file_name) {
          filePath = path.join(__dirname, '../../uploads/documents', doc.file_name);
        }
      }
    }

    // Verifică dacă fișierul există
    if (!fsSync.existsSync(filePath)) {
      console.error('File not found at any path. Document data:', {
        id: doc.id,
        path: doc.path,
        filename: doc.filename,
        file_name: doc.file_name,
        type: doc.type,
        tried_path: filePath
      });
      
      return res.status(404).json({
        success: false,
        message: 'Fișierul nu mai există pe server'
      });
    }

    console.log('Downloading file from:', filePath);

    // Setează headers pentru download
    res.setHeader('Content-Type', doc.mime_type || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${doc.original_name || 'document'}"`);
    
    // Trimite fișierul
    res.sendFile(path.resolve(filePath), (err) => {
      if (err) {
        console.error('Error sending file:', err);
        if (!res.headersSent) {
          res.status(500).json({
            success: false,
            message: 'Eroare la trimiterea fișierului'
          });
        }
      }
    });
    
  } catch (error) {
    console.error('Eroare download document:', error);
    if (!res.headersSent) {
      res.status(500).json({ 
        success: false, 
        message: 'Eroare la descărcarea documentului' 
      });
    }
  }
};

// Admin: obține toate documentele pentru verificare
const getAllDocuments = async (req, res) => {
  try {
    const { status, userId, type } = req.query;
    let query = `
      SELECT 
        d.*, 
        u.username, 
        u.email, 
        u.first_name, 
        u.last_name
      FROM documents d
      JOIN users u ON d.user_id = u.id
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 0;

    if (status) {
      paramCount++;
      query += ` AND d.status = $${paramCount}`;
      params.push(status);
    }

    if (userId) {
      paramCount++;
      query += ` AND d.user_id = $${paramCount}`;
      params.push(userId);
    }

    if (type) {
      paramCount++;
      query += ` AND d.type = $${paramCount}`;
      params.push(type);
    }

    query += ' ORDER BY d.uploaded_at DESC';

    const result = await pool.query(query, params);

    res.json({
      success: true,
      documents: result.rows
    });
  } catch (error) {
    console.error('Eroare obținere toate documentele:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Eroare la obținerea documentelor' 
    });
  }
};

// Admin: actualizează status document
const updateDocumentStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const adminId = req.user.id;

    const validStatuses = ['pending', 'approved', 'rejected'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Status invalid'
      });
    }

    const result = await pool.query(
      `UPDATE documents 
       SET status = $1, reviewed_at = NOW(), reviewed_by = $2 
       WHERE id = $3 
       RETURNING *`,
      [status, adminId, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Document negăsit'
      });
    }

    res.json({
      success: true,
      message: `Document ${status === 'approved' ? 'aprobat' : 'respins'} cu succes`,
      document: result.rows[0]
    });
  } catch (error) {
    console.error('Eroare actualizare status document:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Eroare la actualizarea statusului' 
    });
  }
};

module.exports = {
  uploadDocument,
  getUserDocuments,
  deleteDocument,
  downloadDocument,
  getAllDocuments,
  updateDocumentStatus
};