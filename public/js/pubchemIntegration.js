/**
 * pubchemIntegration.js
 * PubChem API integration for ChemHelp
 * Search and import molecular structures from PubChem
 */

class PubChemIntegration {
    static BASE_URL = 'https://pubchem.ncbi.nlm.nih.gov/rest/pug';
    static PROXY_BASE = '/api/pubchem'; // Use backend proxy
    static TIMEOUT = 10000; // 10 seconds

    /**
     * Search for a compound by name or CID
     * @param {string} query - Compound name or CID
     * @returns {Promise<Object>} Search results
     */
    static async searchCompound(query) {
        try {
            const endpoint = `${this.PROXY_BASE}/search?q=${encodeURIComponent(query)}`;
            console.log('🔍 Searching PubChem via proxy:', endpoint);
            
            const response = await Promise.race([
                fetch(endpoint, {
                    method: 'GET',
                    headers: {
                        'Accept': 'application/json'
                    }
                }),
                new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('Request timeout')), this.TIMEOUT)
                )
            ]);

            console.log('📡 Response status:', response.status);

            if (!response.ok) {
                throw new Error(`PubChem API error: ${response.status}`);
            }

            const data = await response.json();
            
            if (!data.IdentifierList || !data.IdentifierList.CID) {
                return {
                    success: false,
                    message: `No compounds found for "${query}"`,
                    results: []
                };
            }

            const cids = data.IdentifierList.CID.slice(0, 10); // Limit to 10 results
            console.log('✅ Found compounds:', cids);
            
            return {
                success: true,
                message: `Found ${cids.length} compound(s)`,
                results: cids,
                query: query
            };
        } catch (error) {
            console.error('❌ PubChem search error:', error);
            return {
                success: false,
                message: `Search failed: ${error.message}. Check console for details.`,
                results: []
            };
        }
    }

    /**
     * Get compound information by CID
     * @param {number} cid - Compound ID
     * @returns {Promise<Object>} Compound information
     */
    static async getCompoundInfo(cid) {
        try {
            const endpoint = `${this.PROXY_BASE}/compound/${cid}`;
            console.log('📦 Fetching compound info via proxy:', endpoint);
            
            const response = await Promise.race([
                fetch(endpoint, {
                    method: 'GET',
                    headers: {
                        'Accept': 'application/json'
                    }
                }),
                new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('Request timeout')), this.TIMEOUT)
                )
            ]);

            if (!response.ok) {
                throw new Error(`Failed to fetch compound ${cid}`);
            }

            const data = await response.json();
            const compound = data.PC_Compounds?.[0];

            if (!compound) {
                return { success: false, message: 'Compound data not found' };
            }

            // Extract basic info
            const props = compound.props || [];
            
            // PubChem stores atoms as parallel arrays
            const atomIds = compound.atoms?.aid || [];
            const elements = compound.atoms?.element || [];
            
            // Get 2D coordinates from conformers
            const coords = compound.coords?.[0]?.conformers?.[0] || {};
            const xCoords = coords.x || [];
            const yCoords = coords.y || [];
            
            // Build atoms array with proper structure
            const atoms = atomIds.map((aid, idx) => ({
                aid: aid,
                element: elements[idx] || 6, // Default to carbon
                x: xCoords[idx] || 0,
                y: yCoords[idx] || 0
            }));
            
            // PubChem stores bonds as parallel arrays
            const bondAid1 = compound.bonds?.aid1 || [];
            const bondAid2 = compound.bonds?.aid2 || [];
            const bondOrders = compound.bonds?.order || [];
            
            // Build bonds array
            const bonds = bondAid1.map((aid1, idx) => ({
                aid1: aid1,
                aid2: bondAid2[idx],
                order: bondOrders[idx] || 1
            }));

            const info = {
                success: true,
                cid: cid,
                name: props.find(p => p.urn?.label === 'IUPAC Name')?.value?.sval || `Compound ${cid}`,
                molecularFormula: props.find(p => p.urn?.label === 'Molecular Formula')?.value?.sval || 'Unknown',
                molecularWeight: parseFloat(props.find(p => p.urn?.label === 'Molecular Weight')?.value?.sval) || 0,
                iupacName: props.find(p => p.urn?.label === 'IUPAC Name')?.value?.sval || 'Unknown',
                canonicalSmiles: props.find(p => p.urn?.label === 'SMILES' && p.urn?.name === 'Absolute')?.value?.sval || '',
                atoms: atoms,
                bonds: bonds
            };

            console.log('✅ Compound info extracted:', info.name, 'atoms:', atoms.length, 'bonds:', bonds.length);
            return info;
        } catch (error) {
            console.error('❌ Error fetching compound info:', error);
            return {
                success: false,
                message: `Failed to fetch compound: ${error.message}`
            };
        }
    }

    /**
     * Get 2D structure from PubChem
     * @param {number} cid - Compound ID
     * @returns {Promise<Object>} 2D coordinate structure
     */
    static async get2DStructure(cid) {
        try {
            const endpoint = `${this.BASE_URL}/compound/cid/${cid}/record/JSON?record_type=2d`;
            
            const response = await Promise.race([
                fetch(endpoint, {
                    method: 'GET',
                    mode: 'cors',
                    headers: {
                        'Accept': 'application/json'
                    }
                }),
                new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('Request timeout')), this.TIMEOUT)
                )
            ]);

            if (!response.ok) {
                throw new Error(`Failed to fetch 2D structure for ${cid}`);
            }

            const data = await response.json();
            return {
                success: true,
                data: data,
                cid: cid
            };
        } catch (error) {
            console.error('Error fetching 2D structure:', error);
            return {
                success: false,
                message: `Failed to fetch structure: ${error.message}`
            };
        }
    }

    /**
     * Convert PubChem structure to ChemHelp format
     * @param {Object} compoundInfo - Info from getCompoundInfo
     * @returns {Object} { nodes, bonds } in ChemHelp format
     */
    static convertToChemHelpFormat(compoundInfo) {
        try {
            if (!compoundInfo.success || !compoundInfo.atoms || compoundInfo.atoms.length === 0) {
                console.error('❌ No atoms in compound info');
                return null;
            }

            // Atomic number to element symbol map
            const ELEMENTS = {
                1: 'H', 2: 'He', 3: 'Li', 4: 'Be', 5: 'B', 6: 'C', 7: 'N', 8: 'O', 9: 'F', 10: 'Ne',
                11: 'Na', 12: 'Mg', 13: 'Al', 14: 'Si', 15: 'P', 16: 'S', 17: 'Cl', 18: 'Ar',
                19: 'K', 20: 'Ca', 26: 'Fe', 29: 'Cu', 30: 'Zn', 35: 'Br', 53: 'I'
            };

            const atomMap = {}; // PubChem aid -> ChemHelp node id

            // Create nodes from atoms
            const nodes = compoundInfo.atoms.map((atom, idx) => {
                const nodeId = idx;
                atomMap[atom.aid] = nodeId;

                const elementSymbol = ELEMENTS[atom.element] || 'C';
                
                return {
                    id: nodeId,
                    label: elementSymbol,
                    x: (atom.x || 0) * 40 + 300, // Scale and offset for centering
                    y: (atom.y || 0) * 40 + 200,
                    charge: 0,
                    selected: false
                };
            });

            // Create bonds
            const bonds = compoundInfo.bonds.map(bond => {
                const bondTypes = {
                    1: 'single',
                    2: 'double',
                    3: 'triple',
                    4: 'aromatic'
                };

                return {
                    aId: atomMap[bond.aid1],
                    bId: atomMap[bond.aid2],
                    order: bond.order || 1,
                    type: bondTypes[bond.order] || 'single'
                };
            });

            console.log('✅ Converted to ChemHelp format:', nodes.length, 'nodes,', bonds.length, 'bonds');
            return { nodes, bonds };
        } catch (error) {
            console.error('❌ Error converting structure:', error);
            return null;
        }
    }

    /**
     * Full import workflow: search -> fetch -> convert
     * @param {string} query - Compound name or CID
     * @returns {Promise<Object>} Complete structure ready to add
     */
    static async importCompound(query) {
        try {
            let cid;
            
            // Check if query is already a CID (numeric)
            if (/^\d+$/.test(String(query))) {
                cid = query;
                console.log('📦 Direct CID import:', cid);
            } else {
                // Step 1: Search by name
                const searchResults = await this.searchCompound(query);
                if (!searchResults.success || searchResults.results.length === 0) {
                    return {
                        success: false,
                        message: searchResults.message,
                        stage: 'search'
                    };
                }
                cid = searchResults.results[0];
            }

            // Step 2: Fetch compound info
            const compoundInfo = await this.getCompoundInfo(cid);
            if (!compoundInfo.success) {
                return {
                    success: false,
                    message: compoundInfo.message,
                    stage: 'fetch',
                    cid: cid
                };
            }

            // Step 3: Convert to ChemHelp format
            const structure = this.convertToChemHelpFormat(compoundInfo);
            if (!structure) {
                return {
                    success: false,
                    message: 'Failed to convert structure',
                    stage: 'convert',
                    cid: cid
                };
            }

            return {
                success: true,
                message: `Successfully imported: ${compoundInfo.name}`,
                cid: cid,
                name: compoundInfo.name,
                molecularFormula: compoundInfo.molecularFormula,
                molecularWeight: compoundInfo.molecularWeight,
                iupacName: compoundInfo.iupacName,
                structure: structure
            };
        } catch (error) {
            console.error('Error in import workflow:', error);
            return {
                success: false,
                message: `Import failed: ${error.message}`,
                stage: 'unknown'
            };
        }
    }

    /**
     * Get compound image URL from PubChem
     * @param {number} cid - Compound ID
     * @param {number} width - Image width (default 300)
     * @param {number} height - Image height (default 300)
     * @returns {string} Image URL
     */
    static getCompoundImageUrl(cid, width = 300, height = 300) {
        return `${this.BASE_URL}/compound/cid/${cid}/PNG?image_size=${width}x${height}`;
    }

    /**
     * Search with suggestions (for autocomplete)
     * @param {string} prefix - Search prefix
     * @returns {Promise<Array>} List of suggestions
     */
    static async getSuggestions(prefix) {
        try {
            // Use autocomplete endpoint if available, otherwise use regular search
            const results = await this.searchCompound(prefix);
            if (results.success && results.results.length > 0) {
                // Fetch names for the CIDs
                const suggestions = [];
                for (const cid of results.results.slice(0, 5)) {
                    const info = await this.getCompoundInfo(cid);
                    if (info.success) {
                        suggestions.push({
                            cid: cid,
                            name: info.name,
                            formula: info.molecularFormula
                        });
                    }
                }
                return suggestions;
            }
            return [];
        } catch (error) {
            console.error('Error getting suggestions:', error);
            return [];
        }
    }

    /**
     * Test if PubChem API is accessible
     * @returns {Promise<boolean>}
     */
    static async testConnection() {
        try {
            console.log('🧪 Testing PubChem connection...');
            const response = await fetch('https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/ethanol/cids/JSON?limit=5', {
                method: 'GET',
                mode: 'cors'
            });
            const success = response.ok;
            console.log(`🔗 Connection test: ${success ? '✅ OK' : '❌ Failed'}`);
            return success;
        } catch (error) {
            console.error('🔗 Connection test failed:', error);
            return false;
        }
    }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PubChemIntegration;
}
