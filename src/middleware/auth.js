const jwt = require('jsonwebtoken');
const { User } = require('../modules/user/user.model');

// Middleware to check if user is authenticated
exports.isAuthenticated = (req, res, next) => {
  // Check session first
  if (req.session && req.session.user) {
    req.user = req.session.user;
    return next();
  }

  // Check for JWT token
  const token = req.header('x-auth-token') || req.cookies.token;
  
  if (!token) {
    if (req.accepts('html')) {
      req.session.returnTo = req.originalUrl;
      return res.redirect('/auth/login');
    }
    return res.status(401).json({ message: 'Authentication required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    if (req.accepts('html')) {
      return res.redirect('/auth/login');
    }
    res.status(401).json({ message: 'Invalid or expired token' });
  }
};

// Middleware to check user role
exports.hasRole = (roles = []) => {
  return (req, res, next) => {
    if (!req.user) {
      if (req.accepts('html')) {
        return res.redirect('/auth/login');
      }
      return res.status(401).json({ message: 'Authentication required' });
    }

    if (typeof roles === 'string') {
      roles = [roles];
    }

    if (roles.length && !roles.includes(req.user.role)) {
      if (req.accepts('html')) {
        return res.redirect('/');
      }
      return res.status(403).json({ message: 'Insufficient permissions' });
    }

    next();
  };
};

// Redirect if already logged in
exports.redirectIfLoggedIn = (req, res, next) => {
  if (req.session && req.session.user) {
    return res.redirect('/dashboard');
  }
  next();
};

// Check if account is active
exports.checkAccountStatus = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.user.id);
    
    if (!user) {
      if (req.accepts('html')) {
        return res.redirect('/auth/login');
      }
      return res.status(404).json({ message: 'User not found' });
    }
    
    if (user.status !== 'active') {
      if (req.accepts('html')) {
        return res.redirect('/auth/login?error=account-inactive');
      }
      return res.status(403).json({ 
        message: 'Account is not active',
        status: user.status
      });
    }
    
    next();
  } catch (error) {
    console.error('Error in checkAccountStatus:', error);
    if (req.accepts('html')) {
      return res.redirect('/error?code=500');
    }
    res.status(500).json({ message: 'Server error' });
  }
};

// Check if account is locked
exports.checkAccountLock = async (req, res, next) => {
  try {
    const user = await User.findOne({ where: { email: req.body.email } });
    
    if (user && user.lockUntil && user.lockUntil > Date.now()) {
      const retryAfter = Math.ceil((user.lockUntil - Date.now()) / 1000);
      
      if (req.accepts('html')) {
        return res.render('auth/login', {
          error: `Too many failed attempts. Please try again in ${retryAfter} seconds.`,
          email: req.body.email
        });
      }
      
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
