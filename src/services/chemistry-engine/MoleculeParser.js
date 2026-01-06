/**
 * MoleculeParser.js
 * Parses molecular structures and creates graph representations
 * 
 * Input: { nodes: [...], bonds: [...] }
 * Output: Validated molecule object with adjacency matrix
 */

const VALID_ATOMS = {
    'C': { symbol: 'C', atomicNumber: 6, valence: 4 },
    'H': { symbol: 'H', atomicNumber: 1, valence: 1 },
    'O': { symbol: 'O', atomicNumber: 8, valence: 2 },
    'N': { symbol: 'N', atomicNumber: 7, valence: 3 },
    'S': { symbol: 'S', atomicNumber: 16, valence: 2 },
    'P': { symbol: 'P', atomicNumber: 15, valence: 3 },
    'F': { symbol: 'F', atomicNumber: 9, valence: 1 },
    'Cl': { symbol: 'Cl', atomicNumber: 17, valence: 1 },
    'Br': { symbol: 'Br', atomicNumber: 35, valence: 1 },
    'I': { symbol: 'I', atomicNumber: 53, valence: 1 },
    'B': { symbol: 'B', atomicNumber: 5, valence: 3 },
};

const BOND_TYPES = {
    'single': 1,
    'double': 2,
    'triple': 3,
    'aromatic': 1.5
};

class MoleculeParser {
    /**
     * Parse raw structure data into molecule object
     * @param {Array} nodes - Atom nodes with id, label, charge, etc.
     * @param {Array} bonds - Bond connections with source, target, type
     * @returns {Object} Validated molecule object
     */
    static parseMolecule(nodes, bonds) {
        try {
            // Validate input
            if (!Array.isArray(nodes) || nodes.length === 0) {
                throw new Error('Invalid nodes: must be non-empty array');
            }
            if (!Array.isArray(bonds)) {
                throw new Error('Invalid bonds: must be array');
            }

            const molecule = {
                atoms: [],
                bonds: [],
                adjacencyMatrix: null,
                atomIndexMap: {},
                totalCharge: 0,
                isValid: true,
                warnings: []
            };

            // Parse atoms
            nodes.forEach((node, index) => {
                const atom = this._parseAtom(node, index);
                molecule.atoms.push(atom);
                molecule.atomIndexMap[node.id] = index;
                molecule.totalCharge += atom.charge;
            });

            // Parse bonds
            bonds.forEach((bond) => {
                const parsedBond = this._parseBond(bond, molecule.atomIndexMap);
                if (parsedBond) {
                    molecule.bonds.push(parsedBond);
                }
            });

            // Build adjacency matrix
            molecule.adjacencyMatrix = this._buildAdjacencyMatrix(molecule);
            
            // Calculate implicit hydrogens based on valence and bonds
            this._calculateImplicitHydrogens(molecule);

            // Validate structure
            const validation = this._validateStructure(molecule);
            molecule.isValid = validation.isValid;
            molecule.warnings = validation.warnings;

            return molecule;
        } catch (error) {
            console.error('Error parsing molecule:', error);
            throw error;
        }
    }
    
    /**
     * Calculate implicit hydrogens for each atom based on valence and existing bonds
     */
    static _calculateImplicitHydrogens(molecule) {
        molecule.atoms.forEach((atom, idx) => {
            // Skip if already has implicit hydrogens set from grouped label
            if (atom.implicitHydrogens > 0) return;
            
            // Count total bond order for this atom
            let totalBondOrder = 0;
            molecule.bonds.forEach(bond => {
                if (bond.source === idx || bond.target === idx) {
                    totalBondOrder += bond.order;
                }
            });
            
            // Calculate implicit hydrogens: valence - bonds - |charge|
            const freeValence = atom.valence - totalBondOrder - Math.abs(atom.charge);
            atom.implicitHydrogens = Math.max(0, freeValence);
        });
    }

