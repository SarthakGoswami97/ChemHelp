/**
 * FunctionalGroupDetector.js
 * Detects and identifies functional groups in molecules
 * Critical for IUPAC nomenclature suffix determination
 */

const MoleculeParser = require('./MoleculeParser');
const AtomValidator = require('./AtomValidator');

class FunctionalGroupDetector {
    /**
     * Functional group priority for IUPAC naming
     * Lower number = higher priority in nomenclature
     */
    static PRIORITY = {
        carboxylicAcid: 1,
        nitrile: 1.5,        // C≡N - high priority
        ester: 2,
        amide: 3,
        nitroGroup: 3.2,     // NO2 group
        peroxide: 3.5,
        hypochlorite: 3.6,   // C-O-Cl (methyl hypochlorite)
        amine: 4,
        aldehyde: 5,
        ketone: 6,
        alcohol: 7,
        ether: 8,
        thiol: 8.5,          // R-SH
        halide: 9,
        alkene: 10,
        alkyne: 11
    };

    /**
     * Detect all functional groups in molecule
     */
    static detectFunctionalGroups(molecule) {
        const groups = {
            carboxylicAcid: this._detectCarboxylicAcid(molecule),
            nitrile: this._detectNitrile(molecule),
            ester: this._detectEster(molecule),
            amide: this._detectAmide(molecule),
            nitroGroup: this._detectNitroGroup(molecule),
            peroxide: this._detectPeroxide(molecule),
            hypochlorite: this._detectHypochlorite(molecule),
            aldehyde: this._detectAldehyde(molecule),
            ketone: this._detectKetone(molecule),
            alcohol: this._detectAlcohol(molecule),
            amine: this._detectAmine(molecule),
            ether: this._detectEther(molecule),
            thiol: this._detectThiol(molecule),
            halide: this._detectHalide(molecule),
            alkene: this._detectAlkene(molecule),
            alkyne: this._detectAlkyne(molecule)
        };

        // Filter to only detected groups
        const detected = {};
        Object.entries(groups).forEach(([key, value]) => {
            if (value && value.length > 0) {
                detected[key] = value;
            }
        });

        return detected;
    }

    /**
     * Detect carboxylic acid groups (-COOH)
     */
    static _detectCarboxylicAcid(molecule) {
        const groups = [];

        molecule.atoms.forEach((atom, idx) => {
            if (atom.symbol === 'C') {
                const neighbors = MoleculeParser.getConnectedAtoms(molecule, idx);
                
                // Look for C=O and O-H
                let hasDoubleBondO = false;
                let hasSingleBondO = false;
                let oxygenIndices = { double: null, single: null };

                neighbors.forEach(conn => {
                    if (conn.atom.symbol === 'O') {
                        if (conn.bondOrder === 2) {
                            hasDoubleBondO = true;
                            oxygenIndices.double = conn.atomIndex;
                        } else if (conn.bondOrder === 1) {
                            // Check if this O has H (explicit or implicit)
                            const oNeighbors = MoleculeParser.getConnectedAtoms(molecule, conn.atomIndex);
                            const hasExplicitH = oNeighbors.some(n => n.atom.symbol === 'H');
                            const hasImplicitH = conn.atom.implicitHydrogens && conn.atom.implicitHydrogens > 0;
                            if (hasExplicitH || hasImplicitH) {
                                hasSingleBondO = true;
                                oxygenIndices.single = conn.atomIndex;
                            }
                        }
                    }
                });

                if (hasDoubleBondO && hasSingleBondO) {
                    groups.push({
                        type: 'carboxylicAcid',
                        carbonIndex: idx,
                        pattern: 'C(=O)O',
                        suffix: 'oic acid',
                        priority: this.PRIORITY.carboxylicAcid,
                        oxygenIndices
                    });
                }
            }
        });

        return groups;
    }

