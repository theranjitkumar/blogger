const userService = require('./user.service');
const { validationResult } = require('express-validator');
const { generateToken } = require('../../utils/token.utils');
const { handleFailedLogin, resetLoginAttempts, updateLastLogin } = require('../../utils/auth.utils');

class UserController {
    // Register a new user
    async register(req, res, next) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ errors: errors.array() });
            }

            const user = await userService.createUser(req.body);
            const token = generateToken(user);

            // Update last login
            await updateLastLogin(user.id);

            res.status(201).json({
                user: {
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    role: user.role,
                    status: user.status
                },
                token
            });
        } catch (error) {
            next(error);
        }
    }

    // Get current user profile
    async getProfile(req, res, next) {
        try {
            const user = await userService.getUserById(req.user.id);
            res.json({ user });
        } catch (error) {
            next(error);
        }
    }

    // Update user profile
    async updateProfile(req, res, next) {
        try {
            const updatedUser = await userService.updateUser(req.user.id, req.body);
            res.json({ user: updatedUser });
        } catch (error) {
            next(error);
        }
    }

    // Change password
    async changePassword(req, res, next) {
        try {
            const { currentPassword, newPassword } = req.body;
            await userService.changePassword(req.user.id, currentPassword, newPassword);
            res.json({ message: 'Password updated successfully' });
        } catch (error) {
            next(error);
        }
    }

    // Request password reset
    async requestPasswordReset(req, res, next) {
        try {
            const { email } = req.body;
            const result = await userService.requestPasswordReset(email);
            res.json(result);
        } catch (error) {
            next(error);
        }
    }

    // Reset password with token
    async resetPassword(req, res, next) {
        try {
            const { token, newPassword } = req.body;
            const result = await userService.resetPassword(token, newPassword);
            res.json(result);
        } catch (error) {
            next(error);
        }
    }

    // Update profile picture
    async updateProfilePicture(req, res, next) {
        try {
            if (!req.file) {
                return res.status(400).json({ message: 'Please upload a file' });
            }
            const result = await userService.updateProfilePicture(req.user.id, req.file);
            res.json(result);
        } catch (error) {
            next(error);
        }
    }

    // Admin: Get all users (paginated)
    async getAllUsers(req, res, next) {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const users = await userService.searchUsers('', page, limit);
            res.json(users);
        } catch (error) {
            next(error);
        }
    }

    // Admin: Get user by ID
    async getUserById(req, res, next) {
        try {
            const user = await userService.getUserById(req.params.id);
            res.json({ user });
        } catch (error) {
            next(error);
        }
    }

    // Admin: Update user status
    async updateUserStatus(req, res, next) {
        try {
            const { status } = req.body;
            const result = await userService.updateUserStatus(
                req.params.id,
                status,
                req.user.id
            );
            res.json(result);
        } catch (error) {
            next(error);
        }
    }

    // Admin: Delete user
    async deleteUser(req, res, next) {
        try {
            const result = await userService.deleteUser(req.params.id);
            res.json(result);
        } catch (error) {
            next(error);
        }
    }
}

module.exports = new UserController();