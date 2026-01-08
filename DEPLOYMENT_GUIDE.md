# ChemHelp Deployment Guide

## 🚀 Quick Start for Publication

### Prerequisites
- Node.js 14+ installed
- npm package manager
- Git (for version control)
- All environment variables configured

### Step 1: Environment Setup

Create or update `.env` file in project root:

```env
# Server Configuration
PORT=5000
NODE_ENV=production

# CORS Configuration
CORS_ORIGIN=https://yourdomain.com

# Database (if using external DB)
DATABASE_URL=your_database_url_here

# API Keys
GOOGLE_GENERATIVE_AI_KEY=your_gemini_api_key
OPENAI_API_KEY=your_openai_key_if_needed

# Optional: PubChem & ChemSpider
PUBCHEM_API_URL=https://pubchem.ncbi.nlm.nih.gov/rest/pug
```

### Step 2: Dependencies Installation

```bash
# Install all dependencies
npm install

# Verify installation
npm list
```

### Step 3: Database Initialization

```bash
# Database will auto-initialize on first run
# Check database/schema.sql for structure
node server.js

# Test that database is ready
# You should see: ✅ Database initialized successfully
```

### Step 4: Run Locally (Testing)

```bash
# Development mode with auto-reload
npm run dev

# Or production mode
npm start

# Server should start at http://localhost:5000
```

### Step 5: Verify All Features

#### Dark Mode Testing
1. Open http://localhost:5000
2. Login or create account
3. Click moon icon (🌓) in toolbar
4. Verify all UI elements properly themed:
   - [ ] Toolbar and sidebar
   - [ ] Canvas area
   - [ ] Buttons and modals
   - [ ] Grid visibility

#### Security Testing
1. Test rate limiting:
   ```bash
   # Make 101 requests in 60 seconds
   for i in {1..101}; do curl http://localhost:5000; done
   # Should see: {"error":"Too many requests"}
   ```

2. Test input validation:
   ```bash
   # Invalid email format
   curl -X POST http://localhost:5000/api/register \
     -H "Content-Type: application/json" \
     -d '{"email":"invalid","password":"test123","fullName":"Test"}'
   
   # Should see: {"error":"Invalid email address"}
   ```

3. Verify security headers:
   ```bash
   curl -I http://localhost:5000
   # Look for: Strict-Transport-Security, X-Content-Type-Options, etc.
   ```

### Step 6: Production Deployment

#### Option A: Traditional VPS/Server
```bash
# 1. Connect to your server
ssh user@your-server.com

# 2. Clone repository
git clone https://github.com/yourusername/ChemHelp.git
cd ChemHelp

# 3. Install dependencies
npm install --production

# 4. Set environment variables
nano .env  # Edit with your production values

# 5. Start with PM2 (process manager)
npm install -g pm2
pm2 start server.js --name "chemhelp"
pm2 save
pm2 startup

# 6. Setup Nginx reverse proxy
# (See Nginx configuration below)

# 7. Setup SSL with Let's Encrypt
sudo certbot certonly --standalone -d yourdomain.com
```

#### Nginx Configuration Example
```nginx
server {
    listen 443 ssl http2;
    server_name yourdomain.com;
    
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    
    # Security headers
    add_header Strict-Transport-Security "max-age=31536000" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    
    # Compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript;
    
    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}

# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name yourdomain.com;
    return 301 https://$server_name$request_uri;
}
```

#### Option B: Docker Deployment
```bash
# Build Docker image
docker build -t chemhelp:latest .

# Run container
docker run -d \
  --name chemhelp \
  -p 5000:5000 \
  -e NODE_ENV=production \
  -e CORS_ORIGIN=https://yourdomain.com \
  -e GOOGLE_GENERATIVE_AI_KEY=your_key \
  chemhelp:latest

# View logs
docker logs -f chemhelp
```

#### Option C: Heroku Deployment
```bash
# Login to Heroku
heroku login

# Create app
heroku create your-app-name

# Set environment variables
heroku config:set NODE_ENV=production
heroku config:set GOOGLE_GENERATIVE_AI_KEY=your_key

# Deploy
git push heroku main

# View logs
heroku logs --tail
```

