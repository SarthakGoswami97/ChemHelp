// database/db.js - SQLite Database Helper Module
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

// Database file path
const DB_PATH = path.join(__dirname, 'chemhelp.db');
const SCHEMA_PATH = path.join(__dirname, 'schema.sql');

// Initialize database
let db;

function initDatabase() {
    return new Promise((resolve, reject) => {
        db = new sqlite3.Database(DB_PATH, (err) => {
            if (err) {
                console.error('❌ Error opening database:', err.message);
                reject(err);
            } else {
                console.log('✅ Connected to SQLite database:', DB_PATH);
                
                // Enable foreign keys
                db.run('PRAGMA foreign_keys = ON', (err) => {
                    if (err) {
                        console.error('❌ Error enabling foreign keys:', err);
                        reject(err);
                    } else {
                        // Initialize schema
                        initializeSchema()
                            .then(() => {
                                console.log('✅ Database schema initialized');
                                resolve(db);
                            })
                            .catch(reject);
                    }
                });
            }
        });
    });
}

function initializeSchema() {
    return new Promise((resolve, reject) => {
        const schema = fs.readFileSync(SCHEMA_PATH, 'utf-8');
        
        db.exec(schema, (err) => {
            if (err) {
                console.error('❌ Error creating tables:', err);
                reject(err);
            } else {
                console.log('✅ Tables created/verified');
                resolve();
            }
        });
    });
}

// ==================== USER FUNCTIONS ====================

function createUser(fullName, email, password, photo = null) {
    return new Promise((resolve, reject) => {
        // Hash password
        bcrypt.hash(password, 10, (err, hashedPassword) => {
            if (err) {
                reject(err);
                return;
            }

            const query = `
                INSERT INTO users (fullName, email, password, photo)
                VALUES (?, ?, ?, ?)
            `;

            db.run(query, [fullName, email, hashedPassword, photo], function(err) {
                if (err) {
                    if (err.message.includes('UNIQUE constraint failed')) {
                        reject(new Error('Email already exists'));
                    } else {
                        reject(err);
                    }
                } else {
                    resolve({
                        id: this.lastID,
                        fullName,
                        email,
                        photo,
                        createdAt: new Date().toISOString()
                    });
                }
            });
        });
    });
}

function getUserByEmail(email) {
    return new Promise((resolve, reject) => {
        const query = 'SELECT * FROM users WHERE email = ?';

        db.get(query, [email], (err, row) => {
            if (err) {
                reject(err);
            } else {
                resolve(row || null);
            }
        });
    });
}

function getUserById(id) {
    return new Promise((resolve, reject) => {
        const query = 'SELECT * FROM users WHERE id = ?';

        db.get(query, [id], (err, row) => {
            if (err) {
                reject(err);
            } else {
                resolve(row || null);
            }
        });
    });
}

function updateUserProfile(email, fullName, photo) {
    return new Promise((resolve, reject) => {
        const query = `
            UPDATE users
            SET fullName = ?, photo = ?, updatedAt = CURRENT_TIMESTAMP
            WHERE email = ?
        `;

        db.run(query, [fullName, photo, email], function(err) {
            if (err) {
                reject(err);
            } else if (this.changes === 0) {
                reject(new Error('User not found'));
            } else {
                resolve({ message: 'Profile updated successfully' });
            }
        });
    });
}

function verifyPassword(plainPassword, hashedPassword) {
    return new Promise((resolve, reject) => {
        bcrypt.compare(plainPassword, hashedPassword, (err, isMatch) => {
            if (err) {
                reject(err);
            } else {
                resolve(isMatch);
            }
        });
    });
}

// ==================== STRUCTURE FUNCTIONS ====================

function saveStructure(userId, name, data) {
    return new Promise((resolve, reject) => {
        const query = `
            INSERT INTO structures (userId, name, data)
            VALUES (?, ?, ?)
        `;

        db.run(query, [userId, name, JSON.stringify(data)], function(err) {
            if (err) {
                reject(err);
            } else {
                resolve({
                    id: this.lastID,
                    userId,
                    name,
                    createdAt: new Date().toISOString()
                });
            }
        });
    });
}

