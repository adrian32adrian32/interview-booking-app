import { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { pool } from '../server';

// Upload document handler
export const uploadDocument = async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        message: 'Nu a fost încărcat niciun fișier' 
      });
    }

    const userId = (req as any).userId;
    const { type = 'other' } = req.body;

    // Salvează în baza de date
    const result = await pool.query(
      `INSERT INTO documents (user_id, type, filename, original_name, path, size, mime_type, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [userId, type, req.file.filename, req.file.originalname, req.file.path, req.file.size, req.file.mimetype, 'pending']
    );

    res.json({
      success: true,
      message: 'Document încărcat cu succes',
      document: result.rows[0]
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Eroare la încărcare' 
    });
  }
};

// Get user documents
export const getUserDocuments = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    
    const result = await pool.query(
      'SELECT * FROM documents WHERE user_id = $1 ORDER BY uploaded_at DESC',
      [userId]
    );
    
    res.json({ 
      success: true, 
      documents: result.rows 
    });
  } catch (error) {
    console.error('Get documents error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Eroare la obținerea documentelor' 
    });
  }
};

// Delete document
export const deleteDocument = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).userId;
    
    // Verifică dacă documentul aparține utilizatorului
    const doc = await pool.query(
      'SELECT * FROM documents WHERE id = $1 AND user_id = $2',
      [id, userId]
    );
    
    if (doc.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Document negăsit' 
      });
    }
    
    // Șterge fișierul fizic
    if (fs.existsSync(doc.rows[0].path)) {
      fs.unlinkSync(doc.rows[0].path);
    }
    
    // Șterge din DB
    await pool.query('DELETE FROM documents WHERE id = $1', [id]);
    
    res.json({ 
      success: true, 
      message: 'Document șters cu succes' 
    });
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Eroare la ștergere' 
    });
  }
};
