/**
 * ValidationEngine.js
 * Enhanced validation for chemical structures
 * Ensures accuracy and prevents incorrect naming
 * 
 * Key Features:
 * - Structural validation (bonds, atoms, geometry)
 * - Semantic validation (valency, charges, connectivity)
 * - Ambiguity detection (isomers, unclear structures)
 * - Confidence scoring
 * - Educational error messages
 */

const MoleculeParser = require('./MoleculeParser');
const AtomValidator = require('./AtomValidator');

class ValidationEngine {
    /**
     * Perform comprehensive validation
     * Returns detailed report with confidence scores
     */
    static validateStructure(molecule) {
        const report = {
            status: 'UNKNOWN',
            isValid: false,
            confidence: 0,
            errors: [],
            warnings: [],
            ambiguities: [],
            suggestions: [],
            breakdown: {
                structuralOK: false,
                semanticOK: false,
                geometryOK: false,
                connectivityOK: false
            }
        };

        // Run all validation checks
        this._checkStructuralIntegrity(molecule, report);
        this._checkSemanticValidity(molecule, report);
        this._checkGeometricValidity(molecule, report);
        this._checkConnectivity(molecule, report);
        this._detectAmbiguities(molecule, report);

        // Determine overall status
        this._determineStatus(report);
        this._calculateConfidence(report);

        return report;
    }

    /**
     * Check structural integrity (bonds, atoms exist)
     */
    static _checkStructuralIntegrity(molecule, report) {
        // Check atoms exist
        if (!molecule.atoms || molecule.atoms.length === 0) {
            report.errors.push('No atoms found in structure');
            return;
        }

        // Check no duplicate atom IDs
        const atomIds = new Set();
        const duplicateIds = [];
        molecule.atoms.forEach((atom, idx) => {
            if (atomIds.has(atom.id)) {
                duplicateIds.push(atom.id);
            }
            atomIds.add(atom.id);
        });

        if (duplicateIds.length > 0) {
            report.errors.push(`Duplicate atom IDs: ${duplicateIds.join(', ')}`);
        }

        // Check bonds reference valid atoms
        if (molecule.bonds && molecule.bonds.length > 0) {
            molecule.bonds.forEach((bond, idx) => {
                // Bonds use numeric indices (source/target), not IDs
                const sourceIdx = typeof bond.source === 'number' ? bond.source : bond.atom1;
                const targetIdx = typeof bond.target === 'number' ? bond.target : bond.atom2;

                if (sourceIdx === undefined || sourceIdx >= molecule.atoms.length || sourceIdx < 0) {
                    report.errors.push(`Bond ${idx}: Source atom index ${sourceIdx} out of range`);
                }
                if (targetIdx === undefined || targetIdx >= molecule.atoms.length || targetIdx < 0) {
                    report.errors.push(`Bond ${idx}: Target atom index ${targetIdx} out of range`);
                }
                
                // Check self-bonds
                if (sourceIdx === targetIdx && sourceIdx !== undefined && targetIdx !== undefined) {
                    report.warnings.push(`Self-bond detected on atom ${sourceIdx}`);
                }

                // Check duplicate bonds
                if (sourceIdx !== undefined && targetIdx !== undefined) {
                    const bondKey = [sourceIdx, targetIdx].sort().join('-');
                    const duplicateCount = molecule.bonds.filter(b => {
                        const src = typeof b.source === 'number' ? b.source : b.atom1;
                        const tgt = typeof b.target === 'number' ? b.target : b.atom2;
                        const key = [src, tgt].sort().join('-');
                        return key === bondKey;
                    }).length;
                    
                    if (duplicateCount > 1 && idx === 0) {
                        report.warnings.push(`Duplicate bonds detected between atoms`);
                    }
                }
            });
        }

        report.breakdown.structuralOK = report.errors.filter(e => 
            e.includes('No atoms') || e.includes('Duplicate') || e.includes('out of range')
        ).length === 0;
    }

