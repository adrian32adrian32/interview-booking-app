const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-here';
const protect = async (req, res, next) => {
    try {
        let token;
        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
        }
        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'Nu ești autentificat!'
            });
        }
        try {
            const decoded = jwt.verify(token, JWT_SECRET);
            req.user = decoded;
            next();
        }
        catch (error) {
            return res.status(401).json({
                success: false,
                message: 'Token invalid!'
            });
        }
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Eroare la autentificare!'
        });
    }
};
const adminOnly = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        next();
    }
    else {
        res.status(403).json({
            success: false,
            message: 'Acces interzis! Doar pentru administratori.'
        });
    }
};
module.exports = { protect, adminOnly };
