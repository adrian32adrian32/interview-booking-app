// backend/src/middleware/authorize.js
const authorize = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Neautorizat'
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Nu ai permisiunea să accesezi această resursă'
      });
    }

    next();
  };
};

module.exports = { authorize };