// Load environment variables first
require('dotenv').config();

const express = require('express');
const path = require('path');
const fs = require('fs');
const app = express();
const PORT = process.env.PORT || 5000;

// Database module
const db = require('./database/db');

// AI Services
const aiRoutes = require('./src/api/ai-routes');

// ============= SECURITY MIDDLEWARE =============
// Add security headers
app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; connect-src 'self' https://pubchem.ncbi.nlm.nih.gov;");
    res.setHeader('Access-Control-Allow-Origin', process.env.CORS_ORIGIN || '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    next();
});

// Rate limiting middleware (simple in-memory, for production use express-rate-limit)
const requestCounts = new Map();
const RATE_LIMIT = 100;
const RATE_WINDOW = 60000; // 1 minute

app.use((req, res, next) => {
    const ip = req.ip || req.connection.remoteAddress;
    const now = Date.now();
    
    if (!requestCounts.has(ip)) {
        requestCounts.set(ip, []);
    }
    
    const requests = requestCounts.get(ip).filter(time => now - time < RATE_WINDOW);
    
    if (requests.length >= RATE_LIMIT) {
        return res.status(429).json({ error: 'Too many requests, please try again later' });
    }
    
    requests.push(now);
    requestCounts.set(ip, requests);
    
    // Cleanup old entries
    if (requestCounts.size > 10000) {
        for (const [key, times] of requestCounts.entries()) {
            if (times.length === 0 || now - times[times.length - 1] > RATE_WINDOW) {
                requestCounts.delete(key);
            }
        }
    }
    
    next();
});

// Middleware - increase limit for base64 image uploads
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Serve static files from public folder
app.use(express.static(path.join(__dirname, 'public')));
app.use('/css', express.static(path.join(__dirname, 'public', 'css')));
app.use('/js', express.static(path.join(__dirname, 'public', 'js')));

// Initialize database on startup
let dbReady = false;
let dbInstance = null;

db.initDatabase()
    .then((database) => {
        dbReady = true;
        dbInstance = database;
        console.log('✅ Database initialized successfully');
    })
    .catch(err => {
        console.error('❌ Failed to initialize database:', err);
        process.exit(1);
    });

// Middleware to check if database is ready
app.use((req, res, next) => {
    if (!dbReady && !req.path.includes('*.') && req.path !== '/' && req.path !== '/index.html') {
        return res.status(503).json({ error: 'Database not ready yet' });
    }
    next();
});

// AI API Routes
app.use('/api/ai', aiRoutes);

// ============= PubChem Proxy API =============
// Proxy endpoint for PubChem searches to bypass CORS
app.get('/api/pubchem/search', async (req, res) => {
    try {
        const query = req.query.q;
        if (!query) {
            return res.status(400).json({ error: 'Query parameter required' });
        }

        const endpoint = `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/${encodeURIComponent(query)}/cids/JSON`;
        console.log('🔍 PubChem proxy search:', endpoint);

        const response = await fetch(endpoint, {
            method: 'GET',
            headers: { 'Accept': 'application/json' }
        });

        if (!response.ok) {
            return res.status(response.status).json({ error: `PubChem API error: ${response.status}` });
        }

        const data = await response.json();
        res.json(data);
    } catch (error) {
        console.error('❌ PubChem proxy error:', error);
        res.status(500).json({ error: 'Failed to fetch from PubChem', details: error.message });
    }
});

// Proxy endpoint for getting compound info
app.get('/api/pubchem/compound/:cid', async (req, res) => {
    try {
        const cid = req.params.cid;
        if (!/^\d+$/.test(cid)) {
            return res.status(400).json({ error: 'Invalid CID format' });
        }

        const endpoint = `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/${cid}/JSON`;
        console.log('📦 PubChem proxy compound info:', endpoint);

        const response = await fetch(endpoint, {
            method: 'GET',
            headers: { 'Accept': 'application/json' }
        });

        if (!response.ok) {
            return res.status(response.status).json({ error: `PubChem API error: ${response.status}` });
        }

        const data = await response.json();
        res.json(data);
    } catch (error) {
        console.error('❌ PubChem proxy error:', error);
        res.status(500).json({ error: 'Failed to fetch compound from PubChem', details: error.message });
    }
});

// Storage file for saved structures (kept for backward compatibility)
const DATA_FILE = path.join(__dirname, 'savedData.json');

// Initialize data file if it doesn't exist
function initDataFile() {
    if (!fs.existsSync(DATA_FILE)) {
        fs.writeFileSync(DATA_FILE, JSON.stringify({ nodes: [], bonds: [] }));
    }
}

