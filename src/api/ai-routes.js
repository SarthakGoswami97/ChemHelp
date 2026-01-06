/**
 * AI Routes for ChemHelp
 * Handles all AI-powered chemistry features
 */

const express = require('express');
const router = express.Router();

// Import services
const pubchemService = require('../services/pubchem-service');
const ChemistryEngine = require('../services/chemistry-engine/ChemistryEngine');

/**
 * Helper function to determine polarity from functional groups
 */
function determinePolarity(functionalGroups) {
    if (!functionalGroups) return 'Nonpolar';
    const groups = functionalGroups.join(' ').toLowerCase();
    if (groups.includes('halogenated') || groups.includes('hydroxyl') || groups.includes('amine') || groups.includes('carboxylic')) {
        return 'Polar';
    }
    return 'Nonpolar';
}

/**
 * GET /api/ai/status
 * Check service status
 */
router.get('/status', (req, res) => {
    res.json({
        success: true,
        services: {
            chemistryEngine: 'ready',
            pubchem: 'ready'
        },
        message: 'Chemistry Engine ready - Local model (no external AI)'
    });
});

/**
 * POST /api/ai/name-structure
 * Generate IUPAC name and properties for a chemical structure
 * Body: { nodes: [...], bonds: [...] }
 * Uses: Local Chemistry Engine (No quotas!)
 */
router.post('/name-structure', async (req, res) => {
    try {
        const { nodes, bonds } = req.body;
        
        if (!nodes || nodes.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'No structure data provided'
            });
        }
        
        console.log(`\n🔬 API RECEIVED:`);
        console.log(`   Atoms (${nodes.length}):`, nodes.map(n => `${n.label}(${n.id})`).join(' → '));
        console.log(`   Raw nodes:`, JSON.stringify(nodes));
        console.log(`   Bonds (${bonds?.length || 0}):`, bonds?.map(b => `${b.source}-${b.target}(${b.type})`).join(', '));
        
        // Use local chemistry engine
        const engineResult = ChemistryEngine.nameStructure(nodes, bonds);
        
        console.log(`   ✅ Engine Result: "${engineResult.iupacName}"`);
        console.log(`   📊 Formula: ${engineResult.molecularFormula}`);
        console.log(`   🔬 Atom Count: ${engineResult.atomCount}, Bond Count: ${engineResult.bondCount}\n`);
        
        // Transform result to frontend format
        const result = {
            success: engineResult.success,
            iupacName: engineResult.iupacName,
            commonNames: engineResult.commonName ? [engineResult.commonName] : [],
            formula: engineResult.molecularFormula,
            functionalGroups: engineResult.functionalGroups || [],
            classification: engineResult.structureType || 'Organic Compound',
            confidence: engineResult.confidence,
            properties: {
                atomCount: engineResult.atomCount,
                bondCount: engineResult.bondCount,
                totalCharge: engineResult.totalCharge,
                // Add properties expected by frontend
                acidity: 'Neutral',  // Will be determined by functional groups
                polarity: determinePolarity(engineResult.functionalGroups),
                reactivity: engineResult.confidence > 0.8 ? 'Moderate' : 'Low',
                pH: 7  // Neutral by default
            },
            description: `Compound with ${engineResult.atomCount} atoms and ${engineResult.bondCount} bonds`,
            validationStatus: engineResult.validationStatus,
            errors: engineResult.errors,
            ambiguities: engineResult.ambiguities,
            warnings: engineResult.warnings,
            model: 'Local Chemistry Engine v2.0'
        };
        
        // Enhance properties based on functional groups
        if (engineResult.functionalGroups && engineResult.functionalGroups.length > 0) {
            const groups = engineResult.functionalGroups.join(' ').toLowerCase();
            if (groups.includes('carboxylic') || groups.includes('acid')) {
                result.properties.acidity = 'Acidic';
                result.properties.pH = 3;
            } else if (groups.includes('amine') || groups.includes('base')) {
                result.properties.acidity = 'Basic';
                result.properties.pH = 10;
            } else if (groups.includes('alcohol') || groups.includes('phenol')) {
                result.properties.acidity = 'Weakly Acidic';
                result.properties.pH = 6;
            }
            
            if (groups.includes('halogenated') || groups.includes('peroxide')) {
                result.properties.reactivity = 'High';
            }
        }
        
        res.json(result);
    } catch (error) {
        console.error('Error in /name-structure:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/ai/name-to-structure
 * Generate structure data from a compound name
 * Body: { name: "compound name" }
 */
router.post('/name-to-structure', async (req, res) => {
    try {
        const { name } = req.body;
        
        if (!name || name.trim().length === 0) {
            return res.status(400).json({
                success: false,
                error: 'No compound name provided'
            });
        }
        
        console.log(`🔍 Looking up structure for: "${name}"`);
        
        // Try PubChem first (free and accurate)
        let result = await pubchemService.getStructureByName(name.trim());
        
        if (result.success) {
            console.log(`✅ Found in PubChem: ${result.iupacName}`);
            return res.json(result);
        }
        
        // No fallback - PubChem is primary source
        res.json({
            success: false,
            error: 'Compound not found in PubChem database'
        });
    } catch (error) {
        console.error('Error in /name-to-structure:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/ai/search/:name
 * Quick search for compound information
 */
router.get('/search/:name', async (req, res) => {
    try {
        const { name } = req.params;
        
        // Search PubChem
        const searchResult = await pubchemService.searchByName(name);
        
        if (searchResult.success) {
            const properties = await pubchemService.getCompoundProperties(searchResult.cid);
            return res.json({
                success: true,
                source: 'PubChem',
                ...properties
            });
        }
        
        res.json({
            success: false,
            error: 'Compound not found'
        });
    } catch (error) {
        console.error('Error in /search:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

module.exports = router;
