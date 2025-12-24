const express = require('express');
const path = require('path');
const fs = require('fs');
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// Serve static files with proper MIME types
app.use(express.static(path.join(__dirname), {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.js')) {
      res.setHeader('Content-Type', 'application/javascript');
    }
    if (filePath.endsWith('.css')) {
      res.setHeader('Content-Type', 'text/css');
    }
    if (filePath.endsWith('.html')) {
      res.setHeader('Content-Type', 'text/html');
    }
  }
}));

// Storage file for saved structures
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

// User profiles storage file
const USERS_FILE = path.join(__dirname, 'users.json');

// Initialize users file if it doesn't exist
function initUsersFile() {
    if (!fs.existsSync(USERS_FILE)) {
        fs.writeFileSync(USERS_FILE, JSON.stringify([]));
    }
}

initUsersFile();

// API endpoint to register new user
app.post('/api/register', (req, res) => {
    try {
        const { fullName, email, password } = req.body;
        
        if (!fullName || !email || !password) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        
        let users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf-8'));
        
        // Check if user already exists
        if (users.find(u => u.email === email)) {
            return res.status(409).json({ error: 'User already exists' });
        }
        
        const newUser = {
            id: Date.now(),
            fullName,
            email,
            password, // In production, hash this!
            createdAt: new Date().toISOString(),
            structures: [],
            preferences: {
                theme: 'light',
                showImplicitH: true
            }
        };
        
        users.push(newUser);
        fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
        
        res.status(201).json({ success: true, message: 'User registered successfully' });
    } catch (error) {
        console.error('Error registering user:', error);
        res.status(500).json({ error: 'Failed to register user' });
    }
});

// API endpoint to get user profile
app.get('/api/user/:email', (req, res) => {
    try {
        const { email } = req.params;
        const users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf-8'));
        const user = users.find(u => u.email === email);
        
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        // Don't send password
        const { password, ...userProfile } = user;
        res.json(userProfile);
    } catch (error) {
        console.error('Error fetching user:', error);
        res.status(500).json({ error: 'Failed to fetch user profile' });
    }
});

// API endpoint to update user profile
app.post('/api/user/:email/update', (req, res) => {
    try {
        const { email } = req.params;
        const { fullName, preferences } = req.body;
        
        let users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf-8'));
        const userIndex = users.findIndex(u => u.email === email);
        
        if (userIndex === -1) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        // Update allowed fields
        if (fullName) users[userIndex].fullName = fullName;
        if (preferences) users[userIndex].preferences = { ...users[userIndex].preferences, ...preferences };
        users[userIndex].updatedAt = new Date().toISOString();
        
        fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
        
        const { password, ...userProfile } = users[userIndex];
        res.json({ success: true, user: userProfile });
    } catch (error) {
        console.error('Error updating user:', error);
        res.status(500).json({ error: 'Failed to update user profile' });
    }
});

// API endpoint to save a structure for user
app.post('/api/user/:email/save-structure', (req, res) => {
    try {
        const { email } = req.params;
        const { name, nodes, bonds } = req.body;
        
        let users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf-8'));
        const userIndex = users.findIndex(u => u.email === email);
        
        if (userIndex === -1) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        if (!users[userIndex].structures) {
            users[userIndex].structures = [];
        }
        
        const structure = {
            id: Date.now(),
            name: name || `Structure ${users[userIndex].structures.length + 1}`,
            nodes,
            bonds,
            createdAt: new Date().toISOString()
        };
        
        users[userIndex].structures.push(structure);
        fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
        
        res.json({ success: true, structure, totalStructures: users[userIndex].structures.length });
    } catch (error) {
        console.error('Error saving structure:', error);
        res.status(500).json({ error: 'Failed to save structure' });
    }
});

// API endpoint to get user structures
app.get('/api/user/:email/structures', (req, res) => {
    try {
        const { email } = req.params;
        const users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf-8'));
        const user = users.find(u => u.email === email);
        
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        res.json({ structures: user.structures || [] });
    } catch (error) {
        console.error('Error fetching structures:', error);
        res.status(500).json({ error: 'Failed to fetch structures' });
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

// Start server
app.listen(PORT, () => {
    console.log(`🧪 ChemHelp server running at http://localhost:${PORT}`);
});

module.exports = app;
