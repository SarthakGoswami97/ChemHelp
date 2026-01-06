/**
 * Gemini AI Service for ChemHelp
 * Handles all interactions with Google's Gemini API
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');
const { config, validateConfig } = require('../config/ai-config');

let genAI = null;
let model = null;
let visionModel = null;

// Initialize Gemini client
function initialize() {
    if (!validateConfig()) {
        return false;
    }
    
    try {
        genAI = new GoogleGenerativeAI(config.gemini.apiKey);
        model = genAI.getGenerativeModel({ model: config.gemini.model });
        visionModel = genAI.getGenerativeModel({ model: config.gemini.visionModel });
        console.log('✅ Gemini AI service initialized');
        return true;
    } catch (error) {
        console.error('❌ Failed to initialize Gemini:', error.message);
        return false;
    }
}

// Simple in-memory cache
const cache = new Map();

function getCached(key) {
    if (!config.cache.enabled) return null;
    const cached = cache.get(key);
    if (cached && Date.now() - cached.timestamp < config.cache.ttlSeconds * 1000) {
        return cached.data;
    }
    cache.delete(key);
    return null;
}

function setCache(key, data) {
    if (!config.cache.enabled) return;
    cache.set(key, { data, timestamp: Date.now() });
}

/**
 * Generate IUPAC name and properties for a chemical structure
 * @param {Object} structureData - { nodes: [...], bonds: [...] }
 * @returns {Object} - { name, iupacName, formula, properties, ... }
 */
async function nameStructure(structureData) {
    if (!model) {
        if (!initialize()) {
            throw new Error('Gemini AI not initialized. Please check your API key.');
        }
    }
    
    // Create cache key from structure
    const cacheKey = `name_${JSON.stringify(structureData)}`;
    const cached = getCached(cacheKey);
    if (cached) {
        console.log('📦 Returning cached naming result');
        return cached;
    }
    
    // Build structure description for AI
    const structureDescription = buildStructureDescription(structureData);
    
    const prompt = `You are an expert chemist. Analyze this chemical structure and provide accurate naming and properties.

STRUCTURE DATA:
${structureDescription}

Provide a JSON response with EXACTLY this format (no markdown, just pure JSON):
{
    "iupacName": "the systematic IUPAC name",
    "commonNames": ["list of common/trivial names if any"],
    "formula": "molecular formula with subscripts like C₂H₆O",
    "molecularWeight": number,
    "functionalGroups": ["list of functional groups present"],
    "classification": "compound class (e.g., Alcohol, Alkane, Carboxylic Acid)",
    "properties": {
        "polarity": "Polar/Nonpolar/Slightly Polar",
        "acidity": "Acidic/Basic/Neutral/Amphoteric",
        "pH": number between 0-14,
        "reactivity": "High/Moderate/Low/Stable",
        "solubility": "Soluble in water/Insoluble/Slightly soluble"
    },
    "description": "brief 1-2 sentence description of the compound"
}

IMPORTANT: 
- Return ONLY valid JSON, no explanations or markdown
- Use proper Unicode subscripts (₂, ₃, etc.) in the formula
- Be accurate with IUPAC naming rules
- If structure is unclear, make best guess based on atoms present`;

    try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        let text = response.text();
        
        // Clean up response - remove markdown code blocks if present
        text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        
        const data = JSON.parse(text);
        
        // Add success flag
        data.success = true;
        
        // Cache the result
        setCache(cacheKey, data);
        
        return data;
    } catch (error) {
        console.error('Error in nameStructure:', error);
        throw new Error(`Failed to analyze structure: ${error.message}`);
    }
}

/**
 * Recognize chemical structure from an image
 * @param {string} base64Image - Base64 encoded image
 * @param {string} mimeType - Image MIME type (image/png, image/jpeg)
 * @returns {Object} - { nodes, bonds, name, formula }
 */
async function recognizeImage(base64Image, mimeType = 'image/png') {
    if (!visionModel) {
        if (!initialize()) {
            throw new Error('Gemini AI not initialized. Please check your API key.');
        }
    }
    
    const prompt = `You are an expert chemist analyzing a chemical structure image.

Identify ALL atoms and bonds in this chemical structure image and provide the data needed to redraw it.

Return a JSON response with EXACTLY this format (no markdown, just pure JSON):
{
    "success": true,
    "confidence": 0.95,
    "structure": {
        "nodes": [
            {"id": 1, "label": "C", "x": 100, "y": 100},
            {"id": 2, "label": "O", "x": 150, "y": 100}
        ],
        "bonds": [
            {"aId": 1, "bId": 2, "order": 1}
        ]
    },
    "name": "IUPAC name of the compound",
    "formula": "molecular formula",
    "smiles": "SMILES notation if possible"
}

RULES:
1. Identify each atom (C, H, O, N, Cl, Br, etc.) as a node
2. For functional groups shown as labels (OH, NH2, COOH), use them as single node labels
3. Position x,y coordinates relative to each other (use 50px spacing)
4. Bond order: 1=single, 2=double, 3=triple
5. Include ALL visible atoms and bonds
6. Return ONLY valid JSON, no explanations`;

    try {
        const imagePart = {
            inlineData: {
                data: base64Image,
                mimeType: mimeType
            }
        };
        
        const result = await visionModel.generateContent([prompt, imagePart]);
        const response = await result.response;
        let text = response.text();
        
        // Clean up response
        text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        
        const data = JSON.parse(text);
        return data;
    } catch (error) {
        console.error('Error in recognizeImage:', error);
        throw new Error(`Failed to recognize structure: ${error.message}`);
    }
}

