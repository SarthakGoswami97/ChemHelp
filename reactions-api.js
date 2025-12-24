// ==================== REACTIONS API ROUTES ====================

const fs = require('fs');
const path = require('path');

// Load reactions database
const reactionsDb = JSON.parse(fs.readFileSync(path.join(__dirname, 'reactions.json'), 'utf-8'));

module.exports = function setupReactionsRoutes(app) {
    
    // ===== GET ALL REACTIONS =====
    app.get('/api/reactions', (req, res) => {
        try {
            const { category, difficulty, search } = req.query;
            let filtered = [...reactionsDb];
            
            if (category && category !== 'all') {
                filtered = filtered.filter(r => r.category === category);
            }
            
            if (difficulty && difficulty !== 'all') {
                filtered = filtered.filter(r => r.difficulty === difficulty);
            }
            
            if (search) {
                const searchLower = search.toLowerCase();
                filtered = filtered.filter(r => 
                    r.name.toLowerCase().includes(searchLower) ||
                    r.description.toLowerCase().includes(searchLower)
                );
            }
            
            res.json({
                total: filtered.length,
                reactions: filtered
            });
        } catch (error) {
            console.error('Error fetching reactions:', error);
            res.status(500).json({ error: 'Failed to fetch reactions' });
        }
    });
    
    // ===== GET SINGLE REACTION =====
    app.get('/api/reactions/:reactionId', (req, res) => {
        try {
            const { reactionId } = req.params;
            const reaction = reactionsDb.find(r => r.id === reactionId);
            
            if (!reaction) {
                return res.status(404).json({ error: 'Reaction not found' });
            }
            
            res.json(reaction);
        } catch (error) {
            console.error('Error fetching reaction:', error);
            res.status(500).json({ error: 'Failed to fetch reaction' });
        }
    });
    
    // ===== GET REACTION CATEGORIES =====
    app.get('/api/reactions/categories/list', (req, res) => {
        try {
            const categories = [...new Set(reactionsDb.map(r => r.category))];
            const difficulties = [...new Set(reactionsDb.map(r => r.difficulty))];
            
            res.json({
                categories,
                difficulties
            });
        } catch (error) {
            console.error('Error fetching categories:', error);
            res.status(500).json({ error: 'Failed to fetch categories' });
        }
    });
    
    // ===== VALIDATE REACTANT STRUCTURE =====
    // Checks which reactions the current structure can undergo
    app.post('/api/reactions/validate', (req, res) => {
        try {
            const { nodes, bonds } = req.body;
            
            if (!Array.isArray(nodes) || !Array.isArray(bonds)) {
                return res.status(400).json({ error: 'Invalid structure format' });
            }
            
            // Basic validation - check for double bonds, alcohols, etc.
            const validation = validateStructure(nodes, bonds);
            
            // Find applicable reactions based on structure
            const applicableReactions = reactionsDb.filter(reaction => {
                return isReactionApplicable(reaction, validation);
            });
            
            res.json({
                structureAnalysis: validation,
                applicableReactions: applicableReactions.map(r => ({
                    id: r.id,
                    name: r.name,
                    category: r.category,
                    difficulty: r.difficulty
                })),
                totalApplicable: applicableReactions.length
            });
        } catch (error) {
            console.error('Error validating structure:', error);
            res.status(500).json({ error: 'Failed to validate structure' });
        }
    });
    
    // ===== PREDICT REACTION PRODUCTS =====
    app.post('/api/reactions/predict', (req, res) => {
        try {
            const { nodes, bonds, reactionId } = req.body;
            
            if (!reactionId || !reactionsDb.find(r => r.id === reactionId)) {
                return res.status(400).json({ error: 'Invalid reaction ID' });
            }
            
            const reaction = reactionsDb.find(r => r.id === reactionId);
            const products = predictProducts(nodes, bonds, reaction);
            
            res.json({
                reaction: {
                    id: reaction.id,
                    name: reaction.name,
                    equation: reaction.equation
                },
                reactant: { nodes, bonds },
                products: products,
                mechanism: reaction.mechanism,
                conditions: reaction.conditions
            });
        } catch (error) {
            console.error('Error predicting products:', error);
            res.status(500).json({ error: 'Failed to predict products' });
        }
    });
    
    // ===== SAVE REACTION TO USER PROFILE =====
    app.post('/api/user/:email/save-reaction', (req, res) => {
        try {
            const { email } = req.params;
            const { reactant, reactionId, products } = req.body;
            
            const USERS_FILE = path.join(__dirname, 'users.json');
            let users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf-8'));
            const userIndex = users.findIndex(u => u.email === email);
            
            if (userIndex === -1) {
                return res.status(404).json({ error: 'User not found' });
            }
            
            if (!users[userIndex].reactions) {
                users[userIndex].reactions = [];
            }
            
            const reactionRecord = {
                id: Date.now(),
                reactionId,
                reactionName: reactionsDb.find(r => r.id === reactionId)?.name,
                reactant,
                products,
                performedAt: new Date().toISOString()
            };
            
            users[userIndex].reactions.push(reactionRecord);
            fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
            
            res.json({
                success: true,
                message: 'Reaction saved to profile',
                totalReactions: users[userIndex].reactions.length
            });
        } catch (error) {
            console.error('Error saving reaction:', error);
            res.status(500).json({ error: 'Failed to save reaction' });
        }
    });
    
    // ===== GET USER REACTION HISTORY =====
    app.get('/api/user/:email/reactions', (req, res) => {
        try {
            const { email } = req.params;
            const USERS_FILE = path.join(__dirname, 'users.json');
            let users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf-8'));
            const user = users.find(u => u.email === email);
            
            if (!user) {
                return res.status(404).json({ error: 'User not found' });
            }
            
            res.json({
                reactions: user.reactions || [],
                total: (user.reactions || []).length
            });
        } catch (error) {
            console.error('Error fetching reactions:', error);
            res.status(500).json({ error: 'Failed to fetch reactions' });
        }
    });
};

