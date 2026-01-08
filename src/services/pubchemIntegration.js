/**
 * pubchemIntegration.js
 * PubChem API integration for ChemHelp
 * Search and import molecular structures from PubChem
 */

class PubChemIntegration {
    static BASE_URL = 'https://pubchem.ncbi.nlm.nih.gov/rest/pug';
    static TIMEOUT = 10000; // 10 seconds

    /**
     * Search for a compound by name or CID
     * @param {string} query - Compound name or CID
     * @returns {Promise<Object>} Search results
     */
    static async searchCompound(query) {
        try {
            const endpoint = `${this.BASE_URL}/compound/name/${encodeURIComponent(query)}/cids/JSON`;
            
            const response = await Promise.race([
                fetch(endpoint),
                new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('Request timeout')), this.TIMEOUT)
                )
            ]);

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
            
            return {
                success: true,
                message: `Found ${cids.length} compound(s)`,
                results: cids,
                query: query
            };
        } catch (error) {
            console.error('Error searching PubChem:', error);
            return {
                success: false,
                message: `Search failed: ${error.message}`,
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
            const endpoint = `${this.BASE_URL}/compound/cid/${cid}/JSON?c1ccc2c(c1)ccc3c2cccc3`;
            
            const response = await Promise.race([
                fetch(endpoint),
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
            const atoms = compound.atoms || { atom: [] };
            const bonds = compound.bonds || { bond: [] };

            const info = {
                success: true,
                cid: cid,
                name: compound.id?.name?.[0] || `Compound ${cid}`,
                molecularFormula: props.find(p => p.urn?.label === 'Molecular Formula')?.value?.sval || 'Unknown',
                molecularWeight: props.find(p => p.urn?.label === 'Molecular Weight')?.value?.dval || 0,
                iupacName: props.find(p => p.urn?.label === 'IUPAC Name')?.value?.sval || 'Unknown',
                canonicalSmiles: props.find(p => p.urn?.label === 'Canonical SMILES')?.value?.sval || '',
                atoms: atoms.atom || [],
                bonds: bonds.bond || []
            };

            return info;
        } catch (error) {
            console.error('Error fetching compound info:', error);
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
                fetch(endpoint),
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
            if (!compoundInfo.success || !compoundInfo.atoms) {
                return null;
            }

            const atomMap = {}; // PubChem atom index -> ChemHelp node id

            // Create nodes from atoms
            const nodes = compoundInfo.atoms.map((atom, idx) => {
                const nodeId = idx;
                atomMap[atom.aid || idx] = nodeId;

                return {
                    id: nodeId,
                    label: atom.element || 'C', // Element symbol
                    x: (atom.x || 0) * 30, // Scale coordinates
                    y: (atom.y || 0) * 30,
                    charge: atom.charge || 0,
                    selected: false
                };
            });

            // Create bonds
            const bonds = (compoundInfo.bonds || []).map(bond => {
                const bondTypes = {
                    1: 'single',
                    2: 'double',
                    3: 'triple',
                    4: 'aromatic'
                };

                return {
                    source: atomMap[bond.aid1],
                    target: atomMap[bond.aid2],
                    type: bondTypes[bond.order] || 'single'
                };
            });

            return { nodes, bonds };
        } catch (error) {
            console.error('Error converting structure:', error);
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
            // Step 1: Search
            const searchResults = await this.searchCompound(query);
            if (!searchResults.success || searchResults.results.length === 0) {
                return {
                    success: false,
                    message: searchResults.message,
                    stage: 'search'
                };
            }

            const cid = searchResults.results[0];

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
     * Validate if a query is a valid CID
     * @param {string} query - Query string
     * @returns {boolean}
     */
    static isValidCID(query) {
        return /^\d+$/.test(query);
    }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PubChemIntegration;
}
