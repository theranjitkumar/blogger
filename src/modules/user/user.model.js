const { Model, DataTypes, Op } = require('sequelize');
const bcrypt = require('bcryptjs');
const sequelize = require('../../config/db');

// Define user roles and statuses
const USER_ROLES = {
    ADMIN: 'admin',
    AUTHOR: 'author',
    USER: 'user'
};

const USER_STATUS = {
    ACTIVE: 'active',
    PENDING: 'pending',
    SUSPENDED: 'suspended'
};

class User extends Model {
    async validatePassword(password) {
        return await bcrypt.compare(password, this.password);
    }

    async generatePasswordResetToken() {
        const crypto = require('crypto');
        const token = crypto.randomBytes(32).toString('hex');
        this.resetToken = crypto.createHash('sha256').update(token).digest('hex');
        this.resetTokenExpiry = Date.now() + 3600000; // 1 hour from now
        await this.save();
        return token;
    }

    async updateLastLogin() {
        this.lastLogin = new Date();
        await this.save();
    }
}

User.ROLES = USER_ROLES;
User.STATUS = USER_STATUS;

User.init({
    username: {
        type: DataTypes.STRING(30),
        allowNull: false,
        unique: true,
        validate: {
            len: [3, 30],
            is: /^[a-zA-Z0-9_]+$/ // Only alphanumeric and underscore
        }
    },
    email: {
        type: DataTypes.STRING(100),
        allowNull: false,
        unique: true,
        validate: {
            isEmail: true,
            notEmpty: true
        }
    },
    firstName: {
        type: DataTypes.STRING(50),
        allowNull: true
    },
    lastName: {
        type: DataTypes.STRING(50),
        allowNull: true
    },
    password: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
            len: [8, 100],
            isStrongPassword(value) {
                if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/.test(value)) {
                    throw new Error('Password must contain at least one uppercase letter, one lowercase letter, one number and one special character');
                }
            }
        }
    },
    role: {
        type: DataTypes.ENUM(Object.values(USER_ROLES)),
        defaultValue: USER_ROLES.USER,
        allowNull: false
    },
    status: {
        type: DataTypes.ENUM(Object.values(USER_STATUS)),
        defaultValue: USER_STATUS.PENDING,
        allowNull: false
    },
    profilePicture: {
        type: DataTypes.STRING,
        allowNull: true
    },
    bio: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    lastLogin: {
        type: DataTypes.DATE,
        allowNull: true
    },
    loginAttempts: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        allowNull: false
    },
    lockUntil: {
        type: DataTypes.DATE,
        allowNull: true
    },
    resetToken: {
        type: DataTypes.STRING,
        allowNull: true
    },
    resetTokenExpiry: {
        type: DataTypes.DATE,
        allowNull: true
    },
    isVerified: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    }
}, {
    sequelize,
    modelName: 'user',
    timestamps: true,
    paranoid: true, // Enable soft delete
    defaultScope: {
        attributes: {
            exclude: ['password', 'resetToken', 'resetTokenExpiry']
        }
    },
    scopes: {
        withSensitiveData: {
            attributes: { include: ['email'] }
        },
        active: {
            where: { status: USER_STATUS.ACTIVE }
        }
    },
    hooks: {
        beforeCreate: async (user) => {
            if (user.password) {
                const salt = await bcrypt.genSalt(10);
                user.password = await bcrypt.hash(user.password, salt);
            }
            // Set default status based on email verification requirement
            if (process.env.REQUIRE_EMAIL_VERIFICATION === 'true') {
                user.status = USER_STATUS.PENDING;
            } else {
                user.status = USER_STATUS.ACTIVE;
                user.isVerified = true;
            }
        },
        beforeUpdate: async (user) => {
            if (user.changed('password')) {
                const salt = await bcrypt.genSalt(10);
                user.password = await bcrypt.hash(user.password, salt);
                // Reset login attempts when password is changed
                user.loginAttempts = 0;
                user.lockUntil = null;
            }
        },
        afterCreate: (user) => {
            // Send verification email if required
            if (process.env.REQUIRE_EMAIL_VERIFICATION === 'true' && !user.isVerified) {
                // TODO: Implement email verification
            }
        }
    },
    indexes: [
        {
            unique: true,
            fields: ['email']
        },
        {
            unique: true,
            fields: ['username']
        },
        {
            fields: ['status']
        },
        {
            fields: ['role']
        }
    ]
});

module.exports = User;