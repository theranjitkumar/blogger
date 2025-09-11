const express = require('express');
const router = express.Router();
const { check } = require('express-validator');
const userController = require('./user.controller');
const { isAuthenticated, hasRole } = require('../../middleware/auth');
const upload = require('../../config/multer');

// Public routes
router.post(
    '/register',
    [
        check('username', 'Username is required').notEmpty(),
        check('email', 'Please include a valid email').isEmail(),
        check('password', 'Please enter a password with 6+ characters').isLength({ min: 6 })
    ],
    userController.register
);

// Protected routes
router.use(isAuthenticated);

// User profile routes
router.get('/profile', userController.getProfile);
router.put('/profile', userController.updateProfile);

// Password management
router.post(
    '/change-password',
    [
        check('currentPassword', 'Current password is required').exists(),
        check('newPassword', 'New password must be 6+ characters').isLength({ min: 6 })
    ],
    userController.changePassword
);

// Profile picture upload
router.post(
    '/profile/picture',
    upload.single('profilePicture'),
    userController.updateProfilePicture
);

// Admin routes
router.use(hasRole('admin'));

router.get('/admin/users', userController.getAllUsers);
router.get('/admin/users/:id', userController.getUserById);
router.put('/admin/users/:id/status', userController.updateUserStatus);
router.delete('/admin/users/:id', userController.deleteUser);

module.exports = router;