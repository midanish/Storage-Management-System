const jwt = require('jsonwebtoken');
const { User } = require('../models');
const { handleDatabaseError, asyncHandler } = require('./connectionHandler');
const { trackUserActivity, checkConnectionLimit } = require('./sessionManager');

const authenticateToken = asyncHandler(async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token is required' });
  }

  try {
    const decoded = jwt.verify(token, 'your-secret-key-here-123456');
    const user = await User.findOne({ where: { id: decoded.id } });

    if (!user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    req.user = user;
    
    // Check connection limit and track user activity
    checkConnectionLimit(req, res, () => {
      trackUserActivity(req, res, next);
    });
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    throw error; // Let asyncHandler catch database errors
  }
});

const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

const generateToken = (user) => {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    'your-secret-key-here-123456',
    { expiresIn: '30m' } // 30 minutes to match idle timeout
  );
};

module.exports = {
  authenticateToken,
  requireAdmin,
  generateToken,
};