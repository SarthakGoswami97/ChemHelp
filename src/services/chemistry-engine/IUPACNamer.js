/**
 * IUPACNamer.js
 * Generates IUPAC names for chemical structures
 * Implements the systematic IUPAC nomenclature rules
 */

const MoleculeParser = require('./MoleculeParser');
const FunctionalGroupDetector = require('./FunctionalGroupDetector');
const AtomValidator = require('./AtomValidator');

class IUPACNamer {
    /**
     * Alkane parent chain names
     * Index corresponds to carbon count
     */
    static ALKANE_NAMES = [
        '',      // 0
        'meth',  // 1
        'eth',   // 2
        'prop',  // 3
        'but',   // 4
        'pent',  // 5
        'hex',   // 6
        'hept',  // 7
        'oct',   // 8
        'non',   // 9
        'dec',   // 10
        'undec', // 11
        'dodec', // 12
    ];

    /**
     * Names for substituent prefixes
     */
    static SUBSTITUENT_NAMES = {
        'methyl': 'methyl',
        'ethyl': 'ethyl',
        'propyl': 'propyl',
        'butyl': 'butyl',
        'pentyl': 'pentyl',
        'hexyl': 'hexyl'
    };

    /**
     * Generate IUPAC name for a molecule
     */
    static nameStructure(nodes, bonds) {
        try {
            // Parse molecule
            const molecule = MoleculeParser.parseMolecule(nodes, bonds);

            if (!molecule.isValid && molecule.warnings.length > 0) {
                console.warn('Structure warnings:', molecule.warnings);
            }

            // Quick validation
            if (molecule.atoms.length === 0) {
                return {
                    success: false,
                    error: 'No atoms in structure',
                    iupacName: '',
                    commonName: '',
                    confidence: 0
                };
            }

            // Detect functional groups
            const functionalGroups = FunctionalGroupDetector.detectFunctionalGroups(molecule);
            
            // Build the name
            const result = this._buildIUPACName(molecule, functionalGroups);

            return {
                success: true,
                iupacName: result.name,
                commonName: result.commonName || '',
                molecularFormula: this._calculateMolecularFormula(molecule),
                functionalGroups: Object.keys(functionalGroups),
                confidence: result.confidence,
                structureType: result.structureType
            };
        } catch (error) {
            console.error('Error naming structure:', error);
            return {
                success: false,
                error: error.message,
                iupacName: '',
                commonName: '',
                confidence: 0
            };
        }
    }