    /**
     * Detect ester groups (-COO-)
     */
    static _detectEster(molecule) {
        const groups = [];

        molecule.atoms.forEach((atom, idx) => {
            if (atom.symbol === 'C') {
                const neighbors = MoleculeParser.getConnectedAtoms(molecule, idx);
                
                let hasDoubleBondO = false;
                let hasSingleBondO = false;

                neighbors.forEach(conn => {
                    if (conn.atom.symbol === 'O') {
                        if (conn.bondOrder === 2) {
                            hasDoubleBondO = true;
                        } else if (conn.bondOrder === 1) {
                            // Check if connected to carbon (not hydrogen)
                            const oNeighbors = MoleculeParser.getConnectedAtoms(molecule, conn.atomIndex);
                            const hasC = oNeighbors.some(n => n.atom.symbol === 'C' && n.atomIndex !== idx);
                            if (hasC) {
                                hasSingleBondO = true;
                            }
                        }
                    }
                });

                if (hasDoubleBondO && hasSingleBondO) {
                    groups.push({
                        type: 'ester',
                        carbonIndex: idx,
                        pattern: 'C(=O)O',
                        suffix: 'oate',
                        priority: this.PRIORITY.ester
                    });
                }
            }
        });

        return groups;
    }

    /**
     * Detect peroxide groups (O-O)
     */
    static _detectPeroxide(molecule) {
        const groups = [];
        const detected = new Set();

        molecule.atoms.forEach((atom, idx) => {
            if (atom.symbol === 'O') {
                const neighbors = MoleculeParser.getConnectedAtoms(molecule, idx);
                
                neighbors.forEach(conn => {
                    if (conn.atom.symbol === 'O') {
                        const key = [Math.min(idx, conn.atomIndex), Math.max(idx, conn.atomIndex)].join('-');
                        if (!detected.has(key)) {
                            detected.add(key);
                            groups.push({
                                type: 'peroxide',
                                oxygenIndices: [idx, conn.atomIndex],
                                pattern: 'O-O',
                                suffix: 'hydroperoxide',
                                priority: this.PRIORITY.peroxide
                            });
                        }
                    }
                });
            }
        });

        return groups;
    }

    /**
     * Detect hypochlorite groups (C-O-Cl, C-O-Br, etc.)
     * Alkyl hypochlorites: R-O-Cl
     */
    static _detectHypochlorite(molecule) {
        const groups = [];

        molecule.atoms.forEach((atom, idx) => {
            if (atom.symbol === 'O') {
                const neighbors = MoleculeParser.getConnectedAtoms(molecule, idx);
                
                let hasCarbon = false;
                let hasHalogen = null;
                let carbonIdx = null;
                let halogenIdx = null;

                neighbors.forEach(conn => {
                    if (conn.atom.symbol === 'C') {
                        hasCarbon = true;
                        carbonIdx = conn.atomIndex;
                    }
                    if (['Cl', 'Br', 'I', 'F'].includes(conn.atom.symbol)) {
                        hasHalogen = conn.atom.symbol;
                        halogenIdx = conn.atomIndex;
                    }
                });

                // Pattern: C-O-Halogen
                if (hasCarbon && hasHalogen) {
                    groups.push({
                        type: 'hypochlorite',
                        oxygenIndex: idx,
                        carbonIndex: carbonIdx,
                        halogenIndex: halogenIdx,
                        halogen: hasHalogen,
                        pattern: `C-O-${hasHalogen}`,
                        suffix: 'hypochlorite',
                        priority: this.PRIORITY.hypochlorite
                    });
                }
            }
        });

        return groups;
    }

    /**
     * Detect amide groups (-CONH, -CON)
     */
    static _detectAmide(molecule) {
        const groups = [];

        molecule.atoms.forEach((atom, idx) => {
            if (atom.symbol === 'C') {
                const neighbors = MoleculeParser.getConnectedAtoms(molecule, idx);
                
                let hasDoubleBondO = false;
                let hasNitrogen = false;

                neighbors.forEach(conn => {
                    if (conn.atom.symbol === 'O' && conn.bondOrder === 2) {
                        hasDoubleBondO = true;
                    }
                    if (conn.atom.symbol === 'N') {
                        hasNitrogen = true;
                    }
                });

                if (hasDoubleBondO && hasNitrogen) {
                    groups.push({
                        type: 'amide',
                        carbonIndex: idx,
                        pattern: 'C(=O)N',
                        suffix: 'amide',
                        priority: this.PRIORITY.amide
                    });
                }
            }
        });

        return groups;
    }

