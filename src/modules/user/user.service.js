const { User } = require('./user.model');
const { hashPassword, comparePasswords } = require('../../utils/auth.utils');
const { generateToken } = require('../../utils/token.utils');
const { Op } = require('sequelize');
const crypto = require('crypto');
const { sendEmail } = require('../../services/email.service');

class UserService {
    async createUser(userData) {
        try {
            const existingUser = await User.findOne({
                where: {
                    [Op.or]: [
                        { email: userData.email },
                        { username: userData.username }
                    ]
                }
            });

            if (existingUser) {
                throw new Error('User with this email or username already exists');
            }

            const user = await User.create(userData);
            return user;
        } catch (error) {
            throw new Error(`Error creating user: ${error.message}`);
        }
    }

    async getUserById(id, includeSensitive = false) {
        try {
            const options = {
                where: { id }
            };

            if (includeSensitive) {
                options.attributes = { exclude: ['password'] };
            }

            const user = await User.findByPk(id, options);
            if (!user) {
                throw new Error('User not found');
            }
            return user;
        } catch (error) {
            throw new Error(`Error fetching user: ${error.message}`);
        }
    }

    async getUserByEmail(email, includeSensitive = false) {
        try {
            const options = {
                where: { email }
            };

            if (!includeSensitive) {
                options.attributes = { exclude: ['password'] };
            }

            const user = await User.findOne(options);
            if (!user) {
                throw new Error('User not found');
            }
            return user;
        } catch (error) {
            throw new Error(`Error fetching user: ${error.message}`);
        }
    }

    async updateUser(id, updateData) {
        try {
            const user = await User.findByPk(id);
            if (!user) {
                throw new Error('User not found');
            }

            // Don't allow updating email or username through this method
            const { email, username, ...safeUpdateData } = updateData;

            const updatedUser = await user.update(safeUpdateData);
            return updatedUser;
        } catch (error) {
            throw new Error(`Error updating user: ${error.message}`);
        }
    }

    async deleteUser(id) {
        try {
            const user = await User.findByPk(id);
            if (!user) {
                throw new Error('User not found');
            }

            await user.destroy();
            return { message: 'User deleted successfully' };
        } catch (error) {
            throw new Error(`Error deleting user: ${error.message}`);
        }
    }

    async changePassword(userId, currentPassword, newPassword) {
        try {
            const user = await User.findByPk(userId);
            if (!user) {
                throw new Error('User not found');
            }

            const isMatch = await user.validatePassword(currentPassword);
            if (!isMatch) {
                throw new Error('Current password is incorrect');
            }

            user.password = newPassword;
            await user.save();
            return { message: 'Password updated successfully' };
        } catch (error) {
            throw new Error(`Error changing password: ${error.message}`);
        }
    }

    async requestPasswordReset(email) {
        try {
            const user = await User.findOne({ where: { email } });
            if (!user) {
                // Don't reveal if user exists or not
                return { message: 'If an account exists with this email, a password reset link has been sent' };
            }

            const token = await user.generatePasswordResetToken();
            const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;

            await sendEmail({
                to: user.email,
                subject: 'Password Reset Request',
                template: 'password-reset',
                context: {
                    name: user.username,
                    resetUrl,
                    expiresIn: '1 hour'
                }
            });

            return { message: 'Password reset link sent to your email' };
        } catch (error) {
            throw new Error(`Error requesting password reset: ${error.message}`);
        }
    }

    async resetPassword(token, newPassword) {
        try {
            const hashedToken = crypto
                .createHash('sha256')
                .update(token)
                .digest('hex');

            const user = await User.findOne({
                where: {
                    resetToken: hashedToken,
                    resetTokenExpiry: { [Op.gt]: Date.now() }
                }
            });

            if (!user) {
                throw new Error('Invalid or expired token');
            }

            user.password = newPassword;
            user.resetToken = null;
            user.resetTokenExpiry = null;
            await user.save();

            return { message: 'Password has been reset successfully' };
        } catch (error) {
            throw new Error(`Error resetting password: ${error.message}`);
        }
    }

    async updateProfilePicture(userId, file) {
        try {
            const user = await User.findByPk(userId);
            if (!user) {
                throw new Error('User not found');
            }

            // In a real app, you would upload the file to a storage service here
            // For example: const imageUrl = await uploadToS3(file);
            const imageUrl = `/uploads/profile-pictures/${Date.now()}-${file.originalname}`;

            user.profilePicture = imageUrl;
            await user.save();

            return { profilePicture: user.profilePicture };
        } catch (error) {
            throw new Error(`Error updating profile picture: ${error.message}`);
        }
    }

    async searchUsers(query, page = 1, limit = 10) {
        try {
            const offset = (page - 1) * limit;

            const { count, rows } = await User.findAndCountAll({
                where: {
                    [Op.or]: [
                        { username: { [Op.iLike]: `%${query}%` } },
                        { email: { [Op.iLike]: `%${query}%` } },
                        { firstName: { [Op.iLike]: `%${query}%` } },
                        { lastName: { [Op.iLike]: `%${query}%` } }
                    ]
                },
                attributes: { exclude: ['password'] },
                limit,
                offset,
                order: [['createdAt', 'DESC']]
            });

            return {
                total: count,
                page,
                totalPages: Math.ceil(count / limit),
                users: rows
            };
        } catch (error) {
            throw new Error(`Error searching users: ${error.message}`);
        }
    }

    async updateUserStatus(userId, status, adminId) {
        try {
            const user = await User.findByPk(userId);
            if (!user) {
                throw new Error('User not found');
            }

            // In a real app, you would add admin authorization here
            // and possibly log this action

            user.status = status;
            await user.save();

            return { message: `User status updated to ${status}` };
        } catch (error) {
            throw new Error(`Error updating user status: ${error.message}`);
        }
    }
}

module.exports = new UserService();