    /**
     * Build IUPAC name from molecule structure
     */
    static _buildIUPACName(molecule, functionalGroups) {
        // Check for special cases first
        const carbonCount = molecule.atoms.filter(a => a.symbol === 'C').length;
        const totalAtomCount = molecule.atoms.length;

        // Handle simple inorganic compounds first
        if (carbonCount === 0) {
            return this._nameInorganicCompound(molecule);
        }
        
        // Handle carbon monoxide (C≡O) and carbon dioxide (O=C=O)
        if (carbonCount === 1) {
            const oxygenCount = molecule.atoms.filter(a => a.symbol === 'O').length;
            const carbonAtom = molecule.atoms.find(a => a.symbol === 'C');
            const carbonIdx = molecule.atoms.indexOf(carbonAtom);
            const connections = MoleculeParser.getConnectedAtoms(molecule, carbonIdx);
            
            // Carbon dioxide: O=C=O (1 carbon, 2 oxygens, both double bonded)
            if (oxygenCount === 2 && connections.length === 2) {
                const allDoubleToO = connections.every(c => c.atom.symbol === 'O' && c.bondOrder === 2);
                if (allDoubleToO) {
                    return { name: 'carbon dioxide', commonName: 'CO₂', confidence: 0.99, structureType: 'inorganic' };
                }
            }
            
            // Carbon monoxide: C≡O (1 carbon, 1 oxygen, triple bond, no hydrogen)
            if (oxygenCount === 1 && connections.length === 1) {
                const conn = connections[0];
                if (conn.atom.symbol === 'O' && conn.bondOrder === 3) {
                    return { name: 'carbon monoxide', commonName: 'CO', confidence: 0.99, structureType: 'inorganic' };
                }
            }
        }
        
        // Check for benzene ring (6 carbons with alternating double bonds)
        if (this._hasBenzeneRing(molecule)) {
            // Check for substituents
            const substituents = this._getBenzeneSubstituents(molecule);
            if (substituents.length === 0) {
                return { name: 'benzene', commonName: 'C₆H₆', confidence: 0.98, structureType: 'aromatic' };
            }
            if (substituents.includes('methyl')) {
                return { name: 'toluene', commonName: 'methylbenzene', confidence: 0.95, structureType: 'aromatic' };
            }
            if (substituents.includes('hydroxyl')) {
                return { name: 'phenol', commonName: 'hydroxybenzene', confidence: 0.95, structureType: 'aromatic' };
            }
            if (substituents.includes('amino')) {
                return { name: 'aniline', commonName: 'aminobenzene', confidence: 0.95, structureType: 'aromatic' };
            }
            // Generic substituted benzene
            return { name: substituents[0] + 'benzene', commonName: '', confidence: 0.85, structureType: 'aromatic' };
        }

        // Check for urea (H2N-CO-NH2) - special case before amide
        if (functionalGroups.amide && functionalGroups.amide.length > 0) {
            // Urea has C=O with two N atoms attached
            const carbonyl = functionalGroups.amide[0];
            const carbonIdx = carbonyl.carbonIndex;
            const neighbors = MoleculeParser.getConnectedAtoms(molecule, carbonIdx);
            const nitrogenNeighbors = neighbors.filter(n => n.atom.symbol === 'N');
            if (nitrogenNeighbors.length === 2 && carbonCount === 1) {
                return { name: 'urea', commonName: 'carbamide', confidence: 0.95, structureType: 'amide' };
            }
            return this._nameAmideCompound(molecule, functionalGroups);
        }
        
        // Check for esters (important for students: methyl formate, ethyl acetate)
        if (functionalGroups.ester && functionalGroups.ester.length > 0) {
            return this._nameEsterCompound(molecule, functionalGroups);
        }

        // Check for nitriles first (high priority after carboxylic acid)
        if (functionalGroups.nitrile && functionalGroups.nitrile.length > 0) {
            return this._nameNitrileCompound(molecule, functionalGroups);
        }

        // Check for peroxide groups (high priority)
        if (functionalGroups.peroxide && functionalGroups.peroxide.length > 0) {
            return this._namePeroxideCompound(molecule, functionalGroups);
        }

        // Check for hypochlorite groups (C-O-Cl, C-O-Br)
        if (functionalGroups.hypochlorite && functionalGroups.hypochlorite.length > 0) {
            return this._nameHypochloriteCompound(molecule, functionalGroups);
        }

        // Single carbon compounds
        if (carbonCount === 1) {
            return this._nameSingleCarbon(molecule, functionalGroups);
        }

        // Find longest carbon chain
        const longestChain = MoleculeParser.findLongestCarbonChain(molecule);
        
        if (longestChain.length === 0) {
            // No carbon chain - probably a single atom
            return {
                name: this._nameSimpleAtom(molecule),
                commonName: '',
                confidence: 0.8,
                structureType: 'simple'
            };
        }

        // Hydrocarbons (alkanes, alkenes, alkynes)
        if (Object.keys(functionalGroups).length === 0) {
            return this._nameHydrocarbon(molecule, longestChain);
        }

        // Compounds with functional groups
        return this._nameFunctionalCompound(molecule, longestChain, functionalGroups);
    }

    /**
     * Check if molecule is a benzene ring (legacy method for exact 6 carbons)
     */
    static _isBenzeneRing(molecule) {
        const carbons = molecule.atoms.filter(a => a.symbol === 'C');
        if (carbons.length !== 6) return false;
        
        // Check that each carbon has exactly 2 carbon neighbors
        // and the ring has alternating single/double bonds
        let doubleBondCount = 0;
        let singleBondCount = 0;
        
        molecule.bonds.forEach(bond => {
            const atom1 = molecule.atoms[bond.source];
            const atom2 = molecule.atoms[bond.target];
            if (atom1?.symbol === 'C' && atom2?.symbol === 'C') {
                if (bond.order === 2) doubleBondCount++;
                else if (bond.order === 1) singleBondCount++;
            }
        });
        
        // Benzene has 3 double bonds and 3 single bonds
        return doubleBondCount === 3 && singleBondCount === 3;
    }

    /**
     * Check if molecule contains a benzene ring (may have substituents)
     */
    static _hasBenzeneRing(molecule) {
        const carbons = molecule.atoms.filter(a => a.symbol === 'C');
        if (carbons.length < 6) return false;
        
        // Find rings in the molecule and check for benzene pattern
        // Count C-C double and single bonds in a potential 6-membered ring
        let doubleBondCount = 0;
        let singleBondCount = 0;
        
        molecule.bonds.forEach(bond => {
            const atom1 = molecule.atoms[bond.source];
            const atom2 = molecule.atoms[bond.target];
            if (atom1?.symbol === 'C' && atom2?.symbol === 'C') {
                if (bond.order === 2) doubleBondCount++;
                else if (bond.order === 1) singleBondCount++;
            }
        });
        
        // Benzene ring (possibly with substituents) has 3 double + 3+ single bonds
        return doubleBondCount === 3 && singleBondCount >= 3;
    }

