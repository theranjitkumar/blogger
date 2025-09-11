var createError = require('http-errors');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const hbs = require('hbs');

const session = require('express-session');
const SequelizeStore = require('connect-session-sequelize')(session.Store);
const sequelize = require('./src/config/db');

var router = require('./src/modules/index');
const authRoutes = require('./src/modules/auth/auth.routes');
const userRoutes = require('./src/modules/user/user.routes');

var app = express();

// Add after app.use(express.static(...))
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  store: new SequelizeStore({
    db: sequelize,
    checkExpirationInterval: 15 * 60 * 1000,
    expiration: 24 * 60 * 60 * 1000
  }),
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000
  }
}));

// Authentication middleware
app.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  next();
});

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hbs');

// Register Handlebars helpers
hbs.registerHelper('currentYear', () => new Date().getFullYear());

// Default value helper
hbs.registerHelper('default', function(value, defaultValue) {
  return value !== undefined && value !== null && value !== '' ? value : defaultValue;
});

// Helper for role-based access in templates
hbs.registerHelper('eq', function (a, b, options) {
  if (!options) return '';
  return a === b 
    ? (options.fn ? options.fn(this) : '')
    : (options.inverse ? options.inverse(this) : '');
});

// Format dates using moment.js
hbs.registerHelper('formatDate', function(date, format, options) {
  if (!date) return '';
  try {
    const moment = require('moment');
    return moment(date).format(format || 'MMMM D, YYYY');
  } catch (error) {
    console.error('Error formatting date:', error);
    return date.toString();
  }
});

// Generate excerpt from content
hbs.registerHelper('excerpt', function(content, length) {
  if (!content) return '';
  const safeLength = parseInt(length) || 150;
  const excerpt = content.replace(/<[^>]*>?/gm, '').substring(0, safeLength);
  return content.length > safeLength ? excerpt + '...' : excerpt;
});

// Check if user has any of the specified roles
hbs.registerHelper('hasRole', function(userRoles, requiredRoles, options) {
  if (!options) return '';
  if (!userRoles || !requiredRoles) {
    return options.inverse ? options.inverse(this) : '';
  }
  
  const roles = Array.isArray(userRoles) ? userRoles : [userRoles];
  const required = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles];
  const hasRole = roles.some(role => required.includes(role));
  
  return hasRole 
    ? (options.fn ? options.fn(this) : '')
    : (options.inverse ? options.inverse(this) : '');
});

// Check if a value is in an array
hbs.registerHelper('inArray', function(value, array, options) {
  if (!options) return '';
  if (!array) return options.inverse ? options.inverse(this) : '';
  
  const arr = typeof array === 'string' ? array.split(',') : array;
  const isInArray = Array.isArray(arr) && arr.includes(value);
  
  return isInArray
    ? (options.fn ? options.fn(this) : '')
    : (options.inverse ? options.inverse(this) : '');
});

// Truncate text to specified length
hbs.registerHelper('truncate', function(str, len) {
  if (!str) return '';
  const safeLen = parseInt(len) || 100;
  return str.length <= safeLen ? str : str.substring(0, safeLen) + '...';
});

// Format time as "time ago"
hbs.registerHelper('timeAgo', function(date) {
  if (!date) return '';
  try {
    const moment = require('moment');
    return moment(date).fromNow();
  } catch (error) {
    console.error('Error formatting time ago:', error);
    return '';
  }
});

// Debug helper - only runs in development
hbs.registerHelper('debug', function(optionalValue, options) {
  if (process.env.NODE_ENV !== 'development') return '';
  
  console.log('Current Context');
  console.log('====================');
  console.log(this);
  
  if (optionalValue) {
    console.log('Value');
    console.log('====================');
    console.log(optionalValue);
  }
  
  return ''; // Don't output anything to the template
});

// Register partials
hbs.registerPartials(path.join(__dirname, 'views/partials'));

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', router);
app.use('/auth', authRoutes);
app.use('/api/users', userRoutes); // User API routes

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
