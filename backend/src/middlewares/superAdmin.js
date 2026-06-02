const superAdminMiddleware = (req, res, next) => {
  if (req.user && req.user.role === 'SuperAdmin') {
    next();
  } else {
    return res.status(403).json({ error: 'Forbidden: Platform Super Admin access only' });
  }
};

module.exports = superAdminMiddleware;
