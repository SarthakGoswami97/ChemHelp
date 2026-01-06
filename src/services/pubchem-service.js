/**
 * PubChem API Service for ChemHelp
 * Free API for chemical compound data
 * https://pubchem.ncbi.nlm.nih.gov/
 */

const axios = require('axios');

const PUBCHEM_BASE_URL = 'https://pubchem.ncbi.nlm.nih.gov/rest/pug';

// Simple cache
const cache = new Map();
const CACHE_TTL = 3600000; // 1 hour

function getCached(key) {
    const cached = cache.get(key);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        return cached.data;
    }
    cache.delete(key);
    return null;
}

function setCache(key, data) {
    cache.set(key, { data, timestamp: Date.now() });
}

/**
 * Search for a compound by name
 * @param {string} name - Chemical name (IUPAC or common)
 * @returns {Object} - Compound data including CID
 */
async function searchByName(name) {
    const cacheKey = `search_${name.toLowerCase()}`;
    const cached = getCached(cacheKey);
    if (cached) return cached;
    
    try {
        const url = `${PUBCHEM_BASE_URL}/compound/name/${encodeURIComponent(name)}/JSON`;
        const response = await axios.get(url, { timeout: 10000 });
        
        if (response.data && response.data.PC_Compounds && response.data.PC_Compounds.length > 0) {
            const compound = response.data.PC_Compounds[0];
            const result = {
                success: true,
                cid: compound.id.id.cid,
                data: compound
            };
            setCache(cacheKey, result);
            return result;
        }
        
        return { success: false, error: 'Compound not found' };
    } catch (error) {
        if (error.response && error.response.status === 404) {
            return { success: false, error: 'Compound not found' };
        }
        console.error('PubChem search error:', error.message);
        return { success: false, error: error.message };
    }
}

/**
 * Get compound properties by CID
 * @param {number} cid - PubChem Compound ID
 * @returns {Object} - Compound properties
 */
async function getCompoundProperties(cid) {
    const cacheKey = `props_${cid}`;
    const cached = getCached(cacheKey);
    if (cached) return cached;
    
    try {
        const properties = 'IUPACName,MolecularFormula,MolecularWeight,CanonicalSMILES,IsomericSMILES';
        const url = `${PUBCHEM_BASE_URL}/compound/cid/${cid}/property/${properties}/JSON`;
        const response = await axios.get(url, { timeout: 10000 });
        
        if (response.data && response.data.PropertyTable && response.data.PropertyTable.Properties) {
            const props = response.data.PropertyTable.Properties[0];
            const result = {
                success: true,
                cid: props.CID,
                iupacName: props.IUPACName,
                formula: props.MolecularFormula,
                molecularWeight: props.MolecularWeight,
                smiles: props.CanonicalSMILES,
                isomericSmiles: props.IsomericSMILES
            };
            setCache(cacheKey, result);
            return result;
        }
        
        return { success: false, error: 'Properties not found' };
    } catch (error) {
        console.error('PubChem properties error:', error.message);
        return { success: false, error: error.message };
    }
}

/**
 * Get 2D structure coordinates for a compound
 * @param {number} cid - PubChem Compound ID
 * @returns {Object} - Structure with atom coordinates and bonds
 */
async function get2DCoordinates(cid) {
    const cacheKey = `coords_${cid}`;
    const cached = getCached(cacheKey);
    if (cached) return cached;
    
    try {
        const url = `${PUBCHEM_BASE_URL}/compound/cid/${cid}/JSON?record_type=2d`;
        const response = await axios.get(url, { timeout: 10000 });
        
        if (response.data && response.data.PC_Compounds && response.data.PC_Compounds.length > 0) {
            const compound = response.data.PC_Compounds[0];
            const structure = parseCompoundStructure(compound);
            setCache(cacheKey, structure);
            return structure;
        }
        
        return { success: false, error: 'Structure not found' };
    } catch (error) {
        console.error('PubChem 2D coordinates error:', error.message);
        return { success: false, error: error.message };
    }
}

/**
 * Parse PubChem compound data into nodes and bonds format
 */
function parseCompoundStructure(compound) {
    try {
        const atoms = compound.atoms;
        const bonds = compound.bonds;
        const coords = compound.coords?.[0]?.conformers?.[0];
        
        if (!atoms || !coords) {
            return { success: false, error: 'Invalid structure data' };
        }
        
        // Element symbols
        const elementSymbols = {
            1: 'H', 6: 'C', 7: 'N', 8: 'O', 9: 'F', 
            15: 'P', 16: 'S', 17: 'Cl', 35: 'Br', 53: 'I'
        };
        
        // Parse atoms/nodes
        const nodes = [];
        const xCoords = coords.x || [];
        const yCoords = coords.y || [];
        
        // Scale and center coordinates
        const minX = Math.min(...xCoords);
        const maxX = Math.max(...xCoords);
        const minY = Math.min(...yCoords);
        const maxY = Math.max(...yCoords);
        
        const scaleX = 300 / (maxX - minX || 1);
        const scaleY = 300 / (maxY - minY || 1);
        const scale = Math.min(scaleX, scaleY, 50); // Max 50px per unit
        
        const centerX = 300;
        const centerY = 300;
        
        atoms.aid.forEach((aid, index) => {
            const atomicNum = atoms.element[index];
            const label = elementSymbols[atomicNum] || `#${atomicNum}`;
            
            // Transform coordinates
            const x = centerX + (xCoords[index] - (minX + maxX) / 2) * scale;
            const y = centerY + (yCoords[index] - (minY + maxY) / 2) * scale;
            
            nodes.push({
                id: aid,
                label: label,
                x: Math.round(x),
                y: Math.round(y)
            });
        });
        
        // Parse bonds
        const bondList = [];
        if (bonds && bonds.aid1) {
            bonds.aid1.forEach((aid1, index) => {
                const aid2 = bonds.aid2[index];
                const order = bonds.order?.[index] || 1;
                
                bondList.push({
                    aId: aid1,
                    bId: aid2,
                    order: order
                });
            });
        }
        
        return {
            success: true,
            nodes: nodes,
            bonds: bondList
        };
    } catch (error) {
        console.error('Error parsing structure:', error);
        return { success: false, error: 'Failed to parse structure' };
    }
}

/**
 * Get complete structure data by compound name
 * Combines search, properties, and coordinates
 */
async function getStructureByName(name) {
    // First search for the compound
    const searchResult = await searchByName(name);
    if (!searchResult.success) {
        return searchResult;
    }
    
    const cid = searchResult.cid;
    
    // Get properties and coordinates in parallel
    const [properties, coordinates] = await Promise.all([
        getCompoundProperties(cid),
        get2DCoordinates(cid)
    ]);
    
    if (!coordinates.success) {
        return coordinates;
    }
    
    return {
        success: true,
        cid: cid,
        iupacName: properties.iupacName || name,
        formula: properties.formula,
        molecularWeight: properties.molecularWeight,
        smiles: properties.smiles,
        structure: {
            nodes: coordinates.nodes,
            bonds: coordinates.bonds
        }
    };
}

module.exports = {
    searchByName,
    getCompoundProperties,
    get2DCoordinates,
    getStructureByName
};
