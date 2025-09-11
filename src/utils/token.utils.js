const jwt = require('jsonwebtoken');

/**
 * Generate JWT token
 * @param {Object} user - User object
 * @returns {String} JWT token
 */
const generateToken = (user) => {
  return jwt.sign(
    {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role || 'user'
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

/**
 * Verify JWT token
 * @param {String} token - JWT token to verify
 * @returns {Object} Decoded token payload
 */
const verifyToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
};

/**
 * Get token from request headers or cookies
 * @param {Object} req - Express request object
 * @returns {String|null} Token if found, null otherwise
 */
const getTokenFromRequest = (req) => {
  let token = null;
  
  // Check Authorization header
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  } 
  // Check cookies
  else if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }
  
  return token;
};

/**
 * Set token in response cookie
 * @param {Object} res - Express response object
 * @param {String} token - JWT token
 */
const setTokenCookie = (res, token) => {
  const cookieOptions = {
    expires: new Date(
      Date.now() + (process.env.JWT_COOKIE_EXPIRES_IN || 7) * 24 * 60 * 60 * 1000
    ),
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict'
  };

  res.cookie('token', token, cookieOptions);
};

/**
 * Clear token cookie
 * @param {Object} res - Express response object
 */
const clearTokenCookie = (res) => {
  res.cookie('token', 'none', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true
  });
};

module.exports = {
  generateToken,
  verifyToken,
  getTokenFromRequest,
  setTokenCookie,
  clearTokenCookie
};
