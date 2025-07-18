"use strict";
// backend/src/middleware/auth.ts
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticateToken = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-2025';
const authenticateToken = (req, res, next) => {
    try {
        // Obține token din header
        const authHeader = req.headers.authorization;
        const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : null;
        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'Token de autentificare lipsă'
            });
        }
        // Verifică token
        jsonwebtoken_1.default.verify(token, JWT_SECRET, (err, decoded) => {
            if (err) {
                return res.status(401).json({
                    success: false,
                    message: 'Token invalid sau expirat'
                });
            }
            // Adaugă informațiile utilizatorului în request
            req.user = decoded;
            next();
        });
    }
    catch (error) {
        console.error('Auth middleware error:', error);
        res.status(500).json({
            success: false,
            message: 'Eroare la verificarea autentificării'
        });
    }
};
exports.authenticateToken = authenticateToken;