function getUserStructures(userId) {
    return new Promise((resolve, reject) => {
        const query = `
            SELECT id, userId, name, data, createdAt, updatedAt
            FROM structures
            WHERE userId = ?
            ORDER BY createdAt DESC
        `;

        db.all(query, [userId], (err, rows) => {
            if (err) {
                reject(err);
            } else {
                // Parse JSON data for each structure
                const structures = rows.map(row => ({
                    ...row,
                    data: JSON.parse(row.data)
                }));
                resolve(structures || []);
            }
        });
    });
}

function getStructureById(structureId) {
    return new Promise((resolve, reject) => {
        const query = 'SELECT * FROM structures WHERE id = ?';

        db.get(query, [structureId], (err, row) => {
            if (err) {
                reject(err);
            } else if (row) {
                row.data = JSON.parse(row.data);
                resolve(row);
            } else {
                resolve(null);
            }
        });
    });
}

function deleteStructure(structureId, userId) {
    return new Promise((resolve, reject) => {
        const query = 'DELETE FROM structures WHERE id = ? AND userId = ?';

        db.run(query, [structureId, userId], function(err) {
            if (err) {
                reject(err);
            } else if (this.changes === 0) {
                reject(new Error('Structure not found or unauthorized'));
            } else {
                resolve({ message: 'Structure deleted' });
            }
        });
    });
}

// ==================== REACTION FUNCTIONS ====================

function saveReaction(userId, reactionName, savedData) {
    return new Promise((resolve, reject) => {
        const query = `
            INSERT INTO reactions (userId, reactionName, savedData)
            VALUES (?, ?, ?)
        `;

        db.run(query, [userId, reactionName, JSON.stringify(savedData)], function(err) {
            if (err) {
                reject(err);
            } else {
                resolve({
                    id: this.lastID,
                    userId,
                    reactionName,
                    savedAt: new Date().toISOString()
                });
            }
        });
    });
}

function getUserReactions(userId) {
    return new Promise((resolve, reject) => {
        const query = `
            SELECT id, userId, reactionName, savedData, savedAt
            FROM reactions
            WHERE userId = ?
            ORDER BY savedAt DESC
        `;

        db.all(query, [userId], (err, rows) => {
            if (err) {
                reject(err);
            } else {
                const reactions = rows.map(row => ({
                    ...row,
                    savedData: JSON.parse(row.savedData)
                }));
                resolve(reactions || []);
            }
        });
    });
}

// ==================== UTILITY FUNCTIONS ====================

function getAllUsers() {
    return new Promise((resolve, reject) => {
        const query = 'SELECT id, fullName, email, createdAt FROM users';

        db.all(query, (err, rows) => {
            if (err) {
                reject(err);
            } else {
                resolve(rows || []);
            }
        });
    });
}

function getDatabaseStats() {
    return new Promise((resolve, reject) => {
        Promise.all([
            new Promise((res, rej) => {
                db.get('SELECT COUNT(*) as count FROM users', (err, row) => {
                    if (err) rej(err);
                    else res(row.count);
                });
            }),
            new Promise((res, rej) => {
                db.get('SELECT COUNT(*) as count FROM structures', (err, row) => {
                    if (err) rej(err);
                    else res(row.count);
                });
            }),
            new Promise((res, rej) => {
                db.get('SELECT COUNT(*) as count FROM reactions', (err, row) => {
                    if (err) rej(err);
                    else res(row.count);
                });
            })
        ])
            .then(([users, structures, reactions]) => {
                resolve({
                    users,
                    structures,
                    reactions,
                    databasePath: DB_PATH
                });
            })
            .catch(reject);
    });
}

// Export all functions
module.exports = {
    initDatabase,
    createUser,
    getUserByEmail,
    getUserById,
    updateUserProfile,
    verifyPassword,
    saveStructure,
    getUserStructures,
    getStructureById,
    deleteStructure,
    saveReaction,
    getUserReactions,
    getAllUsers,
    getDatabaseStats
};