    /**
     * Detect aldehyde groups (-CHO)
     */
    static _detectAldehyde(molecule) {
        const groups = [];

        molecule.atoms.forEach((atom, idx) => {
            if (atom.symbol === 'C') {
                const neighbors = MoleculeParser.getConnectedAtoms(molecule, idx);
                
                let hasDoubleBondO = false;
                let hasH = false;
                let carbonBonds = 0;

                neighbors.forEach(conn => {
                    if (conn.atom.symbol === 'O' && conn.bondOrder === 2) {
                        hasDoubleBondO = true;
                    }
                    if (conn.atom.symbol === 'H') {
                        hasH = true;
                    }
                    if (conn.atom.symbol === 'C') {
                        carbonBonds++;
                    }
                });
                
                // Check for implicit hydrogens
                if (atom.implicitHydrogens && atom.implicitHydrogens > 0) {
                    hasH = true;
                }

                // Aldehyde: one carbon, one double-bonded O, one H
                if (hasDoubleBondO && hasH && carbonBonds <= 1) {
                    groups.push({
                        type: 'aldehyde',
                        carbonIndex: idx,
                        pattern: 'C(=O)H',
                        suffix: 'al',
                        priority: this.PRIORITY.aldehyde
                    });
                }
            }
        });

        return groups;
    }

    /**
     * Detect ketone groups (C=O with two carbon neighbors)
     */
    static _detectKetone(molecule) {
        const groups = [];

        molecule.atoms.forEach((atom, idx) => {
            if (atom.symbol === 'C') {
                const neighbors = MoleculeParser.getConnectedAtoms(molecule, idx);
                
                let hasDoubleBondO = false;
                let carbonBonds = 0;

                neighbors.forEach(conn => {
                    if (conn.atom.symbol === 'O' && conn.bondOrder === 2) {
                        hasDoubleBondO = true;
                    }
                    if (conn.atom.symbol === 'C') {
                        carbonBonds++;
                    }
                });

                // Ketone: must have two carbon neighbors and C=O
                if (hasDoubleBondO && carbonBonds >= 2) {
                    groups.push({
                        type: 'ketone',
                        carbonIndex: idx,
                        pattern: 'C(=O)C',
                        suffix: 'one',
                        priority: this.PRIORITY.ketone
                    });
                }
            }
        });

        return groups;
    }

    /**
     * Detect alcohol groups (-OH)
     */
    static _detectAlcohol(molecule) {
        const groups = [];

        molecule.atoms.forEach((atom, idx) => {
            if (atom.symbol === 'O') {
                const neighbors = MoleculeParser.getConnectedAtoms(molecule, idx);
                
                // Alcohol: O bonded to C and H (explicit or implicit)
                let hasCarbon = false;
                let hasH = false;
                let carbonIndex = null;

                neighbors.forEach(conn => {
                    if (conn.atom.symbol === 'C') {
                        hasCarbon = true;
                        carbonIndex = conn.atomIndex;
                    }
                    if (conn.atom.symbol === 'H') hasH = true;
                });
                
                // Also check for implicit hydrogens on this oxygen
                if (atom.implicitHydrogens && atom.implicitHydrogens > 0) {
                    hasH = true;
                }

                if (hasCarbon && hasH) {
                    groups.push({
                        type: 'alcohol',
                        oxygenIndex: idx,
                        carbonIndex,
                        pattern: 'C-OH',
                        suffix: 'ol',
                        priority: this.PRIORITY.alcohol
                    });
                }
            }
        });

        return groups;
    }