    static _parseAtom(node, index) {
        // First check if this is a grouped atom label that needs expansion
        const expandedAtoms = this._expandGroupedLabel(node.label);
        
        if (expandedAtoms.length > 1) {
            // This is a grouped atom like CH2, OH, etc - return only the main atom
            // Hydrogens will be inferred separately
            const mainAtom = expandedAtoms[0];
            const atomSymbol = this._normalizeAtomSymbol(mainAtom);
            
            const atomData = VALID_ATOMS[atomSymbol] || VALID_ATOMS['C'];
            
            return {
                id: node.id,
                symbol: atomSymbol,
                index: index,
                atomicNumber: atomData.atomicNumber,
                valence: atomData.valence,
                charge: node.charge || 0,
                implicitHydrogens: expandedAtoms.slice(1).filter(a => a === 'H').length,
                formalCharge: node.formalCharge || 0,
                isAromatic: node.isAromatic || false,
                x: node.x || 0,
                y: node.y || 0,
                groupedLabel: node.label  // Keep original for reference
            };
        }
        
        // Single atom
        const atomSymbol = this._normalizeAtomSymbol(node.label);
        
        if (!VALID_ATOMS[atomSymbol]) {
            console.warn(`Unknown atom type: ${atomSymbol}, treating as carbon`);
        }

        const atomData = VALID_ATOMS[atomSymbol] || VALID_ATOMS['C'];

        return {
            id: node.id,
            symbol: atomSymbol,
            index: index,
            atomicNumber: atomData.atomicNumber,
            valence: atomData.valence,
            charge: node.charge || 0,
            implicitHydrogens: 0,
            formalCharge: node.formalCharge || 0,
            isAromatic: node.isAromatic || false,
            x: node.x || 0,
            y: node.y || 0
        };
    }

    /**
     * Expand grouped atom labels like CH2, OH, CH3, COOH
     * Returns array of individual atoms
     */
    static _expandGroupedLabel(label) {
        if (!label) return ['C'];
        
        const trimmed = label.trim();
        
        // Common group expansions
        const groups = {
            'CH': ['C', 'H'],
            'CH2': ['C', 'H', 'H'],
            'CH3': ['C', 'H', 'H', 'H'],
            'CH4': ['C', 'H', 'H', 'H', 'H'],
            'OH': ['O', 'H'],
            'NH': ['N', 'H'],
            'NH2': ['N', 'H', 'H'],
            'NH3': ['N', 'H', 'H', 'H'],
            'SH': ['S', 'H'],
            'PH': ['P', 'H'],
            'PH2': ['P', 'H', 'H'],
            'PH3': ['P', 'H', 'H', 'H'],
            'COOH': ['C', 'O', 'O', 'H'],
            'CHO': ['C', 'H', 'O'],
            'CN': ['C', 'N'],
            'NO': ['N', 'O'],
            'NO2': ['N', 'O', 'O'],
            'NO3': ['N', 'O', 'O', 'O'],
            'SO': ['S', 'O'],
            'SO2': ['S', 'O', 'O'],
            'SO3': ['S', 'O', 'O', 'O'],
            'SO4': ['S', 'O', 'O', 'O', 'O'],
            'PO': ['P', 'O'],
            'PO2': ['P', 'O', 'O'],
            'PO3': ['P', 'O', 'O', 'O'],
            'PO4': ['P', 'O', 'O', 'O', 'O'],
            'ClO': ['Cl', 'O'],
            'ClO2': ['Cl', 'O', 'O'],
            'ClO3': ['Cl', 'O', 'O', 'O'],
            'ClO4': ['Cl', 'O', 'O', 'O', 'O'],
        };
        
        return groups[trimmed] || [trimmed];
    }

    /**
     * Parse individual bond
     */
    static _parseBond(bond, atomIndexMap) {
        const sourceIdx = atomIndexMap[bond.source];
        const targetIdx = atomIndexMap[bond.target];

        if (sourceIdx === undefined || targetIdx === undefined) {
            console.warn(`Bond references invalid atoms: ${bond.source} -> ${bond.target}`);
            return null;
        }

        const bondType = bond.type || 'single';
        const bondOrder = BOND_TYPES[bondType] || 1;

        return {
            source: sourceIdx,
            target: targetIdx,
            type: bondType,
            order: bondOrder,
            isAromatic: bondType === 'aromatic'
        };
    }

    /**
     * Normalize atom symbol (handle variations)
     */
    static _normalizeAtomSymbol(label) {
        if (!label) return 'C';
        
        const trimmed = label.trim();
        
        // Common variations
        const variations = {
            'c': 'C',
            'h': 'H',
            'o': 'O',
            'n': 'N',
            's': 'S',
            'p': 'P',
            'cl': 'Cl',
            'Cl': 'Cl',
            'CL': 'Cl',
            'br': 'Br',
            'Br': 'Br',
            'BR': 'Br',
        };

        return variations[trimmed] || trimmed.toUpperCase();
    }

