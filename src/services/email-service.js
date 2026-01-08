// src/services/email-service.js
// Email service for sending OTP codes

const nodemailer = require('nodemailer');

class EmailService {
    constructor() {
        this.transporter = null;
        this.initializeTransporter();
    }

    initializeTransporter() {
        // Check if email credentials are provided
        if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
            console.warn('⚠️  Email credentials not configured. OTP emails will not be sent.');
            console.warn('   Set EMAIL_USER and EMAIL_PASS in .env file');
            return;
        }

        try {
            this.transporter = nodemailer.createTransport({
                service: 'gmail',
                auth: {
                    user: process.env.EMAIL_USER,
                    pass: process.env.EMAIL_PASS // Use Gmail App Password
                }
            });

            console.log('✅ Email service initialized');
        } catch (error) {
            console.error('❌ Failed to initialize email service:', error.message);
        }
    }

    /**
     * Generate a 6-digit OTP code
     * @returns {string} 6-digit OTP
     */
    generateOTP() {
        return Math.floor(100000 + Math.random() * 900000).toString();
    }

    /**
     * Send OTP email to user
     * @param {string} email - Recipient email
     * @param {string} otp - 6-digit OTP code
     * @returns {Promise<boolean>} Success status
     */
    async sendOTP(email, otp) {
        if (!this.transporter) {
            console.error('❌ Email service not configured');
            // For development, just log the OTP
            console.log(`🔐 OTP for ${email}: ${otp} (valid for 10 minutes)`);
            return false;
        }

        try {
            const mailOptions = {
                from: `"ChemHelp" <${process.env.EMAIL_USER}>`,
                to: email,
                subject: 'Your ChemHelp Login Code',
                html: `
                    <!DOCTYPE html>
                    <html>
                    <head>
                        <style>
                            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                                     color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
                            .otp-box { background: white; padding: 20px; text-align: center; 
                                      border: 2px dashed #667eea; border-radius: 10px; margin: 20px 0; }
                            .otp-code { font-size: 36px; font-weight: bold; color: #667eea; 
                                       letter-spacing: 8px; font-family: monospace; }
                            .warning { color: #e74c3c; font-size: 14px; margin-top: 20px; }
                            .footer { text-align: center; color: #777; font-size: 12px; margin-top: 20px; }
                        </style>
                    </head>
                    <body>
                        <div class="container">
                            <div class="header">
                                <h1>🧪 ChemHelp</h1>
                                <p>Your Login Verification Code</p>
                            </div>
                            <div class="content">
                                <p>Hello,</p>
                                <p>You requested to log in to your ChemHelp account. Use the verification code below:</p>
                                
                                <div class="otp-box">
                                    <div class="otp-code">${otp}</div>
                                    <p style="margin: 10px 0 0 0; color: #666;">Valid for 10 minutes</p>
                                </div>
                                
                                <p>Enter this code on the login page to continue.</p>
                                
                                <div class="warning">
                                    ⚠️ If you didn't request this code, please ignore this email.
                                    Someone may have entered your email by mistake.
                                </div>
                            </div>
                            <div class="footer">
                                <p>This is an automated message from ChemHelp. Please do not reply.</p>
                            </div>
                        </div>
                    </body>
                    </html>
                `
            };

            await this.transporter.sendMail(mailOptions);
            console.log(`✅ OTP email sent to ${email}`);
            return true;
        } catch (error) {
            console.error('❌ Failed to send OTP email:', error.message);
            // For development, log the OTP as fallback
            console.log(`🔐 OTP for ${email}: ${otp} (email failed, check console)`);
            return false;
        }
    }

    /**
     * Send welcome email to new users
     * @param {string} email - Recipient email
     * @param {string} name - User name
     * @returns {Promise<boolean>} Success status
     */
    async sendWelcomeEmail(email, name = 'User') {
        if (!this.transporter) {
            console.log(`📧 Welcome email for ${email} (not sent - service not configured)`);
            return false;
        }

        try {
            const mailOptions = {
                from: `"ChemHelp" <${process.env.EMAIL_USER}>`,
                to: email,
                subject: 'Welcome to ChemHelp!',
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                        <h2>Welcome to ChemHelp, ${name}! 🧪</h2>
                        <p>Your account has been successfully created.</p>
                        <p>You can now start drawing chemical structures and exploring our features.</p>
                        <p>If you have any questions, feel free to reach out to our support team.</p>
                        <p>Happy drawing!</p>
                        <p style="color: #666; font-size: 12px;">- The ChemHelp Team</p>
                    </div>
                `
            };

            await this.transporter.sendMail(mailOptions);
            console.log(`✅ Welcome email sent to ${email}`);
            return true;
        } catch (error) {
            console.error('❌ Failed to send welcome email:', error.message);
            return false;
        }
    }
}

// Export singleton instance
module.exports = new EmailService();