    /**
     * Detect amine groups (-NH2, -NR2)
     */
    static _detectAmine(molecule) {
        const groups = [];

        molecule.atoms.forEach((atom, idx) => {
            if (atom.symbol === 'N') {
                const neighbors = MoleculeParser.getConnectedAtoms(molecule, idx);
                
                // Amine: N bonded to C and H (explicit or implicit)
                let hasCarbon = false;
                let hydrogenCount = 0;
                let carbonIndex = null;

                neighbors.forEach(conn => {
                    if (conn.atom.symbol === 'C') {
                        hasCarbon = true;
                        carbonIndex = conn.atomIndex;
                    }
                    if (conn.atom.symbol === 'H') hydrogenCount++;
                });
                
                // Check for implicit hydrogens on nitrogen
                if (atom.implicitHydrogens && atom.implicitHydrogens > 0) {
                    hydrogenCount += atom.implicitHydrogens;
                }

                if (hasCarbon && hydrogenCount > 0) {
                    groups.push({
                        type: 'amine',
                        nitrogenIndex: idx,
                        carbonIndex: carbonIndex,
                        pattern: 'C-NH',
                        suffix: 'amine',
                        priority: this.PRIORITY.amine,
                        hydrogenCount
                    });
                }
            }
        });

        return groups;
    }

    /**
     * Detect ether groups (C-O-C)
     */
    static _detectEther(molecule) {
        const groups = [];

        molecule.atoms.forEach((atom, idx) => {
            if (atom.symbol === 'O') {
                const neighbors = MoleculeParser.getConnectedAtoms(molecule, idx);
                
                // Ether: O bonded to TWO carbons (not H)
                const carbonNeighbors = neighbors.filter(n => n.atom.symbol === 'C');
                const hydrogenNeighbors = neighbors.filter(n => n.atom.symbol === 'H');

                if (carbonNeighbors.length === 2 && hydrogenNeighbors.length === 0) {
                    groups.push({
                        type: 'ether',
                        oxygenIndex: idx,
                        carbonIndices: [carbonNeighbors[0].atomIndex, carbonNeighbors[1].atomIndex],
                        pattern: 'C-O-C',
                        suffix: 'ether',
                        priority: this.PRIORITY.ether
                    });
                }
            }
        });

        return groups;
    }

    /**
     * Detect halide groups (C-X where X = F, Cl, Br, I)
     */
    static _detectHalide(molecule) {
        const groups = [];

        molecule.atoms.forEach((atom, idx) => {
            if (AtomValidator.isHalogen(atom) && atom.symbol !== 'H') {
                const neighbors = MoleculeParser.getConnectedAtoms(molecule, idx);
                
                // Halide bonded to carbon
                const carbonNeighbor = neighbors.find(n => n.atom.symbol === 'C');
                
                if (carbonNeighbor) {
                    groups.push({
                        type: 'halide',
                        halogenIndex: idx,
                        halogen: atom.symbol,
                        carbonIndex: carbonNeighbor.atomIndex,
                        pattern: `C-${atom.symbol}`,
                        suffix: atom.symbol.toLowerCase(),
                        priority: this.PRIORITY.halide
                    });
                }
            }
        });

        return groups;
    }

    /**
     * Detect alkene groups (C=C)
     */
    static _detectAlkene(molecule) {
        const groups = [];
        const detected = new Set();

        molecule.atoms.forEach((atom, idx) => {
            if (atom.symbol === 'C') {
                const neighbors = MoleculeParser.getConnectedAtoms(molecule, idx);
                
                neighbors.forEach(conn => {
                    if (conn.atom.symbol === 'C' && conn.bondOrder === 2) {
                        const key = [Math.min(idx, conn.atomIndex), Math.max(idx, conn.atomIndex)].join('-');
                        if (!detected.has(key)) {
                            detected.add(key);
                            groups.push({
                                type: 'alkene',
                                carbonIndices: [idx, conn.atomIndex],
                                pattern: 'C=C',
                                suffix: 'ene',
                                priority: this.PRIORITY.alkene
                            });
                        }
                    }
                });
            }
        });

        return groups;
    }

    /**
     * Detect alkyne groups (C≡C)
     */
    static _detectAlkyne(molecule) {
        const groups = [];
        const detected = new Set();

        molecule.atoms.forEach((atom, idx) => {
            if (atom.symbol === 'C') {
                const neighbors = MoleculeParser.getConnectedAtoms(molecule, idx);
                
                neighbors.forEach(conn => {
                    if (conn.atom.symbol === 'C' && conn.bondOrder === 3) {
                        const key = [Math.min(idx, conn.atomIndex), Math.max(idx, conn.atomIndex)].join('-');
                        if (!detected.has(key)) {
                            detected.add(key);
                            groups.push({
                                type: 'alkyne',
                                carbonIndices: [idx, conn.atomIndex],
                                pattern: 'C≡C',
                                suffix: 'yne',
                                priority: this.PRIORITY.alkyne
                            });
                        }
                    }
                });
            }
        });

        return groups;
    }

