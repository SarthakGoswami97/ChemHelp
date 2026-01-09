// src/services/email-service.js
// Email service for sending OTP codes - supports multiple providers

const nodemailer = require('nodemailer');

class EmailService {
    constructor() {
        this.transporter = null;
        this.resend = null;
        this.provider = null; // 'nodemailer', 'resend', or null
        this.initializeTransporter();
    }

    initializeTransporter() {
        // Priority 1: Check for Resend API key (most reliable on Render)
        if (process.env.RESEND_API_KEY && !process.env.RESEND_API_KEY.includes('your-')) {
            try {
                const { Resend } = require('resend');
                this.resend = new Resend(process.env.RESEND_API_KEY);
                this.provider = 'resend';
                console.log('✅ Email service initialized (Resend API) - RECOMMENDED FOR RENDER');
                return;
            } catch (error) {
                console.error('❌ Failed to initialize Resend:', error.message);
            }
        }

        // Priority 2: Check for SendGrid API key (good alternative)
        if (process.env.SENDGRID_API_KEY && !process.env.SENDGRID_API_KEY.includes('your-')) {
            try {
                const sgMail = require('@sendgrid/mail');
                sgMail.setApiKey(process.env.SENDGRID_API_KEY);
                this.sendgrid = sgMail;
                this.provider = 'sendgrid';
                console.log('✅ Email service initialized (SendGrid API)');
                return;
            } catch (error) {
                console.error('❌ Failed to initialize SendGrid:', error.message);
            }
        }

        // Priority 3: Check for SMTP/Nodemailer credentials (may timeout on Render)
        if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
            // Check if using placeholder values
            if (process.env.EMAIL_USER.includes('your-email') || 
                process.env.EMAIL_PASS.includes('your-') ||
                process.env.EMAIL_USER === 'your-email@gmail.com') {
                console.warn('⚠️  Email credentials are placeholder values. OTP emails will not be sent.');
                console.warn('   RECOMMENDED: Use Resend (free, reliable on Render)');
                console.warn('   Set RESEND_API_KEY at resend.com');
                return;
            }

            try {
                const emailService = process.env.EMAIL_SERVICE || this.detectEmailService(process.env.EMAIL_USER);
                
                let transportConfig;
                
                if (emailService === 'custom') {
                    transportConfig = {
                        host: process.env.SMTP_HOST || 'smtp.gmail.com',
                        port: parseInt(process.env.SMTP_PORT || '587'),
                        secure: process.env.SMTP_SECURE === 'true',
                        auth: {
                            user: process.env.EMAIL_USER,
                            pass: process.env.EMAIL_PASS
                        },
                        connectionTimeout: 5000,
                        socketTimeout: 5000
                    };
                } else {
                    transportConfig = {
                        service: emailService,
                        auth: {
                            user: process.env.EMAIL_USER,
                            pass: process.env.EMAIL_PASS
                        },
                        connectionTimeout: 5000,
                        socketTimeout: 5000
                    };
                }

                this.transporter = nodemailer.createTransport(transportConfig);
                this.provider = 'nodemailer';
                console.log(`✅ Email service initialized (${emailService})`);
                return;
            } catch (error) {
                console.error('❌ Failed to initialize email service:', error.message);
            }
        }

