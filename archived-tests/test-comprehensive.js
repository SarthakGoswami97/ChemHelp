#!/usr/bin/env node
/**
 * Comprehensive Chemistry Engine Test Suite
 * Tests: Basic compounds, unseen structures, complex molecules, edge cases
 */

const ChemistryEngine = require('./src/services/chemistry-engine/ChemistryEngine');

ChemistryEngine.initialize();

// Test data structure: { name, nodes, bonds, expectedName }
const TESTS = [
    // ===== BASIC HYDROCARBONS =====
    {
        name: 'Methane (CH4)',
        nodes: [{ id: 1, label: 'C' }],
        bonds: [],
        category: 'Alkanes'
    },
    {
        name: 'Ethane (C2H6)',
        nodes: [{ id: 1, label: 'C' }, { id: 2, label: 'C' }],
        bonds: [{ source: 1, target: 2, type: 'single' }],
        category: 'Alkanes'
    },
    {
        name: 'Propane (C3H8)',
        nodes: [{ id: 1, label: 'C' }, { id: 2, label: 'C' }, { id: 3, label: 'C' }],
        bonds: [
            { source: 1, target: 2, type: 'single' },
            { source: 2, target: 3, type: 'single' }
        ],
        category: 'Alkanes'
    },
    
    // ===== ALKENES & ALKYNES =====
    {
        name: 'Ethene (C2H4)',
        nodes: [{ id: 1, label: 'C' }, { id: 2, label: 'C' }],
        bonds: [{ source: 1, target: 2, type: 'double' }],
        category: 'Alkenes'
    },
    {
        name: 'Ethyne/Acetylene (C2H2)',
        nodes: [{ id: 1, label: 'C' }, { id: 2, label: 'C' }],
        bonds: [{ source: 1, target: 2, type: 'triple' }],
        category: 'Alkynes'
    },
    {
        name: 'Propene (C3H6)',
        nodes: [{ id: 1, label: 'C' }, { id: 2, label: 'C' }, { id: 3, label: 'C' }],
        bonds: [
            { source: 1, target: 2, type: 'double' },
            { source: 2, target: 3, type: 'single' }
        ],
        category: 'Alkenes'
    },

    // ===== ALCOHOLS =====
    {
        name: 'Methanol (CH3OH)',
        nodes: [{ id: 1, label: 'C' }, { id: 2, label: 'O' }, { id: 3, label: 'H' }],
        bonds: [
            { source: 1, target: 2, type: 'single' },
            { source: 2, target: 3, type: 'single' }
        ],
        category: 'Alcohols'
    },
    {
        name: 'Ethanol (C2H5OH)',
        nodes: [
            { id: 1, label: 'C' },
            { id: 2, label: 'C' },
            { id: 3, label: 'O' },
            { id: 4, label: 'H' }
        ],
        bonds: [
            { source: 1, target: 2, type: 'single' },
            { source: 2, target: 3, type: 'single' },
            { source: 3, target: 4, type: 'single' }
        ],
        category: 'Alcohols'
    },

    // ===== ALDEHYDES & KETONES =====
    {
        name: 'Formaldehyde (CH2O)',
        nodes: [{ id: 1, label: 'C' }, { id: 2, label: 'O' }],
        bonds: [{ source: 1, target: 2, type: 'double' }],
        category: 'Aldehydes'
    },
    {
        name: 'Acetaldehyde (CH3CHO)',
        nodes: [{ id: 1, label: 'C' }, { id: 2, label: 'C' }, { id: 3, label: 'O' }],
        bonds: [
            { source: 1, target: 2, type: 'single' },
            { source: 2, target: 3, type: 'double' }
        ],
        category: 'Aldehydes'
    },
    {
        name: 'Acetone (CH3COCH3)',
        nodes: [{ id: 1, label: 'C' }, { id: 2, label: 'C' }, { id: 3, label: 'O' }, { id: 4, label: 'C' }],
        bonds: [
            { source: 1, target: 2, type: 'single' },
            { source: 2, target: 3, type: 'double' },
            { source: 2, target: 4, type: 'single' }
        ],
        category: 'Ketones'
    },

    // ===== CARBOXYLIC ACIDS =====
    {
        name: 'Formic Acid (HCOOH)',
        nodes: [{ id: 1, label: 'C' }, { id: 2, label: 'O' }, { id: 3, label: 'O' }, { id: 4, label: 'H' }],
        bonds: [
            { source: 1, target: 2, type: 'double' },
            { source: 1, target: 3, type: 'single' },
            { source: 3, target: 4, type: 'single' }
        ],
        category: 'Carboxylic Acids'
    },
    {
        name: 'Acetic Acid (CH3COOH)',
        nodes: [
            { id: 1, label: 'C' },
            { id: 2, label: 'C' },
            { id: 3, label: 'O' },
            { id: 4, label: 'O' },
            { id: 5, label: 'H' }
        ],
        bonds: [
            { source: 1, target: 2, type: 'single' },
            { source: 2, target: 3, type: 'double' },
            { source: 2, target: 4, type: 'single' },
            { source: 4, target: 5, type: 'single' }
        ],
        category: 'Carboxylic Acids'
    },

    // ===== ESTERS =====
    {
        name: 'Methyl Formate (HCOOCH3)',
        nodes: [
            { id: 1, label: 'C' },
            { id: 2, label: 'O' },
            { id: 3, label: 'C' },
            { id: 4, label: 'O' }
        ],
        bonds: [
            { source: 1, target: 2, type: 'double' },
            { source: 1, target: 4, type: 'single' },
            { source: 4, target: 3, type: 'single' }
        ],
        category: 'Esters'
    },

    // ===== ETHERS =====
    {
        name: 'Dimethyl Ether (CH3OCH3)',
        nodes: [{ id: 1, label: 'C' }, { id: 2, label: 'O' }, { id: 3, label: 'C' }],
        bonds: [
            { source: 1, target: 2, type: 'single' },
            { source: 2, target: 3, type: 'single' }
        ],
        category: 'Ethers'
    },

    // ===== PEROXIDES (CRITICAL TESTS) =====
    {
        name: 'Methyl Hydroperoxide (CH3OOH)',
        nodes: [{ id: 1, label: 'C' }, { id: 2, label: 'O' }, { id: 3, label: 'O' }, { id: 4, label: 'H' }],
        bonds: [
            { source: 1, target: 2, type: 'single' },
            { source: 2, target: 3, type: 'single' },
            { source: 3, target: 4, type: 'single' }
        ],
        category: 'Peroxides'
    },
    {
        name: 'Chloromethyl Hydroperoxide (ClCH2OOH)',
        nodes: [
            { id: 1, label: 'C' },
            { id: 2, label: 'O' },
            { id: 3, label: 'O' },
            { id: 4, label: 'H' },
            { id: 5, label: 'Cl' }
        ],
        bonds: [
            { source: 1, target: 2, type: 'single' },
            { source: 2, target: 3, type: 'single' },
            { source: 3, target: 4, type: 'single' },
            { source: 1, target: 5, type: 'single' }
        ],
        category: 'Peroxides'
    },
    {
        name: 'Ethyl Hydroperoxide (CH3CH2OOH)',
        nodes: [
            { id: 1, label: 'C' },
            { id: 2, label: 'C' },
            { id: 3, label: 'O' },
            { id: 4, label: 'O' },
            { id: 5, label: 'H' }
        ],
        bonds: [
            { source: 1, target: 2, type: 'single' },
            { source: 2, target: 3, type: 'single' },
            { source: 3, target: 4, type: 'single' },
            { source: 4, target: 5, type: 'single' }
        ],
        category: 'Peroxides'
    },

    // ===== HALOGENATED COMPOUNDS =====
    {
        name: 'Chloromethane (CH3Cl)',
        nodes: [{ id: 1, label: 'C' }, { id: 2, label: 'Cl' }],
        bonds: [{ source: 1, target: 2, type: 'single' }],
        category: 'Halides'
    },
    {
        name: 'Dichloromethane (CH2Cl2)',
        nodes: [{ id: 1, label: 'C' }, { id: 2, label: 'Cl' }, { id: 3, label: 'Cl' }],
        bonds: [
            { source: 1, target: 2, type: 'single' },
            { source: 1, target: 3, type: 'single' }
        ],
        category: 'Halides'
    },

    // ===== AMINES =====
    {
        name: 'Methylamine (CH3NH2)',
        nodes: [{ id: 1, label: 'C' }, { id: 2, label: 'N' }, { id: 3, label: 'H' }],
        bonds: [
            { source: 1, target: 2, type: 'single' },
            { source: 2, target: 3, type: 'single' }
        ],
        category: 'Amines'
    },

    // ===== AMIDES =====
    {
        name: 'Formamide (HCONH2)',
        nodes: [{ id: 1, label: 'C' }, { id: 2, label: 'O' }, { id: 3, label: 'N' }, { id: 4, label: 'H' }],
        bonds: [
            { source: 1, target: 2, type: 'double' },
            { source: 1, target: 3, type: 'single' },
            { source: 3, target: 4, type: 'single' }
        ],
        category: 'Amides'
    },

    // ===== COMPLEX STRUCTURES =====
    {
        name: 'Aspirin Structure (simplified)',
        nodes: [
            { id: 1, label: 'C' },
            { id: 2, label: 'C' },
            { id: 3, label: 'C' },
            { id: 4, label: 'C' },
            { id: 5, label: 'C' },
            { id: 6, label: 'C' },
            { id: 7, label: 'O' },
            { id: 8, label: 'O' }
        ],
        bonds: [
            // Benzene ring
            { source: 1, target: 2, type: 'single' },
            { source: 2, target: 3, type: 'double' },
            { source: 3, target: 4, type: 'single' },
            { source: 4, target: 5, type: 'double' },
            { source: 5, target: 6, type: 'single' },
            { source: 6, target: 1, type: 'double' },
            // Substituent
            { source: 1, target: 7, type: 'single' },
            { source: 7, target: 8, type: 'double' }
        ],
        category: 'Complex'
    },

    // ===== EDGE CASES =====
    {
        name: 'Single Oxygen (O)',
        nodes: [{ id: 1, label: 'O' }],
        bonds: [],
        category: 'Edge Cases'
    },
    {
        name: 'Water equivalent (HOH)',
        nodes: [{ id: 1, label: 'O' }, { id: 2, label: 'H' }, { id: 3, label: 'H' }],
        bonds: [
            { source: 1, target: 2, type: 'single' },
            { source: 1, target: 3, type: 'single' }
        ],
        category: 'Edge Cases'
    },

    // ===== NEW: NITRILES & NITRO GROUPS (EASY IMPROVEMENTS) =====
    {
        name: 'Acetonitrile (CH3CN)',
        nodes: [
            { id: 1, label: 'C' },
            { id: 2, label: 'C' },
            { id: 3, label: 'N' }
        ],
        bonds: [
            { source: 1, target: 2, type: 'single' },
            { source: 2, target: 3, type: 'triple' }
        ],
        category: 'Nitriles'
    },
    {
        name: 'Propionitrile (C2H5CN)',
        nodes: [
            { id: 1, label: 'C' },
            { id: 2, label: 'C' },
            { id: 3, label: 'C' },
            { id: 4, label: 'N' }
        ],
        bonds: [
            { source: 1, target: 2, type: 'single' },
            { source: 2, target: 3, type: 'single' },
            { source: 3, target: 4, type: 'triple' }
        ],
        category: 'Nitriles'
    },
    {
        name: 'Chloroacetonitrile (ClCH2CN)',
        nodes: [
            { id: 1, label: 'C' },
            { id: 2, label: 'C' },
            { id: 3, label: 'N' },
            { id: 4, label: 'Cl' }
        ],
        bonds: [
            { source: 1, target: 2, type: 'single' },
            { source: 1, target: 4, type: 'single' },
            { source: 2, target: 3, type: 'triple' }
        ],
        category: 'Nitriles'
    }
];

