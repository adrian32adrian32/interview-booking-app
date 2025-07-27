import { Router, Request, Response } from 'express';
import { pool } from '../server';
import * as XLSX from 'xlsx';
import path from 'path';

const router = Router();

// Middleware pentru verificare admin
const adminMiddleware = async (req: Request, res: Response, next: Function) => {
  // Verifică dacă e admin (simplificat pentru moment)
  next();
};

// Export bookings to Excel
router.get('/bookings/excel', adminMiddleware, async (req: Request, res: Response) => {
  try {
    const { startDate, endDate, status } = req.query;
    
    let query = `
      SELECT 
        cb.id as "ID",
        cb.client_name as "Nume Client",
        cb.client_email as "Email",
        cb.client_phone as "Telefon",
        cb.interview_date as "Data",
        cb.interview_time as "Ora",
        cb.interview_type as "Tip",
        cb.status as "Status",
        cb.notes as "Note",
        cb.created_at as "Creat La"
      FROM client_bookings cb
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
    
    query += ` ORDER BY cb.interview_date DESC, cb.interview_time DESC`;
    
    const result = await pool.query(query, params);
    
    // Format dates for Excel
    const data = result.rows.map(row => ({
      ...row,
      "Data": new Date(row["Data"]).toLocaleDateString('ro-RO'),
      "Creat La": new Date(row["Creat La"]).toLocaleString('ro-RO')
    }));
    
    // Create workbook
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);
    
    // Set column widths
    const colWidths = [
      {wch: 5},  // ID
      {wch: 25}, // Nume
      {wch: 30}, // Email
      {wch: 15}, // Telefon
      {wch: 12}, // Data
      {wch: 8},  // Ora
      {wch: 10}, // Tip
      {wch: 12}, // Status
      {wch: 40}, // Note
      {wch: 20}  // Creat La
    ];
    ws['!cols'] = colWidths;
    
    XLSX.utils.book_append_sheet(wb, ws, "Programări");
    
    // Add summary sheet
    const summaryData = [
      { "Statistică": "Total Programări", "Valoare": data.length },
      { "Statistică": "Confirmate", "Valoare": data.filter(r => r.Status === 'confirmed').length },
      { "Statistică": "În așteptare", "Valoare": data.filter(r => r.Status === 'pending').length },
      { "Statistică": "Anulate", "Valoare": data.filter(r => r.Status === 'cancelled').length }
    ];
    
    const wsSummary = XLSX.utils.json_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, wsSummary, "Sumar");
    
    // Generate buffer
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    
    // Send file
    const filename = `programari_${new Date().toISOString().split('T')[0]}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
    
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ error: 'Failed to export bookings' });
  }
});

// Export users to Excel
router.get('/users/excel', adminMiddleware, async (req: Request, res: Response) => {
  try {
    const result = await pool.query(`
      SELECT 
        u.id as "ID",
        u.username as "Username",
        u.email as "Email",
        u.first_name as "Prenume",
        u.last_name as "Nume",
        u.phone as "Telefon",
        u.role as "Rol",
        u.status as "Status",
        COUNT(DISTINCT cb.id) as "Nr. Programări",
        COUNT(DISTINCT d.id) as "Nr. Documente",
        u.created_at as "Înregistrat La"
      FROM users u
      LEFT JOIN client_bookings cb ON cb.client_email = u.email
      LEFT JOIN documents d ON d.user_id = u.id
      GROUP BY u.id
      ORDER BY u.created_at DESC
    `);
    
    // Format data
    const data = result.rows.map(row => ({
      ...row,
      "Înregistrat La": new Date(row["Înregistrat La"]).toLocaleString('ro-RO')
    }));
    
    // Create workbook
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);
    
    // Set column widths
    const colWidths = [
      {wch: 5},  // ID
      {wch: 15}, // Username
      {wch: 30}, // Email
      {wch: 15}, // Prenume
      {wch: 15}, // Nume
      {wch: 15}, // Telefon
      {wch: 10}, // Rol
      {wch: 10}, // Status
      {wch: 15}, // Nr. Programări
      {wch: 15}, // Nr. Documente
      {wch: 20}  // Înregistrat La
    ];
    ws['!cols'] = colWidths;
    
    XLSX.utils.book_append_sheet(wb, ws, "Utilizatori");
    
    // Generate buffer
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    
    // Send file
    const filename = `utilizatori_${new Date().toISOString().split('T')[0]}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
    
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ error: 'Failed to export users' });
  }
});

// Export bookings to CSV
router.get('/bookings/csv', adminMiddleware, async (req: Request, res: Response) => {
  try {
    const result = await pool.query(`
      SELECT * FROM client_bookings ORDER BY interview_date DESC
    `);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'No data to export' });
    }
    
    // Create CSV content
    const headers = Object.keys(result.rows[0]).join(',');
    const rows = result.rows.map(row => 
      Object.values(row).map(val => 
        typeof val === 'string' && val.includes(',') ? `"${val}"` : val
      ).join(',')
    );
    
    const csv = [headers, ...rows].join('\n');
    
    // Send file
    const filename = `programari_${new Date().toISOString().split('T')[0]}.csv`;
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);
    
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ error: 'Failed to export data' });
  }
});

export default router;