    /**
     * Get substituents attached to benzene ring
     */
    static _getBenzeneSubstituents(molecule) {
        const substituents = [];
        const carbons = molecule.atoms.filter(a => a.symbol === 'C');
        
        // Find non-ring carbons (attached to exactly 1 carbon)
        molecule.atoms.forEach((atom, idx) => {
            const neighbors = MoleculeParser.getConnectedAtoms(molecule, idx);
            const carbonNeighbors = neighbors.filter(n => n.atom.symbol === 'C');
            
            if (atom.symbol === 'C' && carbonNeighbors.length === 1) {
                // This might be a methyl substituent
                const ringCarbon = carbonNeighbors[0];
                const ringNeighbors = MoleculeParser.getConnectedAtoms(molecule, ringCarbon.atomIndex);
                const ringCarbonNeighborCount = ringNeighbors.filter(n => n.atom.symbol === 'C').length;
                if (ringCarbonNeighborCount >= 2) {
                    // Attached to ring
                    substituents.push('methyl');
                }
            }
            
            if (atom.symbol === 'O' && neighbors.length === 1) {
                const neighbor = neighbors[0];
                if (neighbor.atom.symbol === 'C' && neighbor.bondOrder === 1) {
                    // O attached to C with single bond - could be hydroxyl
                    substituents.push('hydroxyl');
                }
            }
            
            if (atom.symbol === 'N' && neighbors.length === 1) {
                const neighbor = neighbors[0];
                if (neighbor.atom.symbol === 'C' && neighbor.bondOrder === 1) {
                    substituents.push('amino');
                }
            }
        });
        
        return substituents;
    }

    /**
     * Name inorganic compounds (no carbon or simple diatomic molecules)
     */
    static _nameInorganicCompound(molecule) {
        const atomNames = {
            'H': 'Hydrogen',
            'O': 'Oxygen',
            'N': 'Nitrogen',
            'F': 'Fluorine',
            'Cl': 'Chlorine',
            'Br': 'Bromine',
            'I': 'Iodine',
            'S': 'Sulfur',
            'P': 'Phosphorus',
            'Na': 'Sodium',
            'K': 'Potassium',
            'Ca': 'Calcium'
        };

        if (molecule.atoms.length === 1) {
            const atom = molecule.atoms[0];
            return {
                name: atomNames[atom.symbol] || atom.symbol,
                commonName: '',
                confidence: 0.95,
                structureType: 'element'
            };
        }

        if (molecule.atoms.length === 2) {
            const atom1 = molecule.atoms[0];
            const atom2 = molecule.atoms[1];
            const name1 = atomNames[atom1.symbol] || atom1.symbol;
            const name2 = atomNames[atom2.symbol] || atom2.symbol;
            const symbols = [atom1.symbol, atom2.symbol].sort().join('');
            
            // Special case: O-O compounds - distinguish O2 (double bond) from H2O2 (single bond)
            if (symbols === 'OO') {
                // Check bond order
                const bond = molecule.bonds[0];
                if (bond && bond.order === 2) {
                    // O=O is oxygen gas
                    return {
                        name: 'oxygen',
                        commonName: 'O₂',
                        confidence: 0.98,
                        structureType: 'element'
                    };
                } else {
                    // O-O is hydrogen peroxide
                    return {
                        name: 'hydrogen peroxide',
                        commonName: 'H₂O₂',
                        confidence: 0.98,
                        structureType: 'peroxide'
                    };
                }
            }
            
            // Diatomic molecules
            const compoundName = `${name1} ${name2.toLowerCase()}`;
            
            // Common names
            let commonName = '';
            if (symbols === 'ClH') commonName = 'HCl';
            if (symbols === 'BrH') commonName = 'HBr';
            if (symbols === 'FH') commonName = 'HF';
            if (symbols === 'IH') commonName = 'HI';
            if (symbols === 'NO') commonName = 'NO (Nitrogen monoxide)';
            if (symbols === 'O2') commonName = 'O₂';
            if (symbols === 'N2') commonName = 'N₂';
            
            return {
                name: compoundName,
                commonName: commonName,
                confidence: 0.95,
                structureType: 'inorganic'
            };
        }

        // Check for ammonia (NH3 with explicit H atoms)
        const hydrogenCount = molecule.atoms.filter(a => a.symbol === 'H').length;
        const nitrogenCount = molecule.atoms.filter(a => a.symbol === 'N').length;
        const oxygenCount = molecule.atoms.filter(a => a.symbol === 'O').length;
        
        if (hydrogenCount === 3 && nitrogenCount === 1 && oxygenCount === 0) {
            return {
                name: 'ammonia',
                commonName: 'NH₃',
                confidence: 0.98,
                structureType: 'inorganic'
            };
        }

        // Check for water (H2O with explicit H atoms)
        if (hydrogenCount === 2 && oxygenCount === 1 && nitrogenCount === 0) {
            return {
                name: 'water',
                commonName: 'H₂O',
                confidence: 0.98,
                structureType: 'inorganic'
            };
        }

        return {
            name: 'Inorganic Compound',
            commonName: '',
            confidence: 0.6,
            structureType: 'inorganic'
        };
    }

