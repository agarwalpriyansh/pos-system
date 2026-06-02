const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authorization denied, token missing' });
  }

  const token = authHeader.split(' ')[1];
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'pos_jwt_secret_token_key');
    req.user = decoded;
    req.shopId = decoded.shopId;
    next();
  } catch (error) {
    console.error('[Auth Middleware Error]:', error.message);
    res.status(401).json({ error: 'Token is invalid or expired' });
  }
};

module.exports = authMiddleware;
