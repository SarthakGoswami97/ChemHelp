# 🔐 OTP Email Verification Setup Guide

## ✅ What's Been Implemented

Your ChemHelp app now has **two-factor authentication** with email OTP verification:

1. **Email Service** - Sends beautiful HTML OTP emails
2. **Database** - Stores OTP codes with 10-minute expiry
3. **Login Flow** - Email/Password → OTP → Success
4. **Security** - Auto-cleanup of expired codes

---

## 📧 Setting Up Gmail for OTP

### Step 1: Enable 2-Factor Authentication on Gmail

1. Go to [Google Account Security](https://myaccount.google.com/security)
2. Enable **2-Step Verification** if not already enabled

### Step 2: Create App Password

1. Go to [App Passwords](https://myaccount.google.com/apppasswords)
2. Select app: **Mail**
3. Select device: **Other (Custom name)** → Type "ChemHelp"
4. Click **Generate**
5. Copy the 16-character password (e.g., `abcd efgh ijkl mnop`)

### Step 3: Update Your `.env` File

```bash
# Add these lines to your .env file:
EMAIL_USER=your-gmail@gmail.com
EMAIL_PASS=abcd efgh ijkl mnop
```

**Important**: Remove spaces from the app password when pasting!

---

## 🧪 Testing Locally

1. **Update .env** with your Gmail credentials
2. **Restart server**: `npm start`
3. **Open** http://localhost:5000
4. **Login** with any registered account
5. **Check your email** for 6-digit OTP code
6. **Enter code** and verify

### Development Mode (No Email)

If EMAIL_USER is not set, OTP codes will be **logged to console**:

```
🔐 OTP for user@example.com: 123456 (valid for 10 minutes)
```

---

## 🚀 Deploying to Render with OTP

### Step 1: Push to GitHub

```bash
git add -A
git commit -m "Add OTP verification"
git push origin main
```

### Step 2: Configure Environment Variables in Render

1. Go to your Render dashboard
2. Click your **ChemHelp** service
3. Go to **Environment** tab
4. Add these variables:
   - `EMAIL_USER` = `your-gmail@gmail.com`
   - `EMAIL_PASS` = `your-app-password`
5. Click **Save Changes**
6. Render will auto-deploy

---

## 🔄 Login Flow

### Old Flow (Direct Login):
```
Email/Password → ✓ Login Success
```

### New Flow (OTP Verification):
```
Email/Password → ✓ OTP Sent → Enter 6-Digit Code → ✓ Login Success
```

---

## 📱 OTP Email Preview

Users will receive a beautiful email:

```
┌──────────────────────────────┐
│        🧪 ChemHelp           │
│  Your Login Verification     │
├──────────────────────────────┤
│                              │
│  Your verification code:     │
│                              │
│     ╔══════════════╗         │
│     ║   123456    ║         │
│     ╚══════════════╝         │
│                              │
│  Valid for 10 minutes        │
│                              │
│  ⚠️  If you didn't request   │
│  this, please ignore.        │
└──────────────────────────────┘
```

---

## 🔒 Security Features

| Feature | Description |
|---------|-------------|
| **Expiry** | OTP codes expire after 10 minutes |
| **One-Time** | Each code can only be used once |
| **Rate Limiting** | Server-side rate limiting active |
| **Cleanup** | Expired codes auto-deleted hourly |
| **Logging** | All OTP attempts tracked in database |

---

## 🐛 Troubleshooting

### Problem: "Email credentials not configured"

**Solution**: Add `EMAIL_USER` and `EMAIL_PASS` to `.env` file

### Problem: "Invalid or expired OTP"

**Solutions**:
- Check if code expired (10 min limit)
- Verify email was entered correctly
- Check spam folder for email
- Try requesting a new code

### Problem: "Not receiving emails"

**Solutions**:
- Verify Gmail App Password is correct (no spaces)
- Check spam/junk folder
- Ensure 2FA is enabled on Gmail account
- Look for OTP in server console logs (development mode)

---

## 📊 Admin Endpoints

Monitor OTP usage:

```bash
# Get activity log (includes OTP sends)
GET /api/admin/activity

# Sample response:
{
  "success": true,
  "activity": [
    {
      "userId": 1,
      "action": "otp_sent",
      "email": "user@example.com",
      "createdAt": "2026-01-08T20:30:00Z"
    },
    {
      "userId": 1,
      "action": "login",
      "method": "otp",
      "createdAt": "2026-01-08T20:31:45Z"
    }
  ]
}
```

---

## 🎯 Next Steps

1. ✅ **Test OTP** locally with your Gmail
2. ✅ **Deploy to Render** with environment variables
3. ⏭️  **Upgrade to PostgreSQL** (next phase)
4. ⏭️  **Add SMS OTP** (optional - Twilio)

---

## 💡 Alternative Email Providers

If you don't want to use Gmail:

| Provider | Free Tier | Setup |
|----------|-----------|-------|
| **SendGrid** | 100 emails/day | Easy - API key |
| **Resend** | 3000 emails/month | Easy - API key |
| **Mailgun** | 5000 emails/month | Medium - API key |
| **AWS SES** | 3000 emails/month | Complex - AWS setup |

To switch, update `src/services/email-service.js` transporter config.

---

**Your ChemHelp app is now production-ready with enterprise-level security! 🎉**