// ==================== HELPER FUNCTIONS ====================

/**
 * Analyzes structure to identify functional groups and bonds
 */
function validateStructure(nodes, bonds) {
    const analysis = {
        hasDoubleBond: false,
        hasTripleBond: false,
        hasAlcohol: false,
        hasAldehydeOrKetone: false,
        hasCarboxylicAcid: false,
        hasAlkylHalide: false,
        carbonCount: 0,
        hydrogenCount: 0,
        heteroatoms: []
    };
    
    // Count elements
    for (const node of nodes) {
        if (node.label === 'C') analysis.carbonCount++;
        if (node.label === 'H') analysis.hydrogenCount++;
        if (['O', 'N', 'X', 'Cl', 'Br', 'I', 'F'].includes(node.label)) {
            if (!analysis.heteroatoms.includes(node.label)) {
                analysis.heteroatoms.push(node.label);
            }
        }
    }
    
    // Check for bonds
    for (const bond of bonds) {
        if (bond.order === 2) analysis.hasDoubleBond = true;
        if (bond.order === 3) analysis.hasTripleBond = true;
    }
    
    // Check for functional groups (simplified)
    // In a real implementation, you'd do more complex pattern matching
    analysis.hasAlcohol = analysis.heteroatoms.includes('O') && analysis.carbonCount > 0;
    analysis.hasAldehydeOrKetone = analysis.hasDoubleBond && analysis.heteroatoms.includes('O');
    analysis.hasCarboxylicAcid = analysis.heteroatoms.includes('O') && analysis.hasDoubleBond;
    
    return analysis;
}

/**
 * Determines if a reaction is applicable to the given structure
 */
function isReactionApplicable(reaction, structureAnalysis) {
    const pattern = reaction.pattern || {};
    
    if (pattern.requiresDoubleBond && !structureAnalysis.hasDoubleBond) return false;
    if (pattern.requiresTripleBond && !structureAnalysis.hasTripleBond) return false;
    if (pattern.requiresAlcohol && !structureAnalysis.hasAlcohol) return false;
    if (pattern.requiresAldehydeOrKetone && !structureAnalysis.hasAldehydeOrKetone) return false;
    if (pattern.requiresCarboxylic && !structureAnalysis.hasCarboxylicAcid) return false;
    if (pattern.requiresCarbon && structureAnalysis.carbonCount === 0) return false;
    
    return true;
}

/**
 * Predicts reaction products based on reaction type
 * This is a simplified implementation - real chemistry is more complex
 */
function predictProducts(nodes, bonds, reaction) {
    // For now, return a generic product structure
    // In a real implementation, you'd implement specific transformation logic
    // for each reaction type
    
    let productNodes = JSON.parse(JSON.stringify(nodes));
    let productBonds = JSON.parse(JSON.stringify(bonds));
    
    // Apply reaction-specific transformations
    switch (reaction.id) {
        case 'hydrogenation':
            productNodes = applyHydrogenation(productNodes, productBonds);
            break;
        case 'dehydration_alcohol':
            productNodes = applyDehydration(productNodes, productBonds);
            break;
        case 'combustion':
            return { nodes: [], bonds: [], note: 'Combustion produces CO2 and H2O' };
        default:
            break;
    }
    
    return {
        nodes: productNodes,
        bonds: productBonds,
        note: 'Product prediction - structure may need adjustment'
    };
}

function applyHydrogenation(nodes, bonds) {
    // Find double bonds and convert to single
    // This is simplified - real implementation would be more complex
    return nodes;
}

function applyDehydration(nodes, bonds) {
    // Find OH groups and create double bonds
    // This is simplified
    return nodes;
}
