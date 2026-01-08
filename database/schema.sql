-- ChemHelp Database Schema
-- SQLite Database for user and structure persistence

-- Users Table
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    fullName TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    photo TEXT,
    lastLogin DATETIME,
    loginCount INTEGER DEFAULT 0,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Structures Table (saved molecules)
CREATE TABLE IF NOT EXISTS structures (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId INTEGER NOT NULL,
    name TEXT DEFAULT 'Unnamed Structure',
    data TEXT NOT NULL,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
);

-- Reactions Table (saved reactions)
CREATE TABLE IF NOT EXISTS reactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId INTEGER NOT NULL,
    reactionName TEXT NOT NULL,
    savedData TEXT NOT NULL,
    savedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
);

-- Compound Imports Table (track PubChem imports)
CREATE TABLE IF NOT EXISTS compound_imports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId INTEGER,
    cid INTEGER NOT NULL,
    compoundName TEXT,
    molecularFormula TEXT,
    molecularWeight REAL,
    ipAddress TEXT,
    userAgent TEXT,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE SET NULL
);

-- User Activity Log
CREATE TABLE IF NOT EXISTS activity_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId INTEGER,
    action TEXT NOT NULL,
    details TEXT,
    ipAddress TEXT,
    userAgent TEXT,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE SET NULL
);

-- OTP Codes Table (for login verification)
CREATE TABLE IF NOT EXISTS otp_codes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL,
    otp TEXT NOT NULL,
    expiresAt DATETIME NOT NULL,
    attempts INTEGER DEFAULT 0,
    verified BOOLEAN DEFAULT 0,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_structures_userId ON structures(userId);
CREATE INDEX IF NOT EXISTS idx_reactions_userId ON reactions(userId);
CREATE INDEX IF NOT EXISTS idx_compound_imports_userId ON compound_imports(userId);
CREATE INDEX IF NOT EXISTS idx_compound_imports_cid ON compound_imports(cid);
CREATE INDEX IF NOT EXISTS idx_activity_log_userId ON activity_log(userId);
CREATE INDEX IF NOT EXISTS idx_activity_log_action ON activity_log(action);
CREATE INDEX IF NOT EXISTS idx_otp_codes_email ON otp_codes(email);
CREATE INDEX IF NOT EXISTS idx_otp_codes_expiresAt ON otp_codes(expiresAt);