    /**
     * Name hypochlorite compounds (R-O-Cl)
     * Example: methyl hypochlorite (CH3-O-Cl)
     */
    static _nameHypochloriteCompound(molecule, functionalGroups) {
        const hypochlorite = functionalGroups.hypochlorite[0];
        const halogen = hypochlorite.halogen;
        
        // Count carbon chain
        const carbonCount = molecule.atoms.filter(a => a.symbol === 'C').length;
        const parentName = this.ALKANE_NAMES[carbonCount] || 'meth';
        
        // Name based on halogen
        const halogenSuffix = halogen === 'Cl' ? 'hypochlorite' : 
                             halogen === 'Br' ? 'hypobromite' :
                             halogen === 'I' ? 'hypoiodite' :
                             halogen === 'F' ? 'hypofluorite' : 'hypohalite';
        
        const name = `${parentName}yl ${halogenSuffix}`;
        const commonName = carbonCount === 1 ? `methyl ${halogenSuffix}` : '';
        
        return { 
            name: name, 
            commonName: commonName, 
            confidence: 0.92, 
            structureType: 'hypochlorite' 
        };
    }

    /**
     * Name amide compounds (R-CONH2)
     * Important for students: formamide (HCONH2), acetamide (CH3CONH2)
     */
    static _nameAmideCompound(molecule, functionalGroups) {
        const carbonCount = molecule.atoms.filter(a => a.symbol === 'C').length;
        const parentName = this.ALKANE_NAMES[carbonCount] || 'meth';
        
        // Special names for common amides
        if (carbonCount === 1) {
            return { name: 'formamide', commonName: 'methanamide', confidence: 0.95, structureType: 'amide' };
        }
        if (carbonCount === 2) {
            return { name: 'acetamide', commonName: 'ethanamide', confidence: 0.95, structureType: 'amide' };
        }
        
        // IUPAC naming: alkanamide
        const name = parentName + 'anamide';
        return { name: name, commonName: '', confidence: 0.90, structureType: 'amide' };
    }

    /**
     * Name ester compounds (R-COO-R')
     * Important for students: methyl formate (HCOOCH3), ethyl acetate (CH3COOC2H5)
     */
    static _nameEsterCompound(molecule, functionalGroups) {
        const ester = functionalGroups.ester[0];
        const carbonylC = ester.carbonIndex;
        
        // Find the two parts: acid part and alkyl part
        // Carbonyl carbon is connected to C=O and O-C
        const neighbors = MoleculeParser.getConnectedAtoms(molecule, carbonylC);
        
        let acidChainLength = 0;
        let alkylChainLength = 0;
        
        neighbors.forEach(conn => {
            if (conn.atom.symbol === 'C') {
                // This is part of the acid chain
                acidChainLength++;
            }
            if (conn.atom.symbol === 'O' && conn.bondOrder === 1) {
                // Find the alkyl group attached to this oxygen
                const oNeighbors = MoleculeParser.getConnectedAtoms(molecule, conn.atomIndex);
                oNeighbors.forEach(oConn => {
                    if (oConn.atom.symbol === 'C' && oConn.atomIndex !== carbonylC) {
                        // Count carbons in alkyl chain
                        alkylChainLength = this._countChainFromAtom(molecule, oConn.atomIndex, conn.atomIndex);
                    }
                });
            }
        });
        
        // Determine acid and alkyl parts
        const totalCarbons = molecule.atoms.filter(a => a.symbol === 'C').length;
        acidChainLength = acidChainLength + 1; // Include carbonyl carbon
        
        // Common ester names
        if (totalCarbons === 2) {
            // Could be methyl formate (HCOOCH3)
            return { name: 'methyl formate', commonName: 'methyl methanoate', confidence: 0.90, structureType: 'ester' };
        }
        if (totalCarbons === 4) {
            // Ethyl acetate (CH3COOC2H5)
            return { name: 'ethyl acetate', commonName: 'ethyl ethanoate', confidence: 0.90, structureType: 'ester' };
        }
        
        // Generic naming: alkyl alkanoate
        const alkylName = this.ALKANE_NAMES[alkylChainLength] || 'meth';
        const acidName = this.ALKANE_NAMES[acidChainLength] || 'meth';
        
        const name = `${alkylName}yl ${acidName}anoate`;
        return { name: name, commonName: '', confidence: 0.85, structureType: 'ester' };
    }

