"use strict";
// backend/src/middleware/authorize.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.authorize = void 0;
const authorize = (roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Neautentificat'
            });
        }
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: 'Nu ai permisiunea pentru această acțiune'
            });
        }
        next();
    };
};
exports.authorize = authorize;
