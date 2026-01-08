/**
 * quickAdd.js
 * Quick add utilities for ChemHelp
 * Provides quick insert for elements, functional groups, and rings
 */

class QuickAdd {
    /**
     * Quick add a single element at cursor position
     * @param {string} element - Element symbol (C, N, O, H, etc.)
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @returns {Object} New node
     */
    static addElement(element, x, y) {
        const validElements = {
            'C': { label: 'C', color: '#909090' },
            'H': { label: 'H', color: '#FFFFFF' },
            'N': { label: 'N', color: '#3050F8' },
            'O': { label: 'O', color: '#FF0D0D' },
            'S': { label: 'S', color: '#FFFF30' },
            'P': { label: 'P', color: '#FF8000' },
            'Cl': { label: 'Cl', color: '#1FF01F' },
            'Br': { label: 'Br', color: '#A62929' },
            'F': { label: 'F', color: '#90E050' },
            'I': { label: 'I', color: '#940094' }
        };

        if (!validElements[element]) {
            console.warn(`Invalid element: ${element}`);
            return null;
        }

        const newNode = {
            id: Math.max(...(window.nodes?.map(n => n.id) || [0])) + 1,
            label: element,
            x: x,
            y: y,
            selected: false
        };

        return newNode;
    }

    /**
     * Quick add common functional groups
     * @param {string} groupType - Type of functional group
     * @param {number} x - Starting X coordinate
     * @param {number} y - Starting Y coordinate
     * @returns {Object} { atoms, bonds } to add to structure
     */
    static addFunctionalGroup(groupType, x, y) {
        const baseId = Math.max(...(window.nodes?.map(n => n.id) || [0])) + 1;
        const spacing = 30;

        const groups = {
            'carbonyl': {
                label: 'C=O (Carbonyl)',
                atoms: [
                    { id: baseId, label: 'C', x: x, y: y },
                    { id: baseId + 1, label: 'O', x: x + spacing, y: y }
                ],
                bonds: [
                    { source: baseId, target: baseId + 1, type: 'double' }
                ]
            },
            'hydroxyl': {
                label: 'OH (Hydroxyl)',
                atoms: [
                    { id: baseId, label: 'O', x: x, y: y },
                    { id: baseId + 1, label: 'H', x: x + spacing, y: y }
                ],
                bonds: [
                    { source: baseId, target: baseId + 1, type: 'single' }
                ]
            },
            'amine': {
                label: 'NH2 (Amine)',
                atoms: [
                    { id: baseId, label: 'N', x: x, y: y },
                    { id: baseId + 1, label: 'H', x: x - 20, y: y - 20 },
                    { id: baseId + 2, label: 'H', x: x - 20, y: y + 20 }
                ],
                bonds: [
                    { source: baseId, target: baseId + 1, type: 'single' },
                    { source: baseId, target: baseId + 2, type: 'single' }
                ]
            },
            'carboxyl': {
                label: 'COOH (Carboxyl)',
                atoms: [
                    { id: baseId, label: 'C', x: x, y: y },
                    { id: baseId + 1, label: 'O', x: x + spacing, y: y - 15 },
                    { id: baseId + 2, label: 'O', x: x + spacing, y: y + 15 },
                    { id: baseId + 3, label: 'H', x: x + spacing * 2, y: y + 15 }
                ],
                bonds: [
                    { source: baseId, target: baseId + 1, type: 'double' },
                    { source: baseId, target: baseId + 2, type: 'single' },
                    { source: baseId + 2, target: baseId + 3, type: 'single' }
                ]
            },
            'aldehyde': {
                label: 'CHO (Aldehyde)',
                atoms: [
                    { id: baseId, label: 'C', x: x, y: y },
                    { id: baseId + 1, label: 'O', x: x + spacing, y: y },
                    { id: baseId + 2, label: 'H', x: x - spacing, y: y }
                ],
                bonds: [
                    { source: baseId, target: baseId + 1, type: 'double' },
                    { source: baseId, target: baseId + 2, type: 'single' }
                ]
            },
            'ketone': {
                label: 'C=O (Ketone)',
                atoms: [
                    { id: baseId, label: 'C', x: x - spacing, y: y },
                    { id: baseId + 1, label: 'C', x: x, y: y },
                    { id: baseId + 2, label: 'O', x: x, y: y + spacing }
                ],
                bonds: [
                    { source: baseId, target: baseId + 1, type: 'single' },
                    { source: baseId + 1, target: baseId + 2, type: 'double' }
                ]
            },
            'ester': {
                label: 'COOR (Ester)',
                atoms: [
                    { id: baseId, label: 'C', x: x, y: y },
                    { id: baseId + 1, label: 'O', x: x + spacing, y: y - 15 },
                    { id: baseId + 2, label: 'O', x: x + spacing, y: y + 15 },
                    { id: baseId + 3, label: 'C', x: x + spacing * 2, y: y + 15 }
                ],
                bonds: [
                    { source: baseId, target: baseId + 1, type: 'double' },
                    { source: baseId, target: baseId + 2, type: 'single' },
                    { source: baseId + 2, target: baseId + 3, type: 'single' }
                ]
            },
            'amide': {
                label: 'CONH (Amide)',
                atoms: [
                    { id: baseId, label: 'C', x: x, y: y },
                    { id: baseId + 1, label: 'O', x: x + spacing, y: y - 15 },
                    { id: baseId + 2, label: 'N', x: x + spacing, y: y + 15 },
                    { id: baseId + 3, label: 'H', x: x + spacing * 2, y: y + 15 }
                ],
                bonds: [
                    { source: baseId, target: baseId + 1, type: 'double' },
                    { source: baseId, target: baseId + 2, type: 'single' },
                    { source: baseId + 2, target: baseId + 3, type: 'single' }
                ]
            },
            'nitro': {
                label: 'NO2 (Nitro)',
                atoms: [
                    { id: baseId, label: 'N', x: x, y: y },
                    { id: baseId + 1, label: 'O', x: x + spacing, y: y - 15 },
                    { id: baseId + 2, label: 'O', x: x + spacing, y: y + 15 }
                ],
                bonds: [
                    { source: baseId, target: baseId + 1, type: 'double' },
                    { source: baseId, target: baseId + 2, type: 'single' }
                ]
            },
            'sulfoxide': {
                label: 'S=O (Sulfoxide)',
                atoms: [
                    { id: baseId, label: 'S', x: x, y: y },
                    { id: baseId + 1, label: 'O', x: x + spacing, y: y }
                ],
                bonds: [
                    { source: baseId, target: baseId + 1, type: 'double' }
                ]
            }
        };

        if (!groups[groupType]) {
            console.warn(`Unknown functional group: ${groupType}`);
            return null;
        }

        return groups[groupType];
    }