    /**
     * Helper: Count carbons in a chain starting from an atom
     */
    static _countChainFromAtom(molecule, startIdx, excludeIdx) {
        const visited = new Set([excludeIdx]);
        let count = 0;
        
        const stack = [startIdx];
        while (stack.length > 0) {
            const idx = stack.pop();
            if (visited.has(idx)) continue;
            visited.add(idx);
            
            const atom = molecule.atoms[idx];
            if (atom.symbol === 'C') {
                count++;
                const neighbors = MoleculeParser.getConnectedAtoms(molecule, idx);
                neighbors.forEach(conn => {
                    if (!visited.has(conn.atomIndex)) {
                        stack.push(conn.atomIndex);
                    }
                });
            }
        }
        
        return count;
    }

    /**
     * Name peroxide compounds (with halogens or other groups)
     */
    static _namePeroxideCompound(molecule, functionalGroups) {
        const peroxide = functionalGroups.peroxide[0];
        const halides = functionalGroups.halide || [];
        
        // For Cl-CH2-O-OH or CH3-O-OH type structures
        if (halides.length > 0) {
            const halide = halides[0];
            const halogenName = halide.halogen === 'Cl' ? 'chloro' : 
                               halide.halogen === 'Br' ? 'bromo' :
                               halide.halogen === 'F' ? 'fluoro' :
                               halide.halogen === 'I' ? 'iodo' : '';
            
            // Find the carbon chain (typically 1 carbon for CH2)
            const longestChain = MoleculeParser.findLongestCarbonChain(molecule);
            const chainLength = longestChain.length || 1;
            const parentName = this.ALKANE_NAMES[chainLength] || 'meth';
            
            // Build name: chloromethyl hydroperoxide
            const name = `${halogenName}${parentName}yl hydroperoxide`;
            
            return {
                name: name,
                commonName: `${halogenName}${parentName}yl hydroperoxide`,
                confidence: 0.93,
                structureType: 'peroxide'
            };
        }
        
        // Non-halogenated peroxide (e.g., CH3-O-OH = methyl hydroperoxide)
        const carbonCount = molecule.atoms.filter(a => a.symbol === 'C').length;
        if (carbonCount > 0) {
            const longestChain = MoleculeParser.findLongestCarbonChain(molecule);
            const chainLength = longestChain.length || 1;
            const parentName = this.ALKANE_NAMES[chainLength] || 'meth';
            
            const name = `${parentName}yl hydroperoxide`;
            return {
                name: name,
                commonName: `${parentName}yl hydroperoxide`,
                confidence: 0.91,
                structureType: 'peroxide'
            };
        }
        
        // Generic peroxide without carbon
        return {
            name: 'hydroperoxide',
            commonName: 'hydrogen peroxide',
            confidence: 0.85,
            structureType: 'peroxide'
        };
    }

