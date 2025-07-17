const bcrypt = require('bcryptjs');
const { pool } = require('../config/database');
const { sendEmail, sendBulkEmail } = require('../services/emailService');

// Obține toți utilizatorii
const getAllUsers = async (req, res) => {
  try {
    const { page = 1, limit = 20, search = '', role = '', status = '' } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT 
        id, email, first_name, last_name, role, status, 
        email_verified, created_at, last_login
      FROM users
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 0;

    // Filtrare după search
    if (search) {
      paramCount++;
      query += ` AND (
        email ILIKE $${paramCount} OR 
        first_name ILIKE $${paramCount} OR 
        last_name ILIKE $${paramCount}
      )`;
      params.push(`%${search}%`);
    }

    // Filtrare după rol
    if (role) {
      paramCount++;
      query += ` AND role = $${paramCount}`;
      params.push(role);
    }

    // Filtrare după status
    if (status) {
      paramCount++;
      query += ` AND status = $${paramCount}`;
      params.push(status);
    }

    // Număr total pentru paginare
    const countResult = await pool.query(
      query.replace('SELECT *', 'SELECT COUNT(*)'),
      params
    );
    const totalCount = parseInt(countResult.rows[0].count);

    // Adaugă paginare
    paramCount++;
    query += ` ORDER BY created_at DESC LIMIT $${paramCount}`;
    params.push(limit);
    
    paramCount++;
    query += ` OFFSET $${paramCount}`;
    params.push(offset);

    // Execută query
    const result = await pool.query(query, params);

    res.json({
      success: true,
      data: {
        users: result.rows,
        pagination: {
          total: totalCount,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(totalCount / limit)
        }
      }
    });

  } catch (error) {
    console.error('Eroare la getAllUsers:', error);
    res.status(500).json({
      success: false,
      message: 'Eroare la obținerea utilizatorilor'
    });
  }
};

// Creează un nou admin
const createAdmin = async (req, res) => {
  try {
    const { email, password, firstName, lastName } = req.body;

    // Verifică dacă email-ul există deja
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Email-ul există deja în sistem!'
      });
    }

    // Hash parolă
    const hashedPassword = await bcrypt.hash(password, 10);

    // Creează admin nou
    const newAdmin = await pool.query(
      `INSERT INTO users (
        email, password_hash, first_name, last_name, 
        role, status, email_verified
      ) VALUES ($1, $2, $3, $4, $5, $6, $7) 
      RETURNING id, email, first_name, last_name, role`,
      [
        email.toLowerCase(),
        hashedPassword,
        firstName,
        lastName,
        'admin',
        'active',
        true // Admin-ii sunt verificați automat
      ]
    );

    // Trimite email cu credențiale
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
        <a href="${process.env.FRONTEND_URL}/login" 
           style="background-color: #2196F3; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">
          Autentifică-te
        </a>
      `
    });

    res.status(201).json({
      success: true,
      message: 'Administrator creat cu succes!',
      data: newAdmin.rows[0]
    });

  } catch (error) {
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

    const result = await pool.query(
      'UPDATE users SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      [status, userId]
    );

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

  } catch (error) {
    console.error('Eroare la updateUserStatus:', error);
    res.status(500).json({
      success: false,
      message: 'Eroare la actualizarea statusului'
    });
  }
};

// Resetează parola pentru un utilizator
const resetUserPassword = async (req, res) => {
  try {
    const { userId } = req.params;
    const { newPassword } = req.body;

    // Găsește utilizatorul
    const userResult = await pool.query(
      'SELECT email, first_name FROM users WHERE id = $1',
      [userId]
    );

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
    await pool.query(
      'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
      [hashedPassword, userId]
    );

    // Trimite email cu noua parolă
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

    res.json({
      success: true,
      message: 'Parolă resetată cu succes!'
    });

  } catch (error) {
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
    const { 
      recipients = 'all', // all, active, specific
      userIds = [],
      subject,
      message,
      template
    } = req.body;

    let users;

    // Determină destinatarii
    if (recipients === 'all') {
      const result = await pool.query(
        'SELECT id, email, first_name, last_name FROM users WHERE status = \'active\''
      );
      users = result.rows;
    } else if (recipients === 'active') {
      const result = await pool.query(
        'SELECT id, email, first_name, last_name FROM users WHERE status = \'active\' AND email_verified = true'
      );
      users = result.rows;
    } else if (recipients === 'specific' && userIds.length > 0) {
      const result = await pool.query(
        'SELECT id, email, first_name, last_name FROM users WHERE id = ANY($1)',
        [userIds]
      );
      users = result.rows;
    } else {
      return res.status(400).json({
        success: false,
        message: 'Selectează destinatarii!'
      });
    }

    // Trimite email-uri
    const results = await sendBulkEmail(
      users,
      subject,
      message,
      { trackOpens: true }
    );

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

  } catch (error) {
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
    // Statistici utilizatori
    const userStats = await pool.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN role = 'admin' THEN 1 END) as admins,
        COUNT(CASE WHEN role = 'user' THEN 1 END) as users,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active,
        COUNT(CASE WHEN email_verified = true THEN 1 END) as verified,
        COUNT(CASE WHEN created_at > NOW() - INTERVAL '7 days' THEN 1 END) as new_this_week
      FROM users
    `);

    // Statistici programări
    const bookingStats = await pool.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'confirmed' THEN 1 END) as confirmed,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
        COUNT(CASE WHEN appointment_date >= CURRENT_DATE THEN 1 END) as upcoming,
        COUNT(CASE WHEN appointment_date = CURRENT_DATE THEN 1 END) as today
      FROM bookings
    `);

    // Activitate recentă
    const recentActivity = await pool.query(`
      SELECT 
        'new_user' as type,
        CONCAT(first_name, ' ', last_name) as description,
        created_at as timestamp
      FROM users
      WHERE created_at > NOW() - INTERVAL '24 hours'
      UNION ALL
      SELECT 
        'new_booking' as type,
        CONCAT('Programare pentru ', TO_CHAR(appointment_date, 'DD/MM/YYYY')) as description,
        created_at as timestamp
      FROM bookings
      WHERE created_at > NOW() - INTERVAL '24 hours'
      ORDER BY timestamp DESC
      LIMIT 10
    `);

    res.json({
      success: true,
      data: {
        users: userStats.rows[0],
        bookings: bookingStats.rows[0],
        recentActivity: recentActivity.rows
      }
    });

  } catch (error) {
    console.error('Eroare la getDashboardStats:', error);
    res.status(500).json({
      success: false,
      message: 'Eroare la obținerea statisticilor'
    });
  }
};

module.exports = {
  getAllUsers,
  createAdmin,
  updateUserStatus,
  resetUserPassword,
  sendEmailToUsers,
  getDashboardStats
};