    /**
     * Check semantic validity (valency, charges, oxidation states)
     */
    static _checkSemanticValidity(molecule, report) {
        const validation = AtomValidator.validateAllAtoms(molecule);

        if (!validation.allValid) {
            validation.atomValidations.forEach((av, idx) => {
                if (!av.valid) {
                    report.errors.push(
                        `Atom ${idx} (${molecule.atoms[idx].symbol}): ` +
                        `Valency issue - has ${av.totalBonds} bonds, max ${av.maxValency}`
                    );
                }
            });
        }

        // Check for unusual charge distributions
        if (molecule.atoms.some(a => a.charge > 3 || a.charge < -3)) {
            report.warnings.push('Highly charged atoms detected - unusual structure');
        }

        // Check for charge balance violations
        const totalCharge = molecule.atoms.reduce((sum, a) => sum + (a.charge || 0), 0);
        if (totalCharge !== 0 && totalCharge !== 1 && totalCharge !== -1) {
            report.warnings.push(
                `Unusual total charge: ${totalCharge}. ` +
                `Typical ions have charge ±1 to ±2`
            );
        }

        report.breakdown.semanticOK = report.errors.filter(e => 
            e.includes('Valency') || e.includes('Oxidation')
        ).length === 0;
    }

    /**
     * Check geometric validity (strained rings, impossible geometries)
     */
    static _checkGeometricValidity(molecule, report) {
        // Detect 3-membered rings (cyclopropane - strained)
        const rings = this._findAllRings(molecule);
        const threeRings = rings.filter(r => r.length === 3);
        
        if (threeRings.length > 0) {
            report.warnings.push(
                `Found ${threeRings.length} three-membered ring(s). ` +
                `These are strained and have unusual geometry`
            );
            report.suggestions.push(
                'Ring strain affects bond angles and reactivity'
            );
        }

        // Detect 4-membered rings (somewhat strained)
        const fourRings = rings.filter(r => r.length === 4);
        if (fourRings.length > 0) {
            report.warnings.push(
                `Found ${fourRings.length} four-membered ring(s). ` +
                `These have significant ring strain`
            );
        }

        // Check for impossible linear arrangements
        // (Would need geometry data to do properly)

        report.breakdown.geometryOK = report.errors.length === 0;
    }

    /**
     * Check connectivity (all atoms connected, no fragments)
     */
    static _checkConnectivity(molecule, report) {
        if (molecule.atoms.length <= 1) {
            report.breakdown.connectivityOK = true;
            return;
        }

        // Check for disconnected substructures
        const visited = new Set();
        const toVisit = [0];

        while (toVisit.length > 0) {
            const idx = toVisit.pop();
            if (visited.has(idx)) continue;
            visited.add(idx);

            // Find connected atoms
            const connected = MoleculeParser.getConnectedAtoms(molecule, idx);
            connected.forEach(c => {
                if (!visited.has(c.atomIndex)) {
                    toVisit.push(c.atomIndex);
                }
            });
        }

        if (visited.size < molecule.atoms.length) {
            const unconnected = molecule.atoms.length - visited.size;
            report.errors.push(
                `Structure has ${unconnected} disconnected atom(s). ` +
                `All atoms must be connected in a single molecule`
            );
        }

        report.breakdown.connectivityOK = visited.size === molecule.atoms.length;
    }

    /**
     * Detect ambiguous structures and potential isomers
     */
    static _detectAmbiguities(molecule, report) {
        try {
            // Check for multiple double bonds (E/Z isomerism possible)
            if (!molecule.bonds || molecule.bonds.length === 0) {
                return;
            }

            const doubleBonds = molecule.bonds.filter(b => {
                // Handle different bond format conventions
                return (b.type === 'double' || b.order === 2);
            });

            if (doubleBonds.length >= 1) {
                const carbonDoubles = doubleBonds.filter(b => {
                    // Bonds use numeric indices
                    const sourceIdx = b.source;
                    const targetIdx = b.target;
                    
                    const a1 = molecule.atoms[sourceIdx];
                    const a2 = molecule.atoms[targetIdx];
                    
                    return a1 && a2 && a1.symbol === 'C' && a2.symbol === 'C';
                });

                if (carbonDoubles.length > 0) {
                    report.ambiguities.push(
                        `${carbonDoubles.length} C=C double bond(s) detected. ` +
                        `Could have E/Z (cis/trans) isomers`
                    );
                    report.suggestions.push(
                        'Specify double bond geometry for complete nomenclature'
                    );
                }
            }

            // Check for chiral centers (4 different groups on carbon)
            const chiralCenters = this._findChiralCenters(molecule);
            if (chiralCenters.length > 0) {
                report.ambiguities.push(
                    `${chiralCenters.length} chiral center(s) found. ` +
                    `Structure may have stereoisomers (R/S designation)`
                );
                report.suggestions.push(
                    'Specify stereochemistry for complete naming'
                );
            }

            // Check for branching ambiguity
            const hasComplexBranching = this._hasComplexBranching(molecule);
            if (hasComplexBranching) {
                report.ambiguities.push(
                    'Complex branching detected. Verify correct chain selection'
                );
            }
        } catch (error) {
            // Silently skip ambiguity detection if there's an error
            console.warn('Ambiguity detection error:', error.message);
        }
    }