    /**
     * Name single carbon compounds
     */
    static _nameSingleCarbon(molecule, functionalGroups) {
        const primaryGroup = FunctionalGroupDetector.getPrimaryFunctionalGroup(functionalGroups);
        const carbonAtom = molecule.atoms.find(a => a.symbol === 'C');
        const implicitH = carbonAtom ? carbonAtom.implicitHydrogens : 0;
        
        // Check for aldehyde first (C=O with H attached)
        if (primaryGroup && primaryGroup.type === 'aldehyde') {
            return { name: 'formaldehyde', commonName: 'HCHO', confidence: 0.98, structureType: 'aldehyde' };
        }
        
        // Check for aldehyde by implicit H and double bond O
        const oxygenCount = molecule.atoms.filter(a => a.symbol === 'O').length;
        if (oxygenCount === 1 && implicitH >= 2) {
            // C with 2H and double bond to O = formaldehyde  
            const oxygenBonds = molecule.bonds.filter(b => 
                (molecule.atoms[b.source]?.symbol === 'O' || molecule.atoms[b.target]?.symbol === 'O')
            );
            if (oxygenBonds.length > 0 && oxygenBonds[0].order === 2) {
                return { name: 'formaldehyde', commonName: 'HCHO', confidence: 0.98, structureType: 'aldehyde' };
            }
        }

        if (!primaryGroup) {
            // Check if there are non-carbon atoms
            const nitrogenCount = molecule.atoms.filter(a => a.symbol === 'N').length;
            const sulfurCount = molecule.atoms.filter(a => a.symbol === 'S').length;
            const halideCount = molecule.atoms.filter(a => ['F', 'Cl', 'Br', 'I'].includes(a.symbol)).length;
            
            // Carbon monoxide: C=O with NO hydrogens
            if (oxygenCount === 1 && nitrogenCount === 0 && sulfurCount === 0 && halideCount === 0 && implicitH === 0) {
                const oxygenBonds = molecule.bonds.filter(b => 
                    (molecule.atoms[b.source]?.symbol === 'O' || molecule.atoms[b.target]?.symbol === 'O')
                );
                if (oxygenBonds.length > 0 && oxygenBonds[0].order === 2) {
                    return { name: 'carbon monoxide', commonName: 'CO', confidence: 0.99, structureType: 'inorganic' };
                }
            }
            
            // Methane: just C (with 4 implicit H)
            if (implicitH === 4 && oxygenCount === 0) {
                return { name: 'methane', commonName: 'CH₄', confidence: 0.99, structureType: 'alkane' };
            }
            
            // Default
            return { name: 'methane', commonName: 'CH₄', confidence: 0.95, structureType: 'alkane' };
        }

        if (primaryGroup.type === 'carboxylicAcid') {
            // Check if there's also a halogen on the carboxylic acid carbon (chloroformic acid, etc.)
            const halides = functionalGroups.halide || [];
            if (halides.length > 0) {
                const halogen = halides[0].halogen;
                const halogenPrefix = halogen === 'Cl' ? 'chloro' : 
                                     halogen === 'Br' ? 'bromo' :
                                     halogen === 'F' ? 'fluoro' :
                                     halogen === 'I' ? 'iodo' : '';
                return { name: `${halogenPrefix}formic acid`, commonName: `${halogenPrefix}HCOOH`, confidence: 0.92, structureType: 'carboxylic acid' };
            }
            return { name: 'formic acid', commonName: 'HCOOH', confidence: 0.95, structureType: 'carboxylic acid' };
        }

        if (primaryGroup.type === 'aldehyde') {
            return { name: 'formaldehyde', commonName: 'HCHO', confidence: 0.95, structureType: 'aldehyde' };
        }

        if (primaryGroup.type === 'amine') {
            return { name: 'methanamine', commonName: 'CH₃NH₂', confidence: 0.90, structureType: 'amine' };
        }
        
        if (primaryGroup.type === 'alcohol') {
            // Check if there's also a halide (chloromethanol, etc.)
            const halides = functionalGroups.halide || [];
            if (halides.length > 0) {
                const halogen = halides[0].halogen;
                const prefix = halogen === 'Cl' ? 'chloro' : 
                              halogen === 'Br' ? 'bromo' :
                              halogen === 'F' ? 'fluoro' :
                              halogen === 'I' ? 'iodo' : '';
                return { name: `${prefix}methanol`, commonName: `${prefix}methyl alcohol`, confidence: 0.95, structureType: 'haloalcohol' };
            }
            return { name: 'methanol', commonName: 'CH₃OH', confidence: 0.95, structureType: 'alcohol' };
        }
        
        if (primaryGroup.type === 'halide') {
            const halogen = primaryGroup.halogen;
            
            // Count all halogens of this type
            const halogens = functionalGroups.halide || [];
            const haloCount = halogens.filter(h => h.halogen === halogen).length;
            
            const haloBasePrefix = halogen === 'Cl' ? 'chloro' : 
                                  halogen === 'Br' ? 'bromo' :
                                  halogen === 'F' ? 'fluoro' :
                                  halogen === 'I' ? 'iodo' : '';
            
            // Add multiplying prefix for multiple halogens
            const multiplierPrefixes = { 1: '', 2: 'di', 3: 'tri', 4: 'tetra', 5: 'penta', 6: 'hexa', 7: 'hepta', 8: 'octa', 9: 'nona' };
            const multiplier = multiplierPrefixes[haloCount] || '';
            const prefix = multiplier + haloBasePrefix;
            
            return { name: `${prefix}methane`, commonName: `CH${4-haloCount}${halogen}${haloCount}`, confidence: 0.95, structureType: 'haloalkane' };
        }
        
        if (primaryGroup.type === 'thiol') {
            return { name: 'methanethiol', commonName: 'CH₃SH', confidence: 0.95, structureType: 'thiol' };
        }

        return { name: 'methane', commonName: '', confidence: 0.5, structureType: 'unknown' };
    }

    /**
     * Name simple single atoms
     */
    static _nameSimpleAtom(molecule) {
        if (molecule.atoms.length === 1) {
            const atom = molecule.atoms[0];
            const names = {
                'H': 'Hydrogen',
                'C': 'Carbon',
                'O': 'Oxygen',
                'N': 'Nitrogen',
                'S': 'Sulfur',
                'P': 'Phosphorus',
                'Cl': 'Chlorine',
                'Br': 'Bromine',
                'I': 'Iodine',
                'F': 'Fluorine'
            };
            return names[atom.symbol] || atom.symbol;
        }
        return 'Compound';
    }