initDataFile();

// API endpoint to save data
app.post('/api/save', (req, res) => {
    try {
        const { nodes, bonds } = req.body;
        
        if (!Array.isArray(nodes) || !Array.isArray(bonds)) {
            return res.status(400).json({ error: 'Invalid data format' });
        }
        
        if (nodes.length > 10000 || bonds.length > 50000) {
            return res.status(413).json({ error: 'Data too large' });
        }
        
        // Validate node structure
        for (const node of nodes) {
            if (typeof node.x !== 'number' || typeof node.y !== 'number' || typeof node.label !== 'string') {
                return res.status(400).json({ error: 'Invalid node structure' });
            }
        }
        
        // Validate bond structure
        for (const bond of bonds) {
            if (typeof bond.source !== 'number' || typeof bond.target !== 'number' || typeof bond.type !== 'string') {
                return res.status(400).json({ error: 'Invalid bond structure' });
            }
        }
        
        const data = { nodes, bonds, savedAt: new Date().toISOString() };
        fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
        
        res.json({ success: true, message: 'Data saved successfully' });
    } catch (error) {
        console.error('Error saving data:', error);
        res.status(500).json({ error: 'Failed to save data' });
    }
});

// API endpoint to load data
app.get('/api/load', (req, res) => {
    try {
        if (fs.existsSync(DATA_FILE)) {
            const data = fs.readFileSync(DATA_FILE, 'utf-8');
            res.setHeader('Content-Type', 'application/json');
            res.send(data);
        } else {
            res.json({ nodes: [], bonds: [] });
        }
    } catch (error) {
        console.error('Error loading data:', error);
        res.status(500).json({ error: 'Failed to load data', details: error.message });
    }
});

// User authentication routes
const USERS_FILE = path.join(__dirname, 'users.json');

// Keep for backward compatibility
function initUsersFile() {
    if (!fs.existsSync(USERS_FILE)) {
        fs.writeFileSync(USERS_FILE, JSON.stringify([]));
    }
}

initUsersFile();

// API endpoint to register new user
app.post('/api/register', async (req, res) => {
    try {
        const { fullName, email, password } = req.body;
        
        // Input validation
        if (!fullName || !email || !password) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        
        if (typeof fullName !== 'string' || fullName.trim().length < 2) {
            return res.status(400).json({ error: 'Full name must be at least 2 characters' });
        }
        
        if (typeof email !== 'string' || !email.includes('@') || email.length > 255) {
            return res.status(400).json({ error: 'Invalid email address' });
        }
        
        if (typeof password !== 'string' || password.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters' });
        }
        
        // Create user with database
        const newUser = await db.createUser(fullName.trim(), email.toLowerCase(), password, null);
        
        res.status(201).json({ success: true, message: 'User registered successfully', user: newUser });
    } catch (error) {
        console.error('Error registering user:', error.message);
        
        if (error.message.includes('Email already exists')) {
            return res.status(409).json({ error: 'Email already exists' });
        }
        
        res.status(500).json({ error: 'Failed to register user' });
    }
});

// API endpoint to login user
app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        // Input validation
        if (!email || !password) {
            return res.status(400).json({ error: 'Missing email or password' });
        }
        
        if (typeof email !== 'string' || typeof password !== 'string') {
            return res.status(400).json({ error: 'Invalid input format' });
        }
        
        const user = await db.getUserByEmail(email.toLowerCase());
        
        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        // Verify password
        const isPasswordValid = await db.verifyPassword(password, user.password);
        
        if (!isPasswordValid) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        // Track login
        try {
            await db.updateUserLogin(user.id);
            await db.logActivity(user.id, 'login', { email: user.email });
        } catch (trackErr) {
            console.error('Failed to track login:', trackErr.message);
        }
        
        // Return user data without password
        const { password: _, ...userProfile } = user;
        res.json({ success: true, user: userProfile });
    } catch (error) {
        console.error('Error logging in:', error.message);
        res.status(500).json({ error: 'Login failed', details: error.message });
    }
});

// API endpoint to get user profile
app.get('/api/user/:email', async (req, res) => {
    try {
        const { email } = req.params;
        const user = await db.getUserByEmail(email);
        
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        // Get user structures
        const structures = await db.getUserStructures(user.id);
        const reactions = await db.getUserReactions(user.id);
        
        // Don't send password
        const { password, ...userProfile } = user;
        res.json({
            ...userProfile,
            structures,
            reactions
        });
    } catch (error) {
        console.error('Error fetching user:', error.message);
        res.status(500).json({ error: 'Failed to fetch user profile', details: error.message });
    }
});