    /**
     * Get the primary functional group (highest priority)
     */
    static getPrimaryFunctionalGroup(functionalGroups) {
        const allGroups = [];
        
        Object.entries(functionalGroups).forEach(([type, groups]) => {
            groups.forEach(group => {
                allGroups.push(group);
            });
        });

        if (allGroups.length === 0) return null;

        // Sort by priority (lower = higher priority)
        allGroups.sort((a, b) => a.priority - b.priority);
        
        return allGroups[0];
    }

    /**
     * Count occurrences of a functional group
     */
    static countFunctionalGroup(functionalGroups, groupType) {
        return functionalGroups[groupType]?.length || 0;
    }

    /**
     * Detect nitriles (C≡N triple bonds)
     * Priority: 1.5 (high - suffix becomes 'nitrile')
     */
    static _detectNitrile(molecule) {
        const nitriles = [];
        
        molecule.bonds.forEach(bond => {
            if (bond.type === 'triple') {
                const atom1 = molecule.atoms[bond.source];
                const atom2 = molecule.atoms[bond.target];
                
                // Check if one is C and other is N
                if ((atom1 && atom2) && 
                    ((atom1.symbol === 'C' && atom2.symbol === 'N') ||
                    (atom1.symbol === 'N' && atom2.symbol === 'C'))) {
                    
                    const carbonIdx = atom1.symbol === 'C' ? bond.source : bond.target;
                    const nitrogenIdx = atom1.symbol === 'N' ? bond.source : bond.target;
                    
                    nitriles.push({
                        type: 'nitrile',
                        carbonIndex: carbonIdx,
                        nitrogenIndex: nitrogenIdx,
                        priority: this.PRIORITY.nitrile,
                        suffix: 'nitrile'
                    });
                }
            }
        });
        
        return nitriles;
    }

    /**
     * Detect nitro groups (R-NO2)
     * Single nitrogen bonded to two oxygens and carbon
     * Priority: 3.2 (moderate)
     */
    static _detectNitroGroup(molecule) {
        const nitroGroups = [];
        
        // Nitro groups are complex - simplified detection for now
        // Will enhance in later version
        // For now, return empty array
        return nitroGroups;
    }

    /**
     * Detect thiols (R-SH)
     * Sulfur bonded to hydrogen
     * Priority: 8.5 (low, like alcohols)
     */
    static _detectThiol(molecule) {
        const thiols = [];
        
        molecule.atoms.forEach((atom, atomIdx) => {
            if (atom.symbol === 'S') {
                const neighbors = MoleculeParser.getConnectedAtoms(molecule, atomIdx);
                
                let hasHydrogen = false;
                let hasCarbonConnection = false;
                
                // Check for implicit hydrogens on sulfur
                if (atom.implicitHydrogens && atom.implicitHydrogens > 0) {
                    hasHydrogen = true;
                }
                
                neighbors.forEach(conn => {
                    if (conn.atom.symbol === 'H') hasHydrogen = true;
                    if (conn.atom.symbol === 'C') hasCarbonConnection = true;
                });
                
                if (hasHydrogen && hasCarbonConnection) {
                    thiols.push({
                        type: 'thiol',
                        sulfurIndex: atomIdx,
                        priority: this.PRIORITY.thiol,
                        suffix: 'thiol'
                    });
                }
            }
        });
        
        return thiols;
    }

    /**
     * Get connected atoms helper (used by detection methods)
     */
    static getConnectedAtoms(molecule, atomIdx) {
        const neighbors = [];
        molecule.bonds.forEach(bond => {
            if (bond.source === atomIdx) neighbors.push(bond.target);
            if (bond.target === atomIdx) neighbors.push(bond.source);
        });
        return neighbors;
    }
}

module.exports = FunctionalGroupDetector;