    /**
     * Name hydrocarbons (alkanes, alkenes, alkynes)
     */
    static _nameHydrocarbon(molecule, longestChain) {
        const chainLength = longestChain.length;
        const parentName = this.ALKANE_NAMES[chainLength] || 'poly';

        // Check for unsaturation
        let hasAlkene = false;
        let hasAlkyne = false;
        let doubleLocant = null;
        let tripleLocant = null;

        longestChain.forEach((atomIdx, position) => {
            if (position < longestChain.length - 1) {
                const nextIdx = longestChain[position + 1];
                const bond = molecule.bonds.find(b => 
                    (b.source === atomIdx && b.target === nextIdx) ||
                    (b.source === nextIdx && b.target === atomIdx)
                );

                if (bond) {
                    if (bond.order === 2) {
                        hasAlkene = true;
                        doubleLocant = position + 1; // IUPAC numbers from lowest locant
                    } else if (bond.order === 3) {
                        hasAlkyne = true;
                        tripleLocant = position + 1;
                    }
                }
            }
        });

        let suffix = 'ane';
        let unsaturatedPart = '';

        if (hasAlkyne) {
            suffix = 'yne';
            unsaturatedPart = tripleLocant ? `${tripleLocant}-` : '';
        } else if (hasAlkene) {
            suffix = 'ene';
            unsaturatedPart = doubleLocant ? `${doubleLocant}-` : '';
        }

        const name = unsaturatedPart + parentName + suffix;

        return {
            name: name,
            commonName: this._getCommonName(chainLength, hasAlkene, hasAlkyne),
            confidence: 0.95,
            structureType: hasAlkyne ? 'alkyne' : hasAlkene ? 'alkene' : 'alkane'
        };
    }

    /**
     * Name compounds with functional groups
     */
    static _nameFunctionalCompound(molecule, longestChain, functionalGroups) {
        const primaryGroup = FunctionalGroupDetector.getPrimaryFunctionalGroup(functionalGroups);
        
        if (!primaryGroup) {
            return {
                name: 'Unknown compound',
                commonName: '',
                confidence: 0.3,
                structureType: 'unknown'
            };
        }

        const chainLength = longestChain.length;
        const parentName = this.ALKANE_NAMES[chainLength] || 'poly';
        let suffix = primaryGroup.suffix || '';
        
        // Build the IUPAC name
        let name = '';
        
        // Handle different functional group types
        switch (primaryGroup.type) {
            case 'alcohol':
                // Check if there's also a halide (chloroethanol, etc.)
                if (functionalGroups.halide && functionalGroups.halide.length > 0) {
                    const hal = functionalGroups.halide[0].halogen;
                    const halPrefix = hal === 'Cl' ? 'chloro' : 
                                     hal === 'Br' ? 'bromo' :
                                     hal === 'F' ? 'fluoro' :
                                     hal === 'I' ? 'iodo' : '';
                    name = halPrefix + parentName + 'anol';
                } else {
                    // ethanol, propanol, butanol, etc.
                    name = parentName + 'anol';
                }
                break;
            case 'aldehyde':
                // ethanal, propanal, butanal, etc.
                name = parentName + 'anal';
                break;
            case 'ketone':
                // propanone, butanone, etc.
                name = parentName + 'anone';
                break;
            case 'carboxylicAcid':
                // Check if there's also a halogen on the carboxylic acid carbon
                const carboxylicHalides = functionalGroups.halide || [];
                if (carboxylicHalides.length > 0) {
                    const halogen = carboxylicHalides[0].halogen;
                    const halogenPrefix = halogen === 'Cl' ? 'chloro' : 
                                         halogen === 'Br' ? 'bromo' :
                                         halogen === 'F' ? 'fluoro' :
                                         halogen === 'I' ? 'iodo' : '';
                    name = halogenPrefix + parentName + 'anoic acid';
                } else {
                    // ethanoic acid, propanoic acid, etc.
                    name = parentName + 'anoic acid';
                }
                break;
            case 'amine':
                // ethanamine, propanamine, etc.
                name = parentName + 'anamine';
                break;
            case 'halide':
                // Check for unsaturation (chloroethene, not chloroethane)
                const halogen = primaryGroup.halogen;
                
                // Count all halogens of this type
                const halogens = functionalGroups.halide || [];
                const haloCount = halogens.filter(h => h.halogen === halogen).length;
                
                const haloBasePrefix = halogen === 'Cl' ? 'chloro' : 
                                      halogen === 'Br' ? 'bromo' :
                                      halogen === 'F' ? 'fluoro' :
                                      halogen === 'I' ? 'iodo' : '';
                
                // Add multiplying prefix for multiple halogens
                const multiplierPrefixes = { 1: '', 2: 'di', 3: 'tri', 4: 'tetra', 5: 'penta', 6: 'hexa', 7: 'hepta', 8: 'octa', 9: 'nona' };
                const multiplier = multiplierPrefixes[haloCount] || '';
                const haloPrefix = multiplier + haloBasePrefix;
                
                // Check for double or triple bonds
                const hasDoubleBond = molecule.bonds.some(b => b.order === 2 && 
                    molecule.atoms[b.source]?.symbol === 'C' && 
                    molecule.atoms[b.target]?.symbol === 'C');
                const hasTripleBond = molecule.bonds.some(b => b.order === 3 && 
                    molecule.atoms[b.source]?.symbol === 'C' && 
                    molecule.atoms[b.target]?.symbol === 'C');
                if (hasTripleBond) {
                    name = haloPrefix + parentName + 'yne';
                } else if (hasDoubleBond) {
                    name = haloPrefix + parentName + 'ene';
                } else {
                    name = haloPrefix + parentName + 'ane';
                }
                break;
            case 'ether':
                name = parentName + 'ether';
                break;
            case 'nitrile':
                name = parentName + 'nitrile';
                break;
            case 'thiol':
                name = parentName + 'anethiol';
                break;
            default:
                name = parentName + (suffix || 'ane');
        }

        return {
            name: name,
            commonName: primaryGroup.type,
            confidence: 0.85,
            structureType: primaryGroup.type
        };
    }