/**
 * Generate structure data from a compound name
 * @param {string} name - Chemical name (IUPAC or common)
 * @returns {Object} - { nodes, bonds, smiles, iupacName }
 */
async function nameToStructure(name) {
    if (!model) {
        if (!initialize()) {
            throw new Error('Gemini AI not initialized. Please check your API key.');
        }
    }
    
    // Check cache
    const cacheKey = `structure_${name.toLowerCase().trim()}`;
    const cached = getCached(cacheKey);
    if (cached) {
        console.log('📦 Returning cached structure result');
        return cached;
    }
    
    const prompt = `You are an expert chemist. Generate the 2D structure data for this chemical compound:

COMPOUND NAME: "${name}"

Return a JSON response with EXACTLY this format (no markdown, just pure JSON):
{
    "success": true,
    "iupacName": "systematic IUPAC name",
    "commonNames": ["common names"],
    "formula": "molecular formula",
    "smiles": "SMILES notation",
    "structure": {
        "nodes": [
            {"id": 1, "label": "C", "x": 200, "y": 200},
            {"id": 2, "label": "C", "x": 250, "y": 200}
        ],
        "bonds": [
            {"aId": 1, "bId": 2, "order": 1}
        ]
    }
}

RULES:
1. Generate realistic 2D coordinates for drawing
2. Use 50-60px spacing between bonded atoms
3. Center structure around (250, 250)
4. Use functional group labels (OH, NH2, COOH) where appropriate
5. Bond order: 1=single, 2=double, 3=triple
6. For rings, arrange atoms in proper geometric shapes
7. Return ONLY valid JSON, no explanations
8. If compound name is invalid, return {"success": false, "error": "reason"}`;

    try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        let text = response.text();
        
        // Clean up response
        text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        
        const data = JSON.parse(text);
        
        if (data.success) {
            setCache(cacheKey, data);
        }
        
        return data;
    } catch (error) {
        console.error('Error in nameToStructure:', error);
        throw new Error(`Failed to generate structure: ${error.message}`);
    }
}

/**
 * Build a text description of the structure for AI
 */
function buildStructureDescription(structureData) {
    const { nodes, bonds } = structureData;
    
    if (!nodes || nodes.length === 0) {
        return 'Empty structure';
    }
    
    // Count atoms
    const atomCounts = {};
    nodes.forEach(n => {
        const label = n.label || 'C';
        // Expand compound labels
        if (label === 'OH') {
            atomCounts['O'] = (atomCounts['O'] || 0) + 1;
            atomCounts['H'] = (atomCounts['H'] || 0) + 1;
        } else if (label === 'NH2') {
            atomCounts['N'] = (atomCounts['N'] || 0) + 1;
            atomCounts['H'] = (atomCounts['H'] || 0) + 2;
        } else if (label === 'COOH') {
            atomCounts['C'] = (atomCounts['C'] || 0) + 1;
            atomCounts['O'] = (atomCounts['O'] || 0) + 2;
            atomCounts['H'] = (atomCounts['H'] || 0) + 1;
        } else if (label === 'CH3') {
            atomCounts['C'] = (atomCounts['C'] || 0) + 1;
            atomCounts['H'] = (atomCounts['H'] || 0) + 3;
        } else if (label === 'CH2') {
            atomCounts['C'] = (atomCounts['C'] || 0) + 1;
            atomCounts['H'] = (atomCounts['H'] || 0) + 2;
        } else {
            atomCounts[label] = (atomCounts[label] || 0) + 1;
        }
    });
    
    // Build description
    let description = `Atoms present: ${nodes.map(n => n.label || 'C').join(', ')}\n`;
    description += `Atom counts: ${JSON.stringify(atomCounts)}\n`;
    description += `Number of bonds: ${bonds ? bonds.length : 0}\n`;
    
    if (bonds && bonds.length > 0) {
        const bondTypes = bonds.map(b => {
            const nodeA = nodes.find(n => n.id === b.aId);
            const nodeB = nodes.find(n => n.id === b.bId);
            const order = b.order === 2 ? 'double' : b.order === 3 ? 'triple' : 'single';
            return `${nodeA?.label || 'C'}-${nodeB?.label || 'C'} (${order})`;
        });
        description += `Bonds: ${bondTypes.join(', ')}`;
    }
    
    return description;
}

// Check if service is ready
function isReady() {
    return model !== null;
}

// Initialize on module load
// DISABLED: Using local chemistry engine only (no external APIs)
// initialize();

module.exports = {
    initialize,
    isReady,
    nameStructure,
    recognizeImage,
    nameToStructure
};
