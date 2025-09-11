const express = require('express');
const router = express.Router();
const { check } = require('express-validator');
const authController = require('./auth.controller');
const { requireAuth, redirectIfLoggedIn } = require('../../middleware/auth');

// Login routes
router.get('/login', redirectIfLoggedIn, authController.getLogin);
router.post('/login', [
  check('email', 'Please include a valid email').isEmail(),
  check('password', 'Password is required').exists()
], authController.postLogin);

// Register routes
router.get('/register', redirectIfLoggedIn, authController.getRegister);
router.post('/register', [
  check('username', 'Username is required').not().isEmpty(),
  check('email', 'Please include a valid email').isEmail(),
  check('password', 'Please enter a password with 6 or more characters').isLength({ min: 6 })
], authController.postRegister);

// Logout
router.get('/logout', authController.logout);

module.exports = router;