    /**
     * Build adjacency matrix representation
     */
    static _buildAdjacencyMatrix(molecule) {
        const n = molecule.atoms.length;
        const matrix = Array(n).fill(null).map(() => Array(n).fill(0));

        // Fill matrix with bond orders
        molecule.bonds.forEach(bond => {
            matrix[bond.source][bond.target] = bond.order;
            matrix[bond.target][bond.source] = bond.order;
        });

        return matrix;
    }

    /**
     * Validate molecule structure
     */
    static _validateStructure(molecule) {
        const warnings = [];
        let isValid = true;

        // Check if there are atoms
        if (molecule.atoms.length === 0) {
            return { isValid: false, warnings: ['No atoms in structure'] };
        }

        // Check valence for each atom
        molecule.atoms.forEach((atom, idx) => {
            const bondCount = this._calculateBondOrder(molecule.adjacencyMatrix[idx]);
            const expectedValence = atom.valence + Math.abs(atom.charge);

            if (bondCount > expectedValence && atom.symbol !== 'C') {
                warnings.push(`Atom ${atom.symbol} at index ${idx} may exceed valence (bonds: ${bondCount}, valence: ${expectedValence})`);
            }
        });

        // Check for disconnected atoms (optional warning)
        const isolated = molecule.atoms.filter((_, idx) => {
            return molecule.adjacencyMatrix[idx].reduce((sum, val) => sum + val, 0) === 0;
        });

        if (isolated.length > 0) {
            warnings.push(`${isolated.length} isolated atom(s) detected`);
        }

        return { isValid, warnings };
    }

    /**
     * Calculate total bond order for an atom
     */
    static _calculateBondOrder(adjacencyRow) {
        return adjacencyRow.reduce((sum, val) => sum + val, 0);
    }

    /**
     * Get atom connectivity
     * Returns list of bonded atom indices for given atom
     */
    static getConnectedAtoms(molecule, atomIndex) {
        const connections = [];
        molecule.adjacencyMatrix[atomIndex].forEach((bondOrder, targetIdx) => {
            if (bondOrder > 0) {
                connections.push({
                    atomIndex: targetIdx,
                    bondOrder: bondOrder,
                    atom: molecule.atoms[targetIdx]
                });
            }
        });
        return connections;
    }

    /**
     * Find longest carbon chain in molecule
     * Critical for IUPAC nomenclature
     */
    static findLongestCarbonChain(molecule) {
        const carbonIndices = molecule.atoms
            .map((atom, idx) => atom.symbol === 'C' ? idx : -1)
            .filter(idx => idx !== -1);

        if (carbonIndices.length === 0) return [];

        // DFS to find longest path
        const visited = new Set();
        let longestChain = [];

        const dfs = (idx, currentChain) => {
            currentChain.push(idx);
            visited.add(idx);

            // Only traverse to carbon atoms
            const neighbors = this.getConnectedAtoms(molecule, idx)
                .filter(conn => molecule.atoms[conn.atomIndex].symbol === 'C')
                .map(conn => conn.atomIndex);

            for (const neighbor of neighbors) {
                if (!visited.has(neighbor)) {
                    dfs(neighbor, currentChain);
                }
            }

            if (currentChain.length > longestChain.length) {
                longestChain = [...currentChain];
            }

            currentChain.pop();
            visited.delete(idx);
        };

        // Try starting from each carbon
        carbonIndices.forEach(startIdx => {
            visited.clear();
            dfs(startIdx, []);
        });

        return longestChain;
    }

    /**
     * Get all substituents for a given atom
     */
    static getSubstituents(molecule, atomIndex) {
        const atom = molecule.atoms[atomIndex];
        const substituents = [];

        this.getConnectedAtoms(molecule, atomIndex).forEach(connection => {
            const connectedAtom = connection.atom;
            if (connectedAtom.symbol !== 'C' || connectedAtom.symbol !== 'H') {
                substituents.push({
                    atom: connectedAtom,
                    atomIndex: connection.atomIndex,
                    bondOrder: connection.bondOrder
                });
            }
        });

        return substituents;
    }
}

module.exports = MoleculeParser;