        // No email configuration found
        console.warn('⚠️  Email service not configured. OTP verification disabled.');
        console.warn('   ⭐ RECOMMENDED: Resend API (free, works on Render)');
        console.warn('      Set RESEND_API_KEY in Render environment variables');
        console.warn('      Get free key at: https://resend.com');
    }

    detectEmailService(email) {
        if (!email) return 'gmail';
        
        const domain = email.split('@')[1]?.toLowerCase();
        
        const serviceMap = {
            'gmail.com': 'gmail',
            'outlook.com': 'outlook',
            'hotmail.com': 'outlook',
            'live.com': 'outlook',
            'yahoo.com': 'yahoo',
            'yahoo.in': 'yahoo',
            'icloud.com': 'icloud',
            'mail.com': 'mail.com',
            'aol.com': 'aol',
            'zoho.com': 'zoho'
        };
        
        return serviceMap[domain] || 'custom';
    }

    isConfigured() {
        return this.provider !== null;
    }

    generateOTP() {
        return Math.floor(100000 + Math.random() * 900000).toString();
    }

    async sendOTP(email, otp) {
        const fromEmail = process.env.EMAIL_FROM || process.env.EMAIL_USER || 'noreply@chemhelp.app';
        const fromName = process.env.EMAIL_FROM_NAME || 'ChemHelp';

        const htmlContent = `
            <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 30px; background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%); border-radius: 16px;">
                <div style="text-align: center; margin-bottom: 24px;">
                    <span style="font-size: 48px;">🧪</span>
                    <h1 style="color: #1e3a5f; margin: 12px 0 0 0; font-size: 24px;">ChemHelp</h1>
                </div>
                
                <div style="background: white; border-radius: 12px; padding: 24px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
                    <h2 style="color: #334155; margin: 0 0 16px 0; font-size: 18px; text-align: center;">
                        Your Verification Code
                    </h2>
                    
                    <div style="background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: white; font-size: 32px; font-weight: 700; letter-spacing: 8px; text-align: center; padding: 20px; border-radius: 10px; margin: 16px 0;">
                        ${otp}
                    </div>
                    
                    <p style="color: #64748b; font-size: 14px; text-align: center; margin: 16px 0 0 0;">
                        This code expires in <strong>10 minutes</strong>
                    </p>
                </div>
                
                <p style="color: #94a3b8; font-size: 12px; text-align: center; margin-top: 20px;">
                    If you didn't request this code, please ignore this email.
                </p>
            </div>
        `;

        // Use Resend API
        if (this.provider === 'resend' && this.resend) {
            try {
                await this.resend.emails.send({
                    from: `${fromName} <${fromEmail}>`,
                    to: email,
                    subject: `${otp} - Your ChemHelp Verification Code`,
                    html: htmlContent
                });
                console.log(`📧 OTP sent to ${email} via Resend`);
                return true;
            } catch (error) {
                console.error('❌ Failed to send OTP via Resend:', error.message);
                console.log(`🔐 OTP for ${email}: ${otp} (email failed, check console)`);
                return false;
            }
        }

        // Use SendGrid
        if (this.provider === 'sendgrid' && this.sendgrid) {
            try {
                await this.sendgrid.send({
                    to: email,
                    from: fromEmail,
                    subject: `${otp} - Your ChemHelp Verification Code`,
                    html: htmlContent,
                    text: `Your ChemHelp verification code is: ${otp}\n\nThis code expires in 10 minutes.\n\nIf you didn't request this, please ignore this email.`
                });
                console.log(`📧 OTP sent to ${email} via SendGrid`);
                return true;
            } catch (error) {
                console.error('❌ Failed to send OTP via SendGrid:', error.message);
                console.log(`🔐 OTP for ${email}: ${otp} (email failed, check console)`);
                return false;
            }
        }

        // Use Nodemailer (may timeout on Render with Gmail)
        if (this.provider === 'nodemailer' && this.transporter) {
            try {
                await this.transporter.sendMail({
                    from: `"${fromName}" <${fromEmail}>`,
                    to: email,
                    subject: `${otp} - Your ChemHelp Verification Code`,
                    html: htmlContent,
                    text: `Your ChemHelp verification code is: ${otp}\n\nThis code expires in 10 minutes.\n\nIf you didn't request this, please ignore this email.`
                });
                console.log(`📧 OTP sent to ${email} via SMTP`);
                return true;
            } catch (error) {
                console.error('❌ Failed to send OTP email:', error.message);
                console.log(`🔐 OTP for ${email}: ${otp} (email failed, check console)`);
                return false;
            }
        }

        // Fallback - log to console
        console.log(`🔐 OTP for ${email}: ${otp} (email not configured, check server logs)`);
        return false;
    }
}

module.exports = new EmailService();