    /**
     * Find all rings in molecule
     */
    static _findAllRings(molecule) {
        const rings = [];
        const visited = new Set();

        // Simple DFS-based ring finding
        for (let i = 0; i < molecule.atoms.length; i++) {
            if (!visited.has(i)) {
                const ring = this._dfsRing(molecule, i, -1, new Set(), new Array());
                if (ring && ring.length >= 3) {
                    rings.push(ring);
                    ring.forEach(a => visited.add(a));
                }
            }
        }

        return rings;
    }

    /**
     * DFS helper for ring detection
     */
    static _dfsRing(molecule, node, parent, visited, path) {
        visited.add(node);
        path.push(node);

        const neighbors = MoleculeParser.getConnectedAtoms(molecule, node);
        
        for (let neighbor of neighbors) {
            const neighborIdx = neighbor.atomIndex;
            
            if (neighborIdx === parent) continue;
            
            if (visited.has(neighborIdx)) {
                // Found a cycle - extract it
                const cycleStart = path.indexOf(neighborIdx);
                if (cycleStart !== -1) {
                    return path.slice(cycleStart);
                }
            } else {
                const ring = this._dfsRing(molecule, neighborIdx, node, visited, [...path]);
                if (ring) return ring;
            }
        }

        return null;
    }

    /**
     * Find potential chiral centers
     * A carbon with 4 different substituents
     */
    static _findChiralCenters(molecule) {
        const chiralCenters = [];

        molecule.atoms.forEach((atom, idx) => {
            if (atom.symbol === 'C') {
                const neighbors = MoleculeParser.getConnectedAtoms(molecule, idx);
                
                // Must have 4 neighbors
                if (neighbors.length === 4) {
                    // Count distinct substituent types
                    const substituents = new Set();
                    neighbors.forEach(n => {
                        substituents.add(n.atom.symbol);
                    });

                    // If 4 different atoms, likely chiral
                    if (substituents.size === 4) {
                        chiralCenters.push({
                            atomIndex: idx,
                            neighbors: neighbors.map(n => n.atom.symbol)
                        });
                    } else if (substituents.size === 3) {
                        // Might be chiral if substituents are complex
                        chiralCenters.push({
                            atomIndex: idx,
                            neighbors: neighbors.map(n => n.atom.symbol),
                            note: 'Possible chiral center - depends on substituent complexity'
                        });
                    }
                }
            }
        });

        return chiralCenters;
    }

    /**
     * Detect complex branching patterns
     */
    static _hasComplexBranching(molecule) {
        // Count atoms with 3+ branches (excluding chains)
        const branchingAtoms = molecule.atoms.filter(atom => {
            if (atom.symbol !== 'C') return false;
            const neighbors = MoleculeParser.getConnectedAtoms(molecule, 
                molecule.atoms.indexOf(atom)
            );
            return neighbors.length >= 3;
        });

        return branchingAtoms.length >= 3;
    }

    /**
     * Determine overall validation status
     */
    static _determineStatus(report) {
        if (report.errors.length > 0) {
            report.status = 'INVALID';
            report.isValid = false;
        } else if (report.ambiguities.length > 0) {
            report.status = 'AMBIGUOUS';
            report.isValid = true; // Structurally valid but needs clarification
        } else {
            report.status = 'VALID';
            report.isValid = true;
        }
    }

    /**
     * Calculate confidence score (0-1)
     * Based on validation breakdown and warnings
     */
    static _calculateConfidence(report) {
        let confidence = 1.0;

        // Reduce for each error
        confidence -= report.errors.length * 0.2;

        // Reduce for warnings
        confidence -= report.warnings.length * 0.05;

        // Reduce for ambiguities
        confidence -= report.ambiguities.length * 0.1;

        // Reduce for breakdown failures
        Object.values(report.breakdown).forEach(ok => {
            if (!ok) confidence -= 0.15;
        });

        report.confidence = Math.max(0, Math.min(1, confidence));
    }

    /**
     * Generate user-friendly validation message
     */
    static getValidationMessage(report) {
        if (report.status === 'VALID') {
            return `✅ Structure is valid (confidence: ${(report.confidence * 100).toFixed(1)}%)`;
        } else if (report.status === 'AMBIGUOUS') {
            return `⚠️ Structure is valid but has ambiguities:`;
        } else {
            return `❌ Structure has errors:`;
        }
    }
}

module.exports = ValidationEngine;