// API endpoint to update user profile
app.post('/api/user/:email/profile-update', async (req, res) => {
    try {
        const { email } = req.params;
        const { fullName, photo } = req.body;
        
        // Check if user exists
        const user = await db.getUserByEmail(email);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        // Update profile
        await db.updateUserProfile(email, fullName || user.fullName, photo || user.photo);
        
        // Get updated user
        const updatedUser = await db.getUserByEmail(email);
        const { password, ...userProfile } = updatedUser;
        
        res.json({ success: true, user: userProfile });
    } catch (error) {
        console.error('Error updating user:', error.message);
        res.status(500).json({ error: 'Failed to update user profile', details: error.message });
    }
});

// API endpoint to save a structure for user
app.post('/api/user/:email/save-structure', async (req, res) => {
    try {
        const { email } = req.params;
        const { name, nodes, bonds } = req.body;
        
        const user = await db.getUserByEmail(email);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        const structureData = {
            nodes,
            bonds,
            savedAt: new Date().toISOString()
        };
        
        const structure = await db.saveStructure(user.id, name || 'Untitled Structure', structureData);
        const structures = await db.getUserStructures(user.id);
        
        res.json({ success: true, structure, totalStructures: structures.length });
    } catch (error) {
        console.error('Error saving structure:', error.message);
        res.status(500).json({ error: 'Failed to save structure', details: error.message });
    }
});

// API endpoint to get user structures
app.get('/api/user/:email/structures', async (req, res) => {
    try {
        const { email } = req.params;
        const user = await db.getUserByEmail(email);
        
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        const structures = await db.getUserStructures(user.id);
        res.json({ structures });
    } catch (error) {
        console.error('Error fetching structures:', error.message);
        res.status(500).json({ error: 'Failed to fetch structures', details: error.message });
    }
});

// ==================== SETUP REACTIONS API ====================
const setupReactionsRoutes = require('./src/api/reactions-api');
setupReactionsRoutes(app);

// Root route handler - serve index.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Login page
app.get('/login.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// ============= ADMIN API ENDPOINTS =============

// Get all users (admin)
app.get('/api/admin/users', async (req, res) => {
    try {
        const users = await db.getAllUsers();
        res.json({ success: true, users: users.map(u => {
            const { password, ...userWithoutPassword } = u;
            return userWithoutPassword;
        })});
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch users', details: error.message });
    }
});

// Get compound imports (admin)
app.get('/api/admin/compound-imports', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 100;
        const imports = await db.getCompoundImports(limit);
        res.json({ success: true, imports });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch imports', details: error.message });
    }
});

// Get activity log (admin)
app.get('/api/admin/activity', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 100;
        const action = req.query.action || null;
        const activities = await db.getActivityLog(limit, action);
        res.json({ success: true, activities });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch activity log', details: error.message });
    }
});

// Get popular compounds (admin)
app.get('/api/admin/popular-compounds', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 20;
        const compounds = await db.getPopularCompounds(limit);
        res.json({ success: true, compounds });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch popular compounds', details: error.message });
    }
});

// Get database stats (admin)
app.get('/api/admin/stats', async (req, res) => {
    try {
        const stats = await db.getDatabaseStats();
        res.json({ success: true, stats });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch stats', details: error.message });
    }
});

// Get user stats (admin)
app.get('/api/admin/user/:userId/stats', async (req, res) => {
    try {
        const userId = parseInt(req.params.userId);
        const stats = await db.getUserStats(userId);
        res.json({ success: true, stats });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch user stats', details: error.message });
    }
});

// Track compound import
app.post('/api/track/compound-import', async (req, res) => {
    try {
        const { userId, cid, compoundName, molecularFormula, molecularWeight } = req.body;
        const ipAddress = req.ip || req.connection.remoteAddress;
        const userAgent = req.get('User-Agent');
        
        await db.trackCompoundImport(userId, cid, compoundName, molecularFormula, molecularWeight, ipAddress, userAgent);
        res.json({ success: true });
    } catch (error) {
        console.error('Error tracking import:', error);
        res.status(500).json({ error: 'Failed to track import' });
    }
});

// Catch-all for 404s - serve index.html for client-side routing
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server - only after app is fully configured
const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`🧪 ChemHelp server running at http://localhost:${PORT}`);
});
