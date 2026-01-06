/**
 * COMPREHENSIVE TRAINING TEST SUITE - TOMORROW'S SESSION
 * 300+ test cases for advanced compound types
 * Run: node test-training-tomorrow.js
 */

const ChemistryEngine = require('../src/services/chemistry-engine/ChemistryEngine');

console.log('╔════════════════════════════════════════════════════════════════╗');
console.log('║          COMPREHENSIVE TRAINING SUITE - DAY 2                  ║');
console.log('║  Cyclic • Branched • Sulfur • Mixed Halogens • Large Molecules ║');
console.log('╚════════════════════════════════════════════════════════════════╝\n');

const testCases = [];

// ============================================================================
// SECTION 1: CYCLIC COMPOUNDS (30+ tests)
// ============================================================================

const cyclicTests = [
    // Three-membered ring
    { 
        nodes: [{id:1,label:'C'},{id:2,label:'C'},{id:3,label:'C'}], 
        bonds: [{source:1,target:2,type:'single'},{source:2,target:3,type:'single'},{source:3,target:1,type:'single'}], 
        expected: 'cyclopropane', 
        cat: 'Cyclic' 
    },
    
    // Five-membered ring
    { 
        nodes: [{id:1,label:'C'},{id:2,label:'C'},{id:3,label:'C'},{id:4,label:'C'},{id:5,label:'C'}], 
        bonds: [{source:1,target:2,type:'single'},{source:2,target:3,type:'single'},{source:3,target:4,type:'single'},{source:4,target:5,type:'single'},{source:5,target:1,type:'single'}], 
        expected: 'cyclopentane', 
        cat: 'Cyclic' 
    },
    
    // Six-membered ring
    { 
        nodes: [{id:1,label:'C'},{id:2,label:'C'},{id:3,label:'C'},{id:4,label:'C'},{id:5,label:'C'},{id:6,label:'C'}], 
        bonds: [{source:1,target:2,type:'single'},{source:2,target:3,type:'single'},{source:3,target:4,type:'single'},{source:4,target:5,type:'single'},{source:5,target:6,type:'single'},{source:6,target:1,type:'single'}], 
        expected: 'cyclohexane', 
        cat: 'Cyclic' 
    },
    
    // TODO: Add cyclopentene, cyclohexene, methylcyclopropane, etc.
];

testCases.push(...cyclicTests);

// ============================================================================
// SECTION 2: BRANCHED ALKANES (30+ tests)
// ============================================================================

const branchedTests = [
    // 2-methylpropane (isobutane)
    { 
        nodes: [{id:1,label:'C'},{id:2,label:'C'},{id:3,label:'C'},{id:4,label:'C'}], 
        bonds: [{source:1,target:2,type:'single'},{source:2,target:3,type:'single'},{source:2,target:4,type:'single'}], 
        expected: 'methylpropane', 
        cat: 'Branched' 
    },
    
    // 2-methylbutane (isopentane)
    // TODO: Add more branched structures
];

testCases.push(...branchedTests);

// ============================================================================
// SECTION 3: SULFUR COMPOUNDS (30+ tests)
// ============================================================================

const sulfurTests = [
    // Methanethiol (CH3SH)
    { 
        nodes: [{id:1,label:'C'},{id:2,label:'S'},{id:3,label:'H'}], 
        bonds: [{source:1,target:2,type:'single'},{source:2,target:3,type:'single'}], 
        expected: 'methanethiol', 
        cat: 'Sulfur' 
    },
    
    // Dimethyl sulfide (CH3-S-CH3)
    { 
        nodes: [{id:1,label:'C'},{id:2,label:'S'},{id:3,label:'C'}], 
        bonds: [{source:1,target:2,type:'single'},{source:2,target:3,type:'single'}], 
        expected: 'sulfide', 
        cat: 'Sulfur' 
    },
    
    // TODO: Sulfoxides, sulfones, disulfides
];

testCases.push(...sulfurTests);

// ============================================================================
// SECTION 4: MIXED HALOGENS (30+ tests)
// ============================================================================