// Run tests
console.log('\n' + '='.repeat(80));
console.log('🧪 COMPREHENSIVE CHEMISTRY ENGINE TEST SUITE');
console.log('='.repeat(80) + '\n');

const results = {};
let totalTests = 0;
let passedTests = 0;
let failedTests = [];

TESTS.forEach((test, index) => {
    totalTests++;
    
    try {
        const result = ChemistryEngine.nameStructure(test.nodes, test.bonds);
        
        // Initialize category
        if (!results[test.category]) {
            results[test.category] = { total: 0, passed: 0 };
        }
        results[test.category].total++;
        
        if (result.success) {
            passedTests++;
            results[test.category].passed++;
            console.log(`✅ [${index + 1}] ${test.name}`);
            console.log(`   Name: ${result.iupacName}`);
            console.log(`   Formula: ${result.molecularFormula}`);
            console.log(`   Groups: ${result.functionalGroups?.join(', ') || 'None'}`);
            console.log(`   Confidence: ${result.confidence}\n`);
        } else {
            failedTests.push(test.name);
            console.log(`❌ [${index + 1}] ${test.name}`);
            console.log(`   Error: ${result.error}\n`);
        }
    } catch (error) {
        failedTests.push(test.name);
        console.log(`❌ [${index + 1}] ${test.name}`);
        console.log(`   Exception: ${error.message}\n`);
    }
});

// Summary
console.log('='.repeat(80));
console.log('📊 TEST SUMMARY');
console.log('='.repeat(80));
console.log(`Total Tests: ${totalTests}`);
console.log(`Passed: ${passedTests} ✅`);
console.log(`Failed: ${failedTests.length} ❌`);
console.log(`Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%\n`);

console.log('📈 By Category:');
Object.entries(results).forEach(([category, data]) => {
    const percentage = ((data.passed / data.total) * 100).toFixed(0);
    console.log(`  ${category}: ${data.passed}/${data.total} (${percentage}%)`);
});

if (failedTests.length > 0) {
    console.log('\n❌ Failed Tests:');
    failedTests.forEach(name => console.log(`   - ${name}`));
}

console.log('\n' + '='.repeat(80) + '\n');

process.exit(failedTests.length > 0 ? 1 : 0);