#### Option D: Vercel/Netlify (Frontend only)
```bash
# Build static files
npm run build

# Deploy to Vercel
vercel --prod
```

### Step 7: Monitoring & Maintenance

#### Setup Error Tracking
```javascript
// Add to server.js if using Sentry
const Sentry = require("@sentry/node");
Sentry.init({ dsn: "your-sentry-dsn" });
```

#### Monitor Logs
```bash
# PM2
pm2 logs chemhelp

# Systemd
journalctl -u chemhelp -f

# Docker
docker logs -f chemhelp
```

#### Database Backups
```bash
# Backup SQLite database
cp database/chemistry.db backups/chemistry_$(date +%Y%m%d_%H%M%S).db

# Or setup automated backups
0 2 * * * cp database/chemistry.db backups/chemistry_$(date +\%Y\%m\%d).db
```

---

## 🔐 Security Checklist Before Going Live

- [ ] All environment variables set
- [ ] SSL/TLS certificate installed
- [ ] CORS origin configured correctly
- [ ] Rate limiting tested
- [ ] Security headers verified
- [ ] Input validation tested
- [ ] Sensitive error messages removed
- [ ] Database permissions restricted
- [ ] File permissions secured (600 for db, 644 for web files)
- [ ] Regular backups configured
- [ ] Monitoring and alerts set up
- [ ] DDoS protection enabled (if using CDN)

---

## 📊 Performance Optimization

### Frontend
- Enable gzip compression in Nginx
- Minify CSS and JavaScript
- Cache static assets (1 year for hashed files)
- Lazy load images
- Use CDN for static files

### Backend
- Use connection pooling for database
- Implement caching for frequently accessed data
- Monitor slow queries
- Use indexes on frequently queried columns

### Monitoring Queries
```bash
# Check Nginx performance
tail -f /var/log/nginx/access.log | grep -E "response time|upstream"

# Monitor Node.js memory
ps aux | grep node

# Check database performance
sqlite3 database/chemistry.db ".timer on" "SELECT COUNT(*) FROM users;"
```

---

## 🐛 Troubleshooting

### Dark Mode Not Working
1. Check browser localStorage: `localStorage.getItem('chemhelp_darkMode')`
2. Verify CSS is loaded: DevTools > Network > styles.css
3. Check JavaScript errors: DevTools > Console
4. Clear browser cache and hard refresh (Ctrl+Shift+R)

### Rate Limiting Issues
- Check IP detection: `console.log(req.ip)`
- Adjust RATE_LIMIT constant in server.js
- Consider using `express-rate-limit` package for production

### Database Not Initializing
1. Check SQLite is installed: `sqlite3 --version`
2. Verify database permissions: `ls -la database/`
3. Check logs for detailed error
4. Try manual initialization: `node -e "require('./database/db').initDatabase()"`

### API Endpoints Not Responding
1. Verify server is running: `curl localhost:5000`
2. Check for CORS errors in browser console
3. Verify .env variables are set
4. Check firewall rules allow port 5000

---

## 📈 Post-Launch Checklist

- [ ] Monitor error rates for first 24 hours
- [ ] Check user registration/login success rate
- [ ] Verify dark mode usage percentage
- [ ] Monitor API response times
- [ ] Check rate limit hit frequency
- [ ] Review security logs
- [ ] Plan Phase 1 feature implementation
- [ ] Schedule post-launch review meeting

---

## 🎯 Success Metrics

**Target for Launch Week:**
- Zero critical errors
- <2% 5xx error rate
- <500ms API response time
- 95%+ uptime
- 0 security incidents

**Monthly KPIs:**
- User growth rate
- Feature adoption (especially dark mode)
- Error rate trending down
- Rate limiting effective

---

## 📞 Support & Escalation

### Common Issues Quick Links
1. Dark mode: See Troubleshooting > Dark Mode
2. Performance: See Performance Optimization
3. Security: See Security Checklist
4. Database: Check database/schema.sql

### Escalation Path
1. Check logs first
2. Review recent code changes
3. Test in development environment
4. Roll back if necessary
5. Document incident

---

## 🚀 Ready to Launch!

All systems are ready for production. Once you've completed this checklist and verified all features, you're good to go!

**Estimated Time to Production**: 30-60 minutes (depending on hosting choice)

Good luck! 🎉
