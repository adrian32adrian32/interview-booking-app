import { Router, Request, Response } from 'express';
import { pool } from '../server';
import * as XLSX from 'xlsx';
import { createObjectCsvWriter } from 'csv-writer';
import path from 'path';
import fs from 'fs';

const router = Router();

// Middleware pentru admin only
const adminOnly = (req: Request, res: Response, next: Function) => {
  if ((req as any).userRole !== 'admin') {
    return res.status(403).json({ error: 'Access denied. Admin only.' });
  }
  next();
};

// Export bookings
router.get('/bookings/:format', adminOnly, async (req: Request, res: Response) => {
  try {
    const { format } = req.params; // csv sau excel
    const { startDate, endDate, status } = req.query;
    
    // Build query
    let query = `
      SELECT 
        cb.id,
        cb.client_name as "Nume Client",
        cb.client_email as "Email",
        cb.client_phone as "Telefon",
        cb.interview_date as "Data Interviu",
        cb.interview_time as "Ora",
        cb.interview_type as "Tip",
        cb.status as "Status",
        cb.notes as "Note",
        cb.created_at as "Creat La",
        COUNT(DISTINCT d.id) as "Nr. Documente"
      FROM client_bookings cb
      LEFT JOIN documents d ON d.booking_id = cb.id
      WHERE 1=1
    `;
    
    const params: any[] = [];
    let paramIndex = 1;
    
    if (startDate) {
      query += ` AND cb.interview_date >= $${paramIndex}`;
      params.push(startDate);
      paramIndex++;
    }
    
    if (endDate) {
      query += ` AND cb.interview_date <= $${paramIndex}`;
      params.push(endDate);
      paramIndex++;
    }
    
    if (status) {
      query += ` AND cb.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }
    
    query += ` GROUP BY cb.id ORDER BY cb.interview_date DESC`;
    
    const result = await pool.query(query, params);
    const data = result.rows;
    
    // Format dates
    data.forEach(row => {
      row['Data Interviu'] = new Date(row['Data Interviu']).toLocaleDateString('ro-RO');
      row['Creat La'] = new Date(row['Creat La']).toLocaleString('ro-RO');
    });
    
    if (format === 'csv') {
      // Generate CSV
      const fileName = `bookings_${Date.now()}.csv`;
      const filePath = path.join(__dirname, '../../temp', fileName);
      
      // Ensure temp directory exists
      const tempDir = path.join(__dirname, '../../temp');
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }
      
      const csvWriter = createObjectCsvWriter({
        path: filePath,
        header: Object.keys(data[0] || {}).map(key => ({ id: key, title: key }))
      });
      
      await csvWriter.writeRecords(data);
      
      res.download(filePath, fileName, (err) => {
        if (err) console.error('Download error:', err);
        // Clean up temp file
        fs.unlinkSync(filePath);
      });
      
    } else if (format === 'excel') {
      // Generate Excel
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Programări');
      
      // Style header row
      const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
      for (let C = range.s.c; C <= range.e.c; ++C) {
        const address = XLSX.utils.encode_col(C) + '1';
        if (!ws[address]) continue;
        ws[address].s = {
          font: { bold: true },
          fill: { fgColor: { rgb: 'CCCCCC' } }
        };
      }
      
      const fileName = `bookings_${Date.now()}.xlsx`;
      const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' });
      
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      res.send(buffer);
      
    } else {
      res.status(400).json({ error: 'Format invalid. Folosește csv sau excel.' });
    }
    
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ error: 'Eroare la export' });
  }
});

// Export users
router.get('/users/:format', adminOnly, async (req: Request, res: Response) => {
  try {
    const { format } = req.params;
    const { role, status } = req.query;
    
    let query = `
      SELECT 
        u.id as "ID",
        u.username as "Username",
        u.email as "Email",
        u.first_name as "Prenume",
        u.last_name as "Nume",
        u.phone as "Telefon",
        u.role as "Rol",
        u.status as "Status",
        u.created_at as "Înregistrat La",
        COUNT(DISTINCT b.id) as "Nr. Programări",
        COUNT(DISTINCT d.id) as "Nr. Documente"
      FROM users u
      LEFT JOIN client_bookings b ON b.client_email = u.email
      LEFT JOIN documents d ON d.user_id = u.id
      WHERE 1=1
    `;
    
    const params: any[] = [];
    let paramIndex = 1;
    
    if (role) {
      query += ` AND u.role = $${paramIndex}`;
      params.push(role);
      paramIndex++;
    }
    
    if (status) {
      query += ` AND u.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }
    
    query += ` GROUP BY u.id ORDER BY u.created_at DESC`;
    
    const result = await pool.query(query, params);
    const data = result.rows;
    
    // Format dates
    data.forEach(row => {
      row['Înregistrat La'] = new Date(row['Înregistrat La']).toLocaleString('ro-RO');
    });
    
    if (format === 'csv') {
      const fileName = `users_${Date.now()}.csv`;
      const filePath = path.join(__dirname, '../../temp', fileName);
      
      const tempDir = path.join(__dirname, '../../temp');
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }
      
      const csvWriter = createObjectCsvWriter({
        path: filePath,
        header: Object.keys(data[0] || {}).map(key => ({ id: key, title: key }))
      });
      
      await csvWriter.writeRecords(data);
      
      res.download(filePath, fileName, (err) => {
        if (err) console.error('Download error:', err);
        fs.unlinkSync(filePath);
      });
      
    } else if (format === 'excel') {
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Utilizatori');
      
      const fileName = `users_${Date.now()}.xlsx`;
      const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' });
      
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      res.send(buffer);
      
    } else {
      res.status(400).json({ error: 'Format invalid' });
    }
    
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ error: 'Eroare la export' });
  }
});