    /**
     * Quick add common rings
     * @param {string} ringType - Type of ring (benzene, cyclohexane, etc.)
     * @param {number} centerX - Center X coordinate
     * @param {number} centerY - Center Y coordinate
     * @returns {Object} { atoms, bonds } to add to structure
     */
    static addRing(ringType, centerX, centerY) {
        const baseId = Math.max(...(window.nodes?.map(n => n.id) || [0])) + 1;
        const radius = 40;

        const generatePolygon = (sides, type, isAromatic = false) => {
            const atoms = [];
            const bonds = [];

            for (let i = 0; i < sides; i++) {
                const angle = (i / sides) * Math.PI * 2;
                const x = centerX + radius * Math.cos(angle);
                const y = centerY + radius * Math.sin(angle);

                atoms.push({
                    id: baseId + i,
                    label: type === 'pyrrole' && i === 0 ? 'N' : type === 'furan' && i === 0 ? 'O' : 'C',
                    x: x,
                    y: y
                });

                // Connect to next atom
                bonds.push({
                    source: baseId + i,
                    target: baseId + ((i + 1) % sides),
                    type: isAromatic ? 'aromatic' : 'single'
                });

                // For benzene, add alternating double bonds
                if (type === 'benzene' && i % 2 === 0) {
                    bonds[i].type = 'double';
                }
            }

            return { atoms, bonds };
        };

        const rings = {
            'benzene': {
                label: 'Benzene',
                ...generatePolygon(6, 'benzene', true)
            },
            'cyclohexane': {
                label: 'Cyclohexane',
                ...generatePolygon(6, 'cyclohexane', false)
            },
            'cyclopentane': {
                label: 'Cyclopentane',
                ...generatePolygon(5, 'cyclopentane', false)
            },
            'pyrrole': {
                label: 'Pyrrole',
                ...generatePolygon(5, 'pyrrole', true)
            },
            'furan': {
                label: 'Furan',
                ...generatePolygon(5, 'furan', true)
            },
            'pyridine': {
                label: 'Pyridine',
                ...generatePolygon(6, 'pyridine', true)
            },
            'cycloheptane': {
                label: 'Cycloheptane',
                ...generatePolygon(7, 'cycloheptane', false)
            }
        };

        if (!rings[ringType]) {
            console.warn(`Unknown ring type: ${ringType}`);
            return null;
        }

        return rings[ringType];
    }

    /**
     * Quick duplicate current structure with offset
     * @param {number} offsetX - X offset
     * @param {number} offsetY - Y offset
     * @returns {Object} { newNodes, newBonds }
     */
    static duplicateStructure(offsetX = 100, offsetY = 0) {
        if (!window.nodes || window.nodes.length === 0) {
            console.warn('No structure to duplicate');
            return null;
        }

        const maxId = Math.max(...window.nodes.map(n => n.id));
        const newNodes = window.nodes.map(n => ({
            ...n,
            id: n.id + maxId + 1,
            x: n.x + offsetX,
            y: n.y + offsetY,
            selected: false
        }));

        const newBonds = window.bonds.map(b => ({
            ...b,
            source: b.source + maxId + 1,
            target: b.target + maxId + 1
        }));

        return { newNodes, newBonds };
    }

    /**
     * Quick clear structure with confirmation
     * @returns {boolean} True if cleared
     */
    static clearStructure() {
        if (!window.nodes || window.nodes.length === 0) return false;
        if (!confirm('Clear current structure? This cannot be undone.')) return false;
        
        window.nodes = [];
        window.bonds = [];
        return true;
    }

    /**
     * Get all available quick options
     * @returns {Object} All quick add options
     */
    static getQuickOptions() {
        return {
            elements: ['C', 'H', 'N', 'O', 'S', 'P', 'Cl', 'Br', 'F', 'I'],
            groups: ['carbonyl', 'hydroxyl', 'amine', 'carboxyl', 'aldehyde', 'ketone', 'ester', 'amide', 'nitro', 'sulfoxide'],
            rings: ['benzene', 'cyclohexane', 'cyclopentane', 'pyrrole', 'furan', 'pyridine', 'cycloheptane']
        };
    }
}

// Export for use in browser and Node.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = QuickAdd;
}
