const nodemailer = require('nodemailer');

class EmailService {
    constructor() {
        this.transporter = nodemailer.createTransport({
            host: process.env.EMAIL_HOST || 'smtp.gmail.com', // Use environment variables in production
            port: process.env.EMAIL_PORT || 587,
            secure: process.env.EMAIL_SECURE === 'true', // true for 465, false for other ports
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASSWORD
            }
        });
    }

    /**
     * Send an email
     * @param {Object} options - Email options
     * @param {string} options.to - Recipient email address
     * @param {string} options.subject - Email subject
     * @param {string} options.text - Plain text email body
     * @param {string} [options.html] - HTML email body
     * @returns {Promise<Object>} - Result of the email sending operation
     */
    async sendEmail({ to, subject, text, html = null }) {
        try {
            const mailOptions = {
                from: `"${process.env.EMAIL_FROM_NAME || 'Blogger App'}" <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
                to,
                subject,
                text,
                ...(html && { html })
            };

            const info = await this.transporter.sendMail(mailOptions);
            return { success: true, messageId: info.messageId };
        } catch (error) {
            console.error('Error sending email:', error);
            throw new Error(`Failed to send email: ${error.message}`);
        }
    }

    /**
     * Send a password reset email
     * @param {string} to - Recipient email address
     * @param {string} resetToken - Password reset token
     * @returns {Promise<Object>} - Result of the email sending operation
     */
    async sendPasswordResetEmail(to, resetToken) {
        const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;
        const subject = 'Password Reset Request';
        const text = `You are receiving this email because you (or someone else) has requested a password reset.\n\n` +
            `Please click on the following link to complete the process:\n\n` +
            `${resetUrl}\n\n` +
            `If you did not request this, please ignore this email.`;

        const html = `
            <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <h2>Password Reset Request</h2>
                <p>You are receiving this email because you (or someone else) has requested a password reset.</p>
                <p>Please click the button below to reset your password:</p>
                <p>
                    <a href="${resetUrl}" 
                       style="display: inline-block; padding: 10px 20px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px;">
                        Reset Password
                    </a>
                </p>
                <p>Or copy and paste this link into your browser:</p>
                <p>${resetUrl}</p>
                <p>If you did not request this, please ignore this email and your password will remain unchanged.</p>
                <p>This link will expire in 1 hour.</p>
            </div>
        `;

        return this.sendEmail({
            to,
            subject,
            text,
            html
        });
    }

    /**
     * Send a welcome email to new users
     * @param {string} to - Recipient email address
     * @param {string} username - User's username
     * @returns {Promise<Object>} - Result of the email sending operation
     */
    async sendWelcomeEmail(to, username) {
        const subject = 'Welcome to Blogger App!';
        const text = `Welcome ${username},\n\n` +
            `Thank you for registering with Blogger App. We're excited to have you on board!\n\n` +
            `Start by creating your first blog post and connect with other bloggers.\n\n` +
            `Best regards,\nThe Blogger Team`;

        const html = `
            <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <h2>Welcome to Blogger App, ${username}!</h2>
                <p>Thank you for registering with Blogger App. We're excited to have you on board!</p>
                <p>Start by creating your first blog post and connect with other bloggers.</p>
                <p>If you have any questions, feel free to reply to this email.</p>
                <p>Best regards,<br>The Blogger Team</p>
            </div>
        `;

        return this.sendEmail({
            to,
            subject,
            text,
            html
        });
    }
}

module.exports = new EmailService();