    /**
     * Get common names for simple hydrocarbons
     */
    static _getCommonName(chainLength, isAlkene = false, isAlkyne = false) {
        const commonNames = {
            1: 'methane',
            2: 'ethane',
            3: 'propane',
            4: 'butane',
            5: 'pentane',
            6: 'hexane',
            7: 'heptane',
            8: 'octane',
            9: 'nonane',
            10: 'decane'
        };

        let name = commonNames[chainLength] || '';
        
        if (isAlkene) {
            name = name.replace('ane', 'ene');
        } else if (isAlkyne) {
            name = name.replace('ane', 'yne');
        }

        return name;
    }

    /**
     * Calculate molecular formula from molecule
     */
    static _calculateMolecularFormula(molecule) {
        const counts = {};

        molecule.atoms.forEach(atom => {
            counts[atom.symbol] = (counts[atom.symbol] || 0) + 1;
            
            // Add implicit hydrogens
            if (atom.implicitHydrogens && atom.implicitHydrogens > 0) {
                counts['H'] = (counts['H'] || 0) + atom.implicitHydrogens;
            }
        });

        // Formula order: C, H, then others alphabetically
        let formula = '';
        
        if (counts['C']) {
            formula += `C${counts['C'] > 1 ? counts['C'] : ''}`;
            delete counts['C'];
        }
        
        if (counts['H']) {
            formula += `H${counts['H'] > 1 ? counts['H'] : ''}`;
            delete counts['H'];
        }

        // Add remaining atoms alphabetically
        Object.keys(counts).sort().forEach(symbol => {
            formula += `${symbol}${counts[symbol] > 1 ? counts[symbol] : ''}`;
        });

        return formula;
    }

    /**
     * Name nitrile compounds (R-C≡N)
     * Nitriles have suffix -nitrile
     */
    static _nameNitrileCompound(molecule, functionalGroups) {
        const nitrile = functionalGroups.nitrile[0];
        const longestChain = MoleculeParser.findLongestCarbonChain(molecule);
        
        if (!longestChain || longestChain.length === 0) {
            // Simple nitrile - just HCN
            return {
                name: 'nitrile',
                commonName: 'hydrogen cyanide',
                confidence: 0.95,
                structureType: 'nitrile'
            };
        }

        // The carbon in C≡N is typically the terminal carbon
        // Nitrile carbon counts as part of the main chain
        const chainLength = longestChain.length;
        const prefix = this.ALKANE_NAMES[chainLength] || 'poly';
        
        let name = prefix + 'nitrile';
        
        // Nitriles end in -nitrile, so no -e ending
        if (name.endsWith('anitrile')) {
            name = name.slice(0, -8) + 'nitrile'; // Remove 'a' before nitrile
        }
        
        // Check for substituents (like chloronitriles)
        let prefix_str = '';
        if (functionalGroups.halide && functionalGroups.halide.length > 0) {
            const halide = functionalGroups.halide[0];
            const haloName = halide.halogen === 'Cl' ? 'chloro-' : 
                            halide.halogen === 'Br' ? 'bromo-' :
                            halide.halogen === 'F' ? 'fluoro-' :
                            halide.halogen === 'I' ? 'iodo-' : '';
            prefix_str = haloName;
        }
        
        return {
            name: prefix_str + name,
            commonName: name,
            confidence: 0.9,
            structureType: 'nitrile'
        };
    }
}

module.exports = IUPACNamer;
