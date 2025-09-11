const jwt = require('jsonwebtoken');
const { User } = require('../modules/user/user.model');
const rateLimit = require('express-rate-limit');

// Rate limiting for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each IP to 10 requests per windowMs
  message: 'Too many login attempts, please try again later.'
});

// Generate JWT token
const generateToken = (user) => {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '1d' }
  );
};

// Verify JWT token
const verifyToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    return null;
  }
};

// Check if user has required role
const hasRole = (requiredRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    
    if (Array.isArray(requiredRoles) && !requiredRoles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }
    
    next();
  };
};

// Check if account is active
const checkAccountStatus = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.user.id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    if (user.status !== 'active') {
      return res.status(403).json({ 
        message: 'Account is not active',
        status: user.status
      });
    }
    
    next();
  } catch (error) {
    console.error('Error in checkAccountStatus:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update last login timestamp
const updateLastLogin = async (userId) => {
  try {
    await User.update(
      { lastLogin: new Date() },
      { where: { id: userId } }
    );
  } catch (error) {
    console.error('Error updating last login:', error);
  }
};

// Check if account is locked
const checkAccountLock = async (req, res, next) => {
  try {
    const user = await User.findOne({ where: { email: req.body.email } });
    
    if (user && user.lockUntil && user.lockUntil > Date.now()) {
      const retryAfter = Math.ceil((user.lockUntil - Date.now()) / 1000);
      return res.status(429).json({
        message: 'Account is temporarily locked due to too many failed login attempts',
        retryAfter: `${retryAfter} seconds`
      });
    }
    
    next();
  } catch (error) {
    console.error('Error in checkAccountLock:', error);
    next();
  }
};

// Handle failed login attempts
const handleFailedLogin = async (user) => {
  try {
    const maxAttempts = parseInt(process.env.MAX_LOGIN_ATTEMPTS || '5', 10);
    const lockTime = parseInt(process.env.ACCOUNT_LOCK_TIME || '900000', 10); // 15 minutes by default
    
    if (!user) return;
    
    const attempts = (user.loginAttempts || 0) + 1;
    let updates = { loginAttempts: attempts };
    
    if (attempts >= maxAttempts) {
      updates.lockUntil = Date.now() + lockTime;
    }
    
    await user.update(updates);
  } catch (error) {
    console.error('Error in handleFailedLogin:', error);
  }
};

// Reset login attempts on successful login
const resetLoginAttempts = async (user) => {
  try {
    await user.update({
      loginAttempts: 0,
      lockUntil: null
    });
  } catch (error) {
    console.error('Error resetting login attempts:', error);
  }
};

module.exports = {
  authLimiter,
  generateToken,
  verifyToken,
  hasRole,
  checkAccountStatus,
  updateLastLogin,
  checkAccountLock,
  handleFailedLogin,
  resetLoginAttempts
};
