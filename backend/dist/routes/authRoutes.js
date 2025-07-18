"use strict";
// backend/src/routes/authRoutes.ts
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const server_1 = require("../server");
const router = (0, express_1.Router)();
// Secret pentru JWT - folosind configurația ta
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-2025';
// POST /api/auth/login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        // Validare
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Email și parola sunt obligatorii'
            });
        }
        // Caută utilizatorul
        const result = await server_1.pool.query('SELECT * FROM users WHERE email = $1', [email]);
        if (result.rows.length === 0) {
            return res.status(401).json({
                success: false,
                message: 'Email sau parolă incorectă'
            });
        }
        const user = result.rows[0];
        // Verifică parola
        const isValidPassword = await bcryptjs_1.default.compare(password, user.password);
        if (!isValidPassword) {
            return res.status(401).json({
                success: false,
                message: 'Email sau parolă incorectă'
            });
        }
        // Verifică dacă utilizatorul este activ
        if (!user.is_active) {
            return res.status(403).json({
                success: false,
                message: 'Contul tău a fost dezactivat'
            });
        }
        // Generează token JWT
        const token = jsonwebtoken_1.default.sign({
            id: user.id,
            email: user.email,
            role: user.role,
            name: user.name
        }, JWT_SECRET, { expiresIn: '24h' });
        // Trimite răspuns
        res.json({
            success: true,
            message: 'Autentificare reușită',
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                avatar: user.avatar
            }
        });
    }
    catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            message: 'Eroare la autentificare'
        });
    }
});
// POST /api/auth/register
router.post('/register', async (req, res) => {
    try {
        const { name, email, password, phone } = req.body;
        // Validare
        if (!name || !email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Toate câmpurile sunt obligatorii'
            });
        }
        // Verifică dacă email-ul există deja
        const existingUser = await server_1.pool.query('SELECT id FROM users WHERE email = $1', [email]);
        if (existingUser.rows.length > 0) {
            return res.status(409).json({
                success: false,
                message: 'Email-ul este deja înregistrat'
            });
        }
        // Hash parolă
        const hashedPassword = await bcryptjs_1.default.hash(password, 10);
        // Creează utilizator
        const result = await server_1.pool.query(`INSERT INTO users (name, email, password, phone, role) 
       VALUES ($1, $2, $3, $4, 'user') 
       RETURNING id, name, email, role, created_at`, [name, email, hashedPassword, phone || null]);
        const newUser = result.rows[0];
        // Generează token
        const token = jsonwebtoken_1.default.sign({
            id: newUser.id,
            email: newUser.email,
            role: newUser.role,
            name: newUser.name
        }, JWT_SECRET, { expiresIn: '24h' });
        res.status(201).json({
            success: true,
            message: 'Cont creat cu succes',
            token,
            user: {
                id: newUser.id,
                name: newUser.name,
                email: newUser.email,
                role: newUser.role
            }
        });
    }
    catch (error) {
        console.error('Register error:', error);
        res.status(500).json({
            success: false,
            message: 'Eroare la înregistrare'
        });
    }
});
// POST /api/auth/logout
router.post('/logout', (req, res) => {
    // În cazul JWT, logout se face pe client ștergând token-ul
    res.json({
        success: true,
        message: 'Delogare reușită'
    });
});
// GET /api/auth/me - Obține profilul utilizatorului curent
router.get('/me', async (req, res) => {
    try {
        // Extrage token din header
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                message: 'Token lipsă'
            });
        }
        const token = authHeader.substring(7);
        // Verifică token
        const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        // Obține date actualizate despre utilizator
        const result = await server_1.pool.query('SELECT id, name, email, role, phone, avatar, is_active FROM users WHERE id = $1', [decoded.id]);
        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Utilizator negăsit'
            });
        }
        res.json({
            success: true,
            user: result.rows[0]
        });
    }
    catch (error) {
        console.error('Get profile error:', error);
        res.status(401).json({
            success: false,
            message: 'Token invalid'
        });
    }
});
// POST /api/auth/change-password
router.post('/change-password', async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                message: 'Token lipsă'
            });
        }
        const token = authHeader.substring(7);
        const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        // Obține utilizatorul
        const userResult = await server_1.pool.query('SELECT password FROM users WHERE id = $1', [decoded.id]);
        if (userResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Utilizator negăsit'
            });
        }
        // Verifică parola curentă
        const isValidPassword = await bcryptjs_1.default.compare(currentPassword, userResult.rows[0].password);
        if (!isValidPassword) {
            return res.status(401).json({
                success: false,
                message: 'Parola curentă este incorectă'
            });
        }
        // Hash parola nouă
        const hashedPassword = await bcryptjs_1.default.hash(newPassword, 10);
        // Actualizează parola
        await server_1.pool.query('UPDATE users SET password = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [hashedPassword, decoded.id]);
        res.json({
            success: true,
            message: 'Parola a fost schimbată cu succes'
        });
    }
    catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({
            success: false,
            message: 'Eroare la schimbarea parolei'
        });
    }
});
exports.default = router;
