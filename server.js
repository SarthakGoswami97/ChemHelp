const express = require('express');
const path = require('path');
const fs = require('fs');
const app = express();
const PORT = process.env.PORT || 5000;

// Database module
const db = require('./database/db');

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname)));

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
        
        const data = { nodes, bonds, savedAt: new Date().toISOString() };
        fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
        
        res.json({ success: true, message: 'Data saved successfully' });
    } catch (error) {
        console.error('Error saving data:', error);
        res.status(500).json({ error: 'Failed to save data', details: error.message });
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
        
        if (!fullName || !email || !password) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        
        // Create user with database
        const newUser = await db.createUser(fullName, email, password, null);
        
        res.status(201).json({ success: true, message: 'User registered successfully', user: newUser });
    } catch (error) {
        console.error('Error registering user:', error.message);
        
        if (error.message.includes('Email already exists')) {
            return res.status(409).json({ error: 'Email already exists' });
        }
        
        res.status(500).json({ error: 'Failed to register user', details: error.message });
    }
});

// API endpoint to login user
app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        if (!email || !password) {
            return res.status(400).json({ error: 'Missing email or password' });
        }
        
        const user = await db.getUserByEmail(email);
        
        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        // Verify password
        const isPasswordValid = await db.verifyPassword(password, user.password);
        
        if (!isPasswordValid) {
            return res.status(401).json({ error: 'Invalid credentials' });
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
const setupReactionsRoutes = require('./reactions-api');
setupReactionsRoutes(app);

// Root route handler - serve index.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Catch-all for 404s - serve index.html for client-side routing
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Start server - only after app is fully configured
const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`🧪 ChemHelp server running at http://localhost:${PORT}`);
});