// Export statistics
router.get('/statistics/:format', adminOnly, async (req: Request, res: Response) => {
  try {
    const { format } = req.params;
    
    // Multiple queries for statistics
    const queries = {
      monthlyBookings: `
        SELECT 
          TO_CHAR(interview_date, 'YYYY-MM') as "Luna",
          COUNT(*) as "Total Programări",
          SUM(CASE WHEN status = 'confirmed' THEN 1 ELSE 0 END) as "Confirmate",
          SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as "Anulate",
          SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as "Completate"
        FROM client_bookings
        WHERE interview_date >= CURRENT_DATE - INTERVAL '12 months'
        GROUP BY TO_CHAR(interview_date, 'YYYY-MM')
        ORDER BY "Luna" DESC
      `,
      
      timeSlotStats: `
        SELECT 
          interview_time as "Ora",
          COUNT(*) as "Total Programări",
          ROUND(AVG(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) * 100, 2) as "Rata Succes %"
        FROM client_bookings
        GROUP BY interview_time
        ORDER BY COUNT(*) DESC
      `,
      
      userActivity: `
        SELECT 
          u.email as "Email",
          COUNT(DISTINCT b.id) as "Programări",
          COUNT(DISTINCT d.id) as "Documente",
          MAX(b.created_at) as "Ultima Activitate"
        FROM users u
        LEFT JOIN client_bookings b ON b.client_email = u.email
        LEFT JOIN documents d ON d.user_id = u.id
        WHERE u.role = 'user'
        GROUP BY u.email
        ORDER BY COUNT(DISTINCT b.id) DESC
        LIMIT 50
      `
    };
    
    const statistics: any = {};
    
    for (const [key, query] of Object.entries(queries)) {
      const result = await pool.query(query);
      statistics[key] = result.rows;
    }
    
    if (format === 'excel') {
      const wb = XLSX.utils.book_new();
      
      // Add each statistic as a sheet
      XLSX.utils.book_append_sheet(
        wb, 
        XLSX.utils.json_to_sheet(statistics.monthlyBookings), 
        'Statistici Lunare'
      );
      
      XLSX.utils.book_append_sheet(
        wb, 
        XLSX.utils.json_to_sheet(statistics.timeSlotStats), 
        'Ore Preferate'
      );
      
      XLSX.utils.book_append_sheet(
        wb, 
        XLSX.utils.json_to_sheet(statistics.userActivity), 
        'Activitate Utilizatori'
      );
      
      const fileName = `statistics_${Date.now()}.xlsx`;
      const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' });
      
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      res.send(buffer);
      
    } else {
      res.status(400).json({ error: 'Pentru statistici folosește format=excel' });
    }
    
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ error: 'Eroare la export statistici' });
  }
});

export default router;