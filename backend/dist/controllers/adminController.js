const bcrypt = require('bcryptjs');
const { pool } = require('../config/database');
const { sendEmail, sendBulkEmail } = require('../services/emailService');
// Obține toți utilizatorii
const getAllUsers = async (req, res) => {
    try {
        const { limit, sort, role, status } = req.query;
        let query = `
      SELECT 
        u.id,
        u.email,
        u.username,
        u.first_name,
        u.last_name,
        u.role,
        u.status,
        u.email_verified,
        u.created_at,
        u.updated_at,
        COUNT(DISTINCT b.id) as bookings_count
      FROM users u
      LEFT JOIN bookings b ON u.id = b.user_id
      WHERE 1=1
    `;
        const queryParams = [];
        let paramIndex = 1;
        // Filtrare după rol
        if (role && role !== 'all') {
            query += ` AND u.role = $${paramIndex}`;
            queryParams.push(role);
            paramIndex++;
        }
        // Filtrare după status
        if (status && status !== 'all') {
            query += ` AND u.status = $${paramIndex}`;
            queryParams.push(status);
            paramIndex++;
        }
        query += ' GROUP BY u.id';
        // Sortare
        if (sort) {
            const [field, order] = sort.split(':');
            const validFields = ['created_at', 'email', 'first_name', 'last_name', 'role', 'status'];
            const validOrder = ['asc', 'desc'];
            if (validFields.includes(field) && validOrder.includes(order?.toLowerCase())) {
                query += ` ORDER BY u.${field} ${order.toUpperCase()}`;
            }
            else {
                query += ' ORDER BY u.created_at DESC';
            }
        }
        else {
            query += ' ORDER BY u.created_at DESC';
        }
        // Limită
        if (limit && !isNaN(limit)) {
            query += ` LIMIT ${parseInt(limit)}`;
        }
        const result = await pool.query(query, queryParams);
        res.json({
            success: true,
            data: result.rows,
            total: result.rows.length
        });
    }
    catch (error) {
        console.error('Eroare la getAllUsers:', error);
        res.status(500).json({
            success: false,
            message: 'Eroare la încărcarea utilizatorilor',
            error: error.message
        });
    }
};
// Creează un nou admin
const createAdmin = async (req, res) => {
    try {
        const { email, password, firstName, lastName } = req.body;
        // Verifică dacă email-ul există deja
        const existingUser = await pool.query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
        if (existingUser.rows.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Email-ul există deja în sistem!'
            });
        }
        // Generează username din email
        const username = email.split('@')[0].toLowerCase();
        // Hash parolă
        const hashedPassword = await bcrypt.hash(password, 10);
        // Creează admin nou
        const newAdmin = await pool.query(`INSERT INTO users (
        email, username, password_hash, first_name, last_name, 
        role, status, email_verified
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
      RETURNING id, email, first_name, last_name, role`, [
            email.toLowerCase(),
            username,
            hashedPassword,
            firstName,
            lastName,
            'admin',
            'active',
            true // Admin-ii sunt verificați automat
        ]);
        // Trimite email cu credențiale
        try {
            await sendEmail({
                to: email,
                subject: 'Cont Administrator - Interview Booking',
                html: `
          <h2>Bine ai venit în echipa de administrare!</h2>
          <p>Salut ${firstName},</p>
          <p>Contul tău de administrator a fost creat cu succes.</p>
          <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px;">
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Parolă:</strong> ${password}</p>
          </div>
          <p style="color: #ff0000;"><strong>IMPORTANT:</strong> Te rugăm să-ți schimbi parola la prima autentificare!</p>
          <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/login" 
             style="background-color: #2196F3; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">
            Autentifică-te
          </a>
        `
            });
        }
        catch (emailError) {
            console.error('Eroare la trimiterea email-ului:', emailError);
        }
        res.status(201).json({
            success: true,
            message: 'Administrator creat cu succes!',
            data: newAdmin.rows[0]
        });
    }
    catch (error) {
        console.error('Eroare la createAdmin:', error);
        res.status(500).json({
            success: false,
            message: 'Eroare la crearea administratorului'
        });
    }
};
// Actualizează status utilizator
const updateUserStatus = async (req, res) => {
    try {
        const { userId } = req.params;
        const { status } = req.body;
        if (!['active', 'inactive', 'suspended'].includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Status invalid!'
            });
        }
        const result = await pool.query('UPDATE users SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *', [status, userId]);
        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Utilizator negăsit!'
            });
        }
        res.json({
            success: true,
            message: 'Status actualizat cu succes!',
            data: result.rows[0]
        });
    }
    catch (error) {
        console.error('Eroare la updateUserStatus:', error);
        res.status(500).json({
            success: false,
            message: 'Eroare la actualizarea statusului'
        });
    }
};
// Actualizare rol utilizator
const updateUserRole = async (req, res) => {
    try {
        const { userId } = req.params;
        const { role } = req.body;
        if (!['user', 'admin'].includes(role)) {
            return res.status(400).json({
                success: false,
                message: 'Rol invalid!'
            });
        }
        const result = await pool.query('UPDATE users SET role = $1, updated_at = NOW() WHERE id = $2 RETURNING id, email, role', [role, userId]);
        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Utilizator negăsit!'
            });
        }
        res.json({
            success: true,
            message: 'Rol actualizat cu succes!',
            data: result.rows[0]
        });
    }
    catch (error) {
        console.error('Eroare la updateUserRole:', error);
        res.status(500).json({
            success: false,
            message: 'Eroare la actualizarea rolului'
        });
    }
};
// Ștergere utilizator
const deleteUser = async (req, res) => {
    try {
        const { userId } = req.params;
        // Verifică dacă utilizatorul are programări active
        const bookingsCheck = await pool.query('SELECT COUNT(*) as count FROM bookings WHERE user_id = $1 AND status = $2', [userId, 'confirmed']);
        if (parseInt(bookingsCheck.rows[0].count) > 0) {
            return res.status(400).json({
                success: false,
                message: 'Nu poți șterge un utilizator cu programări active!'
            });
        }
        // Șterge utilizatorul
        const result = await pool.query('DELETE FROM users WHERE id = $1 RETURNING id, email', [userId]);
        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Utilizator negăsit!'
            });
        }
        res.json({
            success: true,
            message: 'Utilizator șters cu succes!',
            data: result.rows[0]
        });
    }
    catch (error) {
        console.error('Eroare la deleteUser:', error);
        res.status(500).json({
            success: false,
            message: 'Eroare la ștergerea utilizatorului'
        });
    }
};
// Obține toate programările (pentru admin)
const getAllBookings = async (req, res) => {
    try {
        const { limit, sort, status, date } = req.query;
        let query = `
      SELECT 
        b.id,
        b.user_id,
        b.slot_id,
        b.status,
        b.notes,
        b.created_at,
        u.email as user_email,
        u.first_name || ' ' || u.last_name as user_name,
        ts.date,
        ts.start_time,
        ts.end_time
      FROM bookings b
      JOIN users u ON b.user_id = u.id
      JOIN time_slots ts ON b.slot_id = ts.id
      WHERE 1=1
    `;
        const queryParams = [];
        let paramIndex = 1;
        // Filtrare după status
        if (status && status !== 'all') {
            query += ` AND b.status = $${paramIndex}`;
            queryParams.push(status);
            paramIndex++;
        }
        // Filtrare după dată
        if (date) {
            query += ` AND ts.date = $${paramIndex}`;
            queryParams.push(date);
            paramIndex++;
        }
        // Sortare
        if (sort) {
            const [field, order] = sort.split(':');
            const validFields = ['created_at', 'date', 'status'];
            const validOrder = ['asc', 'desc'];
            if (validFields.includes(field) && validOrder.includes(order?.toLowerCase())) {
                if (field === 'date') {
                    query += ` ORDER BY ts.date ${order.toUpperCase()}, ts.start_time ASC`;
                }
                else {
                    query += ` ORDER BY b.${field} ${order.toUpperCase()}`;
                }
            }
            else {
                query += ' ORDER BY ts.date DESC, ts.start_time ASC';
            }
        }
        else {
            query += ' ORDER BY ts.date DESC, ts.start_time ASC';
        }
        // Limită
        if (limit && !isNaN(limit)) {
            query += ` LIMIT ${parseInt(limit)}`;
        }
        const result = await pool.query(query, queryParams);
        res.json({
            success: true,
            data: result.rows,
            total: result.rows.length
        });
    }
    catch (error) {
        console.error('Eroare la getAllBookings:', error);
        res.status(500).json({
            success: false,
            message: 'Eroare la încărcarea programărilor'
        });
    }
};
// Resetează parola pentru un utilizator
const resetUserPassword = async (req, res) => {
    try {
        const { userId } = req.params;
        const { newPassword } = req.body;
        // Găsește utilizatorul
        const userResult = await pool.query('SELECT email, first_name FROM users WHERE id = $1', [userId]);
        if (userResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Utilizator negăsit!'
            });
        }
        const user = userResult.rows[0];
        // Hash parolă nouă
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        // Actualizează parola
        await pool.query('UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2', [hashedPassword, userId]);
        // Trimite email cu noua parolă
        try {
            await sendEmail({
                to: user.email,
                subject: 'Parolă resetată - Interview Booking',
                html: `
          <h2>Parola ta a fost resetată</h2>
          <p>Salut ${user.first_name},</p>
          <p>Un administrator a resetat parola contului tău.</p>
          <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px;">
            <p><strong>Parolă nouă:</strong> ${newPassword}</p>
          </div>
          <p style="color: #ff0000;"><strong>IMPORTANT:</strong> Te rugăm să-ți schimbi parola imediat după autentificare!</p>
        `
            });
        }
        catch (emailError) {
            console.error('Eroare la trimiterea email-ului:', emailError);
        }
        res.json({
            success: true,
            message: 'Parolă resetată cu succes!'
        });
    }
    catch (error) {
        console.error('Eroare la resetUserPassword:', error);
        res.status(500).json({
            success: false,
            message: 'Eroare la resetarea parolei'
        });
    }
};
// Trimite email către utilizatori
const sendEmailToUsers = async (req, res) => {
    try {
        const { recipients = 'all', // all, active, specific
        userIds = [], subject, message, template } = req.body;
        let users;
        // Determină destinatarii
        if (recipients === 'all') {
            const result = await pool.query('SELECT id, email, first_name, last_name FROM users WHERE status = \'active\'');
            users = result.rows;
        }
        else if (recipients === 'active') {
            const result = await pool.query('SELECT id, email, first_name, last_name FROM users WHERE status = \'active\' AND email_verified = true');
            users = result.rows;
        }
        else if (recipients === 'specific' && userIds.length > 0) {
            const result = await pool.query('SELECT id, email, first_name, last_name FROM users WHERE id = ANY($1)', [userIds]);
            users = result.rows;
        }
        else {
            return res.status(400).json({
                success: false,
                message: 'Selectează destinatarii!'
            });
        }
        // Verifică dacă funcția sendBulkEmail există
        if (typeof sendBulkEmail === 'function') {
            // Trimite email-uri în bulk
            const results = await sendBulkEmail(users, subject, message, { trackOpens: true });
            res.json({
                success: true,
                message: 'Email-uri trimise!',
                data: {
                    total: users.length,
                    sent: results.sent.length,
                    failed: results.failed.length,
                    failedDetails: results.failed
                }
            });
        }
        else {
            // Fallback - trimite individual
            let sent = 0;
            let failed = 0;
            for (const user of users) {
                try {
                    await sendEmail({
                        to: user.email,
                        subject: subject,
                        html: message.replace(/\{firstName\}/g, user.first_name)
                            .replace(/\{lastName\}/g, user.last_name)
                            .replace(/\{email\}/g, user.email)
                    });
                    sent++;
                }
                catch (error) {
                    failed++;
                    console.error(`Eroare trimitere email către ${user.email}:`, error);
                }
            }
            res.json({
                success: true,
                message: 'Email-uri procesate!',
                data: {
                    total: users.length,
                    sent: sent,
                    failed: failed
                }
            });
        }
    }
    catch (error) {
        console.error('Eroare la sendEmailToUsers:', error);
        res.status(500).json({
            success: false,
            message: 'Eroare la trimiterea email-urilor'
        });
    }
};
// Dashboard statistics
const getDashboardStats = async (req, res) => {
    try {
        // Total utilizatori
        const totalUsersQuery = await pool.query('SELECT COUNT(*) as count FROM users');
        const totalUsers = parseInt(totalUsersQuery.rows[0].count) || 0;
        // Utilizatori activi
        const activeUsersQuery = await pool.query('SELECT COUNT(*) as count FROM users WHERE status = $1', ['active']);
        const activeUsers = parseInt(activeUsersQuery.rows[0].count) || 0;
        // Total programări
        const totalBookingsQuery = await pool.query('SELECT COUNT(*) as count FROM bookings');
        const totalBookings = parseInt(totalBookingsQuery.rows[0].count) || 0;
        // Programări de azi - folosește JOIN pentru a obține date din time_slots
        const todayBookingsQuery = await pool.query(`SELECT COUNT(*) as count 
       FROM bookings b
       JOIN time_slots ts ON b.slot_id = ts.id
       WHERE ts.date = CURRENT_DATE AND b.status = $1`, ['confirmed']);
        const todayBookings = parseInt(todayBookingsQuery.rows[0].count) || 0;
        // Total sloturi
        const totalSlotsQuery = await pool.query('SELECT COUNT(*) as count FROM time_slots');
        const totalSlots = parseInt(totalSlotsQuery.rows[0].count) || 0;
        // Sloturi disponibile
        const availableSlotsQuery = await pool.query(`SELECT COUNT(*) as count FROM time_slots 
   WHERE date >= CURRENT_DATE 
   AND id NOT IN (
     SELECT slot_id FROM bookings 
     WHERE status = 'confirmed'
   )`);
        const availableSlots = parseInt(availableSlotsQuery.rows[0].count) || 0;
        // Programări viitoare
        const upcomingBookingsQuery = await pool.query(`SELECT COUNT(*) as count 
       FROM bookings b
       JOIN time_slots ts ON b.slot_id = ts.id
       WHERE ts.date >= CURRENT_DATE AND b.status = $1`, ['confirmed']);
        const upcomingBookings = parseInt(upcomingBookingsQuery.rows[0].count) || 0;
        // Utilizatori noi (ultima săptămână)
        const newUsersQuery = await pool.query(`SELECT COUNT(*) as count FROM users 
       WHERE created_at >= NOW() - INTERVAL '7 days'`);
        const newUsers = parseInt(newUsersQuery.rows[0].count) || 0;
        res.json({
            success: true,
            data: {
                totalUsers,
                activeUsers,
                totalBookings,
                todayBookings,
                upcomingBookings,
                totalSlots,
                availableSlots,
                newUsers
            }
        });
    }
    catch (error) {
        console.error('Eroare la getDashboardStats:', error);
        res.status(500).json({
            success: false,
            message: 'Eroare la încărcarea statisticilor',
            error: error.message
        });
    }
};
module.exports = {
    getAllUsers,
    createAdmin,
    updateUserStatus,
    updateUserRole,
    deleteUser,
    getAllBookings,
    resetUserPassword,
    sendEmailToUsers,
    getDashboardStats
};
