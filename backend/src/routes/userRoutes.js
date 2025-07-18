const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { protect, adminOnly } = require('../middleware/authMiddleware');

// Controller temporar până creăm userController.js
const userController = {
  // Get all users (admin only)
  getAllUsers: async (req, res) => {
    try {
      const { role, search, page = 1, limit = 10 } = req.query;
      const offset = (page - 1) * limit;
      
      let query = `
        SELECT 
          id, email, name, first_name, last_name, 
          role, is_active, created_at, phone
        FROM users 
        WHERE 1=1
      `;
      const params = [];
      let paramCount = 0;

      // Filter by role
      if (role) {
        paramCount++;
        query += ` AND role = $${paramCount}`;
        params.push(role);
      }

      // Search by name or email
      if (search) {
        paramCount++;
        query += ` AND (name ILIKE $${paramCount} OR email ILIKE $${paramCount})`;
        params.push(`%${search}%`);
      }

      // Add ordering
      query += ' ORDER BY created_at DESC';
      
      // Add pagination
      paramCount++;
      query += ` LIMIT $${paramCount}`;
      params.push(limit);
      
      paramCount++;
      query += ` OFFSET $${paramCount}`;
      params.push(offset);

      const result = await pool.query(query, params);
      
      // Get total count
      let countQuery = 'SELECT COUNT(*) FROM users WHERE 1=1';
      const countParams = [];
      let countParamNum = 0;
      
      if (role) {
        countParamNum++;
        countQuery += ` AND role = $${countParamNum}`;
        countParams.push(role);
      }
      
      if (search) {
        countParamNum++;
        countQuery += ` AND (name ILIKE $${countParamNum} OR email ILIKE $${countParamNum})`;
        countParams.push(`%${search}%`);
      }
      
      const countResult = await pool.query(countQuery, countParams);
      const totalCount = parseInt(countResult.rows[0].count);

      res.json({
        success: true,
        data: result.rows,
        pagination: {
          total: totalCount,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(totalCount / limit)
        }
      });
    } catch (error) {
      console.error('Error fetching users:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching users'
      });
    }
  },

  // Get single user by ID (admin only)
  getUserById: async (req, res) => {
    try {
      const { id } = req.params;
      
      const result = await pool.query(
        'SELECT id, email, name, first_name, last_name, role, is_active, created_at, phone FROM users WHERE id = $1',
        [id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      res.json({
        success: true,
        data: result.rows[0]
      });
    } catch (error) {
      console.error('Error fetching user:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching user'
      });
    }
  },

  // Create new user (admin only)
  createUser: async (req, res) => {
    try {
      const { email, password, name, first_name, last_name, role = 'user', phone } = req.body;

      // Check if user exists
      const existingUser = await pool.query(
        'SELECT id FROM users WHERE email = $1',
        [email]
      );

      if (existingUser.rows.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'User already exists'
        });
      }

      // Hash password
      const bcrypt = require('bcrypt');
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create user
      const result = await pool.query(
        `INSERT INTO users (email, password, name, first_name, last_name, role, phone, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, $7, true)
         RETURNING id, email, name, first_name, last_name, role, is_active, created_at`,
        [email, hashedPassword, name || `${first_name} ${last_name}`, first_name, last_name, role, phone]
      );

      res.status(201).json({
        success: true,
        data: result.rows[0]
      });
    } catch (error) {
      console.error('Error creating user:', error);
      res.status(500).json({
        success: false,
        message: 'Error creating user'
      });
    }
  },

  // Update user (admin only)
  updateUser: async (req, res) => {
    try {
      const { id } = req.params;
      const { email, name, first_name, last_name, role, is_active, phone } = req.body;

      const result = await pool.query(
        `UPDATE users 
         SET email = $1, name = $2, first_name = $3, last_name = $4, 
             role = $5, is_active = $6, phone = $7, updated_at = NOW()
         WHERE id = $8
         RETURNING id, email, name, first_name, last_name, role, is_active, phone`,
        [email, name, first_name, last_name, role, is_active, phone, id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      res.json({
        success: true,
        data: result.rows[0]
      });
    } catch (error) {
      console.error('Error updating user:', error);
      res.status(500).json({
        success: false,
        message: 'Error updating user'
      });
    }
  },

  // Delete user (admin only)
  deleteUser: async (req, res) => {
    try {
      const { id } = req.params;

      const result = await pool.query(
        'DELETE FROM users WHERE id = $1 RETURNING id',
        [id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      res.json({
        success: true,
        message: 'User deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting user:', error);
      res.status(500).json({
        success: false,
        message: 'Error deleting user'
      });
    }
  },

  getProfile: (req, res) => {
    res.json({
      success: true,
      data: {
        id: req.user.id,
        email: req.user.email,
        name: req.user.name,
        firstName: req.user.first_name,
        lastName: req.user.last_name,
        role: req.user.role,
        phone: req.user.phone
      }
    });
  },
  
  updateProfile: async (req, res) => {
    try {
      const userId = req.user.id;
      const { name, first_name, last_name, phone } = req.body;

      const result = await pool.query(
        `UPDATE users 
         SET name = $1, first_name = $2, last_name = $3, phone = $4, updated_at = NOW()
         WHERE id = $5
         RETURNING id, email, name, first_name, last_name, phone`,
        [name, first_name, last_name, phone, userId]
      );

      res.json({
        success: true,
        data: result.rows[0]
      });
    } catch (error) {
      console.error('Error updating profile:', error);
      res.status(500).json({
        success: false,
        message: 'Error updating profile'
      });
    }
  },
  
  changePassword: async (req, res) => {
    try {
      const userId = req.user.id;
      const { currentPassword, newPassword } = req.body;

      // Get user with password
      const user = await pool.query(
        'SELECT password FROM users WHERE id = $1',
        [userId]
      );

      // Verify current password
      const bcrypt = require('bcrypt');
      const isValid = await bcrypt.compare(currentPassword, user.rows[0].password);

      if (!isValid) {
        return res.status(400).json({
          success: false,
          message: 'Current password is incorrect'
        });
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      // Update password
      await pool.query(
        'UPDATE users SET password = $1, updated_at = NOW() WHERE id = $2',
        [hashedPassword, userId]
      );

      res.json({
        success: true,
        message: 'Password changed successfully'
      });
    } catch (error) {
      console.error('Error changing password:', error);
      res.status(500).json({
        success: false,
        message: 'Error changing password'
      });
    }
  },
  
  uploadDocuments: (req, res) => {
    res.json({
      success: true,
      message: 'Upload documents - în dezvoltare'
    });
  },
  
  getDocuments: (req, res) => {
    res.json({
      success: true,
      message: 'Get documents - în dezvoltare',
      data: []
    });
  }
};

// Public user routes (admin only)
router.get('/', protect, adminOnly, userController.getAllUsers);
router.get('/:id', protect, adminOnly, userController.getUserById);
router.post('/', protect, adminOnly, userController.createUser);
router.put('/:id', protect, adminOnly, userController.updateUser);
router.delete('/:id', protect, adminOnly, userController.deleteUser);

// Profile routes (authenticated users)
router.get('/profile', protect, userController.getProfile);
router.patch('/profile', protect, userController.updateProfile);
router.post('/change-password', protect, userController.changePassword);

// Documents routes
router.post('/documents', protect, userController.uploadDocuments);
router.get('/documents', protect, userController.getDocuments);

module.exports = router;