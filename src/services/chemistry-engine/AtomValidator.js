/**
 * AtomValidator.js
 * Validates atom properties and checks chemical validity
 */

class AtomValidator {
    /**
     * Standard valence rules for common atoms
     */
    static VALENCE_RULES = {
        'H': { min: 1, max: 1, defaultValence: 1 },
        'C': { min: 2, max: 4, defaultValence: 4 },
        'N': { min: 1, max: 5, defaultValence: 3 },
        'O': { min: 1, max: 2, defaultValence: 2 },
        'S': { min: 2, max: 6, defaultValence: 2 },
        'P': { min: 3, max: 5, defaultValence: 3 },
        'Cl': { min: 1, max: 1, defaultValence: 1 },
        'Br': { min: 1, max: 1, defaultValence: 1 },
        'I': { min: 1, max: 1, defaultValence: 1 },
        'F': { min: 1, max: 1, defaultValence: 1 },
        'B': { min: 3, max: 4, defaultValence: 3 }
    };

    /**
     * Validate atom and calculate implicit hydrogens
     */
    static validateAtom(atom, molecule, atomIndex) {
        const validation = {
            atom: atom,
            isValid: true,
            errors: [],
            warnings: [],
            implicitHydrogens: 0,
            totalValence: 0
        };

        // Check if atom type is recognized
        if (!this.VALENCE_RULES[atom.symbol]) {
            validation.warnings.push(`Unknown atom type: ${atom.symbol}`);
        }

        // Get valence rules
        const rules = this.VALENCE_RULES[atom.symbol] || { min: 0, max: 8, defaultValence: 4 };

        // Calculate bonded electron pairs
        const adjacencyRow = molecule.adjacencyMatrix[atomIndex];
        const totalBondOrder = adjacencyRow.reduce((sum, val) => sum + val, 0);
        const formalCharge = atom.charge || 0;

        // Calculate electron deficiency considering charge
        const electronsNeeded = rules.defaultValence + formalCharge;
        const electronsUsed = totalBondOrder;
        const implicitH = Math.max(0, electronsNeeded - electronsUsed);

        validation.implicitHydrogens = implicitH;
        validation.totalValence = totalBondOrder + implicitH;

        // Validate valence
        if (validation.totalValence < rules.min) {
            validation.errors.push(
                `${atom.symbol} atom has insufficient bonds (${validation.totalValence}). ` +
                `Minimum required: ${rules.min}`
            );
            validation.isValid = false;
        }

        if (validation.totalValence > rules.max) {
            validation.warnings.push(
                `${atom.symbol} atom may exceed maximum valence (${validation.totalValence} > ${rules.max})`
            );
        }

        // Check for unusual charge states
        if (Math.abs(formalCharge) > 3) {
            validation.warnings.push(`Atom has unusual formal charge: ${formalCharge}`);
        }

        return validation;
    }

    /**
     * Validate all atoms in molecule
     */
    static validateAllAtoms(molecule) {
        const results = {
            allValid: true,
            atomValidations: [],
            summary: {
                totalAtoms: molecule.atoms.length,
                validAtoms: 0,
                atomsWithWarnings: 0
            }
        };

        molecule.atoms.forEach((atom, idx) => {
            const validation = this.validateAtom(atom, molecule, idx);
            results.atomValidations.push(validation);

            if (validation.isValid) {
                results.summary.validAtoms++;
            }
            if (validation.warnings.length > 0) {
                results.summary.atomsWithWarnings++;
            }
            if (!validation.isValid) {
                results.allValid = false;
            }
        });

        return results;
    }

    /**
     * Check if atom is carbon (often important for nomenclature)
     */
    static isCarbon(atom) {
        return atom.symbol === 'C';
    }

    /**
     * Check if atom is hydrogen
     */
    static isHydrogen(atom) {
        return atom.symbol === 'H';
    }

    /**
     * Check if atom is heteroatom (non-C, non-H)
     */
    static isHeteroatom(atom) {
        return !this.isCarbon(atom) && !this.isHydrogen(atom);
    }

    /**
     * Check if atom is halogen
     */
    static isHalogen(atom) {
        return ['F', 'Cl', 'Br', 'I'].includes(atom.symbol);
    }

    /**
     * Identify functional group atoms
     */
    static identifyFunctionalAtoms(atom) {
        const tags = [];

        if (this.isHalogen(atom)) tags.push('halogen');
        if (atom.symbol === 'O') tags.push('oxygen');
        if (atom.symbol === 'N') tags.push('nitrogen');
        if (atom.symbol === 'S') tags.push('sulfur');
        if (atom.symbol === 'P') tags.push('phosphorus');

        return tags;
    }

    /**
     * Get expected valence for atom with given charge
     */
    static getExpectedValence(atomSymbol, formalCharge = 0) {
        const rules = this.VALENCE_RULES[atomSymbol];
        if (!rules) return null;

        const expected = rules.defaultValence + formalCharge;
        return Math.max(rules.min, Math.min(rules.max, expected));
    }

    /**
     * Calculate implied hydrogen count
     */
    static calculateImplicitHydrogens(atom, totalBondOrder, atomSymbol) {
        const rules = this.VALENCE_RULES[atomSymbol];
        if (!rules) return 0;

        const formalCharge = atom.charge || 0;
        const needed = rules.defaultValence + formalCharge;
        const hydrogens = Math.max(0, needed - totalBondOrder);

        return hydrogens;
    }

    /**
     * Check if atom can form double bond
     */
    static canFormDoubleBond(atomSymbol) {
        const nonDoubleBondAtoms = ['H', 'F', 'Cl', 'Br', 'I'];
        return !nonDoubleBondAtoms.includes(atomSymbol);
    }

    /**
     * Check if atom can form triple bond
     */
    static canFormTripleBond(atomSymbol) {
        return ['C', 'N'].includes(atomSymbol);
    }

    /**
     * Detect resonance structures (aromatic systems)
     */
    static isAromatic(atomSymbol) {
        // Simplified check
        return atomSymbol === 'C' || atomSymbol === 'N';
    }
}

module.exports = AtomValidator;