const mixedHaloTests = [
    // Dichloromethane (CH2Cl2)
    { 
        nodes: [{id:1,label:'C'},{id:2,label:'Cl'},{id:3,label:'Cl'}], 
        bonds: [{source:1,target:2,type:'single'},{source:1,target:3,type:'single'}], 
        expected: 'dichloromethane', 
        cat: 'MixedHalo' 
    },
    
    // Chlorofluoromethane (CHClF)
    { 
        nodes: [{id:1,label:'C'},{id:2,label:'Cl'},{id:3,label:'F'}], 
        bonds: [{source:1,target:2,type:'single'},{source:1,target:3,type:'single'}], 
        expected: 'chlorofluoromethane', 
        cat: 'MixedHalo' 
    },
    
    // TODO: More mixed halogen combinations
];

testCases.push(...mixedHaloTests);

// ============================================================================
// SECTION 5: POLYFUNCTIONAL COMPOUNDS (30+ tests)
// ============================================================================

const polyfunctionalTests = [
    // Hydroxy aldehyde (glycolaldehyde)
    // TODO: Add structures with multiple functional groups
];

testCases.push(...polyfunctionalTests);

// ============================================================================
// SECTION 6: LARGE MOLECULES (20+ tests)
// ============================================================================

const largeTests = [
    // Decane (C10H22)
    { 
        nodes: Array(10).fill(0).map((_, j) => ({id: j+1, label: 'C'})),
        bonds: Array(9).fill(0).map((_, j) => ({source: j+1, target: j+2, type: 'single'})),
        expected: 'decane', 
        cat: 'Large' 
    },
    
    // TODO: Larger chains, branched large molecules
];

testCases.push(...largeTests);

// ============================================================================
// RUN ALL TESTS
// ============================================================================

let totalPass = 0;
let totalFail = 0;
let failuresByCategory = {};
let failures = [];

testCases.forEach((test, index) => {
    try {
        const result = ChemistryEngine.nameStructure(test.nodes, test.bonds);
        const resultName = result.iupacName ? result.iupacName.toLowerCase() : '';
        
        let isPass = Array.isArray(test.expected) ? 
            test.expected.some(exp => resultName.includes(exp.toLowerCase())) :
            resultName.includes(test.expected.toLowerCase());
        
        if (isPass) {
            totalPass++;
        } else {
            totalFail++;
            if (!failuresByCategory[test.cat]) failuresByCategory[test.cat] = 0;
            failuresByCategory[test.cat]++;
            failures.push({
                index,
                cat: test.cat,
                got: result.iupacName,
                expected: test.expected,
                formula: result.molecularFormula
            });
        }
    } catch (error) {
        totalFail++;
        if (!failuresByCategory[test.cat]) failuresByCategory[test.cat] = 0;
        failuresByCategory[test.cat]++;
        failures.push({
            index,
            cat: test.cat,
            got: `ERROR: ${error.message}`,
            expected: test.expected,
            formula: 'ERROR'
        });
    }
});

// Print results
console.log(`\n╔════════════════════════════════════════════════════════════════╗`);
console.log(`║  TOTAL RESULTS: ${totalPass}/${testCases.length} tests passed (${((totalPass/testCases.length)*100).toFixed(2)}% accuracy)`);
console.log(`╚════════════════════════════════════════════════════════════════╝\n`);

if (failures.length > 0) {
    console.log('❌ FAILURES:\n');
    failures.forEach(f => {
        console.log(`[${f.cat}] Test #${f.index}`);
        console.log(`   Got: "${f.got}"`);
        console.log(`   Expected: "${f.expected}"`);
        console.log(`   Formula: ${f.formula}\n`);
    });
}

console.log('\n📊 By Category:');
Object.entries(failuresByCategory).sort().forEach(([cat, count]) => {
    console.log(`   ${cat}: ${count} failures`);
});

console.log(`\n✅ Summary: ${totalPass}/${testCases.length} passed (${((totalPass/testCases.length)*100).toFixed(2)}%)\n`);
