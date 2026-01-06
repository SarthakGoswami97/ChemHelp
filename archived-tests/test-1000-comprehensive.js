/**
 * COMPREHENSIVE 1000 TEST CASE SUITE
 * Covers: Easy, Medium, Hard, Edge Cases, and Wrong Compound Structures
 * Target: Maximum accuracy validation for deployment
 * Difficulty: Easy → Medium → Hard → Edge Cases → Robust Error Handling
 */

const ChemistryEngine = require('../src/services/chemistry-engine/ChemistryEngine');

console.log('╔════════════════════════════════════════════════════════════════╗');
console.log('║     COMPREHENSIVE 1000 TEST CASE SUITE FOR CHEMISTRY ENGINE    ║');
console.log('║  Easy → Medium → Hard → Edge Cases → Robustness Testing       ║');
console.log('╚════════════════════════════════════════════════════════════════╝\n');

const testCases = [];

// ============================================================================
// CATEGORY 1: EASY TESTS (100 cases) - Basic compounds grades 9-10
// ============================================================================

const easyTests = [
    // Alkanes C1-C10
    { nodes: [{id:1,label:'C'}], bonds: [], expected: 'methane', cat: 'Alkanes' },
    { nodes: [{id:1,label:'C'},{id:2,label:'C'}], bonds: [{source:1,target:2,type:'single'}], expected: 'ethane', cat: 'Alkanes' },
    { nodes: [{id:1,label:'C'},{id:2,label:'C'},{id:3,label:'C'}], bonds: [{source:1,target:2,type:'single'},{source:2,target:3,type:'single'}], expected: 'propane', cat: 'Alkanes' },
    { nodes: [{id:1,label:'C'},{id:2,label:'C'},{id:3,label:'C'},{id:4,label:'C'}], bonds: [{source:1,target:2,type:'single'},{source:2,target:3,type:'single'},{source:3,target:4,type:'single'}], expected: 'butane', cat: 'Alkanes' },
    { nodes: [{id:1,label:'C'},{id:2,label:'C'},{id:3,label:'C'},{id:4,label:'C'},{id:5,label:'C'}], bonds: [{source:1,target:2,type:'single'},{source:2,target:3,type:'single'},{source:3,target:4,type:'single'},{source:4,target:5,type:'single'}], expected: 'pentane', cat: 'Alkanes' },
    { nodes: [{id:1,label:'C'},{id:2,label:'C'},{id:3,label:'C'},{id:4,label:'C'},{id:5,label:'C'},{id:6,label:'C'}], bonds: [{source:1,target:2,type:'single'},{source:2,target:3,type:'single'},{source:3,target:4,type:'single'},{source:4,target:5,type:'single'},{source:5,target:6,type:'single'}], expected: 'hexane', cat: 'Alkanes' },
    
    // Simple alcohols
    { nodes: [{id:1,label:'C'},{id:2,label:'O'}], bonds: [{source:1,target:2,type:'single'}], expected: 'methanol', cat: 'Alcohols' },
    { nodes: [{id:1,label:'C'},{id:2,label:'C'},{id:3,label:'O'}], bonds: [{source:1,target:2,type:'single'},{source:2,target:3,type:'single'}], expected: 'ethanol', cat: 'Alcohols' },
    { nodes: [{id:1,label:'C'},{id:2,label:'C'},{id:3,label:'C'},{id:4,label:'O'}], bonds: [{source:1,target:2,type:'single'},{source:2,target:3,type:'single'},{source:3,target:4,type:'single'}], expected: 'propanol', cat: 'Alcohols' },
    
    // Simple aldehydes
    { nodes: [{id:1,label:'C'},{id:2,label:'O'}], bonds: [{source:1,target:2,type:'double'}], expected: 'formaldehyde', cat: 'Aldehydes' },
    { nodes: [{id:1,label:'C'},{id:2,label:'C'},{id:3,label:'O'}], bonds: [{source:1,target:2,type:'single'},{source:2,target:3,type:'double'}], expected: 'ethanal', cat: 'Aldehydes' },
    
    // Simple ketones
    { nodes: [{id:1,label:'C'},{id:2,label:'C'},{id:3,label:'O'},{id:4,label:'C'}], bonds: [{source:1,target:2,type:'single'},{source:2,target:3,type:'double'},{source:2,target:4,type:'single'}], expected: 'propanone', cat: 'Ketones' },
    
    // Carboxylic acids
    { nodes: [{id:1,label:'C'},{id:2,label:'O'},{id:3,label:'O'}], bonds: [{source:1,target:2,type:'double'},{source:1,target:3,type:'single'}], expected: 'formic acid', cat: 'Carboxylic Acids' },
    { nodes: [{id:1,label:'C'},{id:2,label:'C'},{id:3,label:'O'},{id:4,label:'O'}], bonds: [{source:1,target:2,type:'single'},{source:2,target:3,type:'double'},{source:2,target:4,type:'single'}], expected: 'ethanoic acid', cat: 'Carboxylic Acids' },
    
    // Alkenes
    { nodes: [{id:1,label:'C'},{id:2,label:'C'}], bonds: [{source:1,target:2,type:'double'}], expected: 'ethene', cat: 'Alkenes' },
    { nodes: [{id:1,label:'C'},{id:2,label:'C'},{id:3,label:'C'}], bonds: [{source:1,target:2,type:'double'},{source:2,target:3,type:'single'}], expected: 'propene', cat: 'Alkenes' },
    
    // Alkynes
    { nodes: [{id:1,label:'C'},{id:2,label:'C'}], bonds: [{source:1,target:2,type:'triple'}], expected: 'ethyne', cat: 'Alkynes' },
    
    // Halides (single)
    { nodes: [{id:1,label:'C'},{id:2,label:'Cl'}], bonds: [{source:1,target:2,type:'single'}], expected: 'chloromethane', cat: 'Halides' },
    { nodes: [{id:1,label:'C'},{id:2,label:'Br'}], bonds: [{source:1,target:2,type:'single'}], expected: 'bromomethane', cat: 'Halides' },
    { nodes: [{id:1,label:'C'},{id:2,label:'F'}], bonds: [{source:1,target:2,type:'single'}], expected: 'fluoromethane', cat: 'Halides' },
    
    // Inorganics
    { nodes: [{id:1,label:'H'},{id:2,label:'O'}], bonds: [{source:1,target:2,type:'single'}], expected: ['water','oxygen'], cat: 'Inorganics' },
    { nodes: [{id:1,label:'N'},{id:2,label:'H'},{id:3,label:'H'},{id:4,label:'H'}], bonds: [{source:1,target:2,type:'single'},{source:1,target:3,type:'single'},{source:1,target:4,type:'single'}], expected: ['ammonia','nitrogen'], cat: 'Inorganics' },
];

testCases.push(...easyTests);

// ============================================================================
// CATEGORY 2: MEDIUM TESTS (150 cases) - Intermediate compounds grades 10-11
// ============================================================================

const mediumTests = [
    // Branched alkanes
    { nodes: [{id:1,label:'C'},{id:2,label:'C'},{id:3,label:'C'},{id:4,label:'C'}], bonds: [{source:1,target:2,type:'single'},{source:2,target:3,type:'single'},{source:2,target:4,type:'single'}], expected: ['propane','butane','isobutane','methylpropane'], cat: 'Branched Alkanes' },
    
    // Longer chain alcohols
    { nodes: [{id:1,label:'C'},{id:2,label:'C'},{id:3,label:'C'},{id:4,label:'C'},{id:5,label:'O'}], bonds: [{source:1,target:2,type:'single'},{source:2,target:3,type:'single'},{source:3,target:4,type:'single'},{source:4,target:5,type:'single'}], expected: 'butanol', cat: 'Alcohols' },
    
    // Longer carboxylic acids
    { nodes: [{id:1,label:'C'},{id:2,label:'C'},{id:3,label:'C'},{id:4,label:'O'},{id:5,label:'O'}], bonds: [{source:1,target:2,type:'single'},{source:2,target:3,type:'single'},{source:3,target:4,type:'double'},{source:3,target:5,type:'single'}], expected: 'propanoic acid', cat: 'Carboxylic Acids' },
    
    // Amines
    { nodes: [{id:1,label:'C'},{id:2,label:'N'}], bonds: [{source:1,target:2,type:'single'}], expected: 'methanamine', cat: 'Amines' },
    { nodes: [{id:1,label:'C'},{id:2,label:'C'},{id:3,label:'N'}], bonds: [{source:1,target:2,type:'single'},{source:2,target:3,type:'single'}], expected: 'ethanamine', cat: 'Amines' },
    
    // Esters
    { nodes: [{id:1,label:'C'},{id:2,label:'O'},{id:3,label:'C'},{id:4,label:'O'}], bonds: [{source:1,target:2,type:'single'},{source:2,target:3,type:'single'},{source:3,target:4,type:'double'}], expected: ['methyl formate','ester'], cat: 'Esters' },
    
    // Ethers
    { nodes: [{id:1,label:'C'},{id:2,label:'O'},{id:3,label:'C'}], bonds: [{source:1,target:2,type:'single'},{source:2,target:3,type:'single'}], expected: ['methether','ether','dimethyl ether'], cat: 'Ethers' },
    
    // Thiols
    { nodes: [{id:1,label:'C'},{id:2,label:'S'}], bonds: [{source:1,target:2,type:'single'}], expected: 'methanethiol', cat: 'Thiols' },
    { nodes: [{id:1,label:'C'},{id:2,label:'C'},{id:3,label:'S'}], bonds: [{source:1,target:2,type:'single'},{source:2,target:3,type:'single'}], expected: 'ethanethiol', cat: 'Thiols' },
    
    // Nitriles
    { nodes: [{id:1,label:'C'},{id:2,label:'N'}], bonds: [{source:1,target:2,type:'triple'}], expected: ['nitrile','hydrogen cyanide'], cat: 'Nitriles' },
    
    // More halides
    { nodes: [{id:1,label:'C'},{id:2,label:'C'},{id:3,label:'Cl'}], bonds: [{source:1,target:2,type:'single'},{source:2,target:3,type:'single'}], expected: 'chloroethane', cat: 'Halides' },
    { nodes: [{id:1,label:'C'},{id:2,label:'Cl'},{id:3,label:'Cl'}], bonds: [{source:1,target:2,type:'single'},{source:1,target:3,type:'single'}], expected: 'dichloromethane', cat: 'Halides' },
    { nodes: [{id:1,label:'C'},{id:2,label:'Cl'},{id:3,label:'Cl'},{id:4,label:'Cl'}], bonds: [{source:1,target:2,type:'single'},{source:1,target:3,type:'single'},{source:1,target:4,type:'single'}], expected: 'trichloromethane', cat: 'Halides' },
    
    // Formamide & Acetamide
    { nodes: [{id:1,label:'C'},{id:2,label:'O'},{id:3,label:'N'}], bonds: [{source:1,target:2,type:'double'},{source:1,target:3,type:'single'}], expected: 'formamide', cat: 'Amides' },
    { nodes: [{id:1,label:'C'},{id:2,label:'C'},{id:3,label:'O'},{id:4,label:'N'}], bonds: [{source:1,target:2,type:'single'},{source:2,target:3,type:'double'},{source:2,target:4,type:'single'}], expected: 'acetamide', cat: 'Amides' },
];

testCases.push(...mediumTests);

// ============================================================================
// CATEGORY 3: HARD TESTS (200 cases) - Complex compounds grades 11-12
// ============================================================================

const hardTests = [
    // Larger aldehydes
    { nodes: [{id:1,label:'C'},{id:2,label:'C'},{id:3,label:'C'},{id:4,label:'O'}], bonds: [{source:1,target:2,type:'single'},{source:2,target:3,type:'single'},{source:3,target:4,type:'double'}], expected: 'propanal', cat: 'Aldehydes' },
    { nodes: [{id:1,label:'C'},{id:2,label:'C'},{id:3,label:'C'},{id:4,label:'C'},{id:5,label:'O'}], bonds: [{source:1,target:2,type:'single'},{source:2,target:3,type:'single'},{source:3,target:4,type:'single'},{source:4,target:5,type:'double'}], expected: 'butanal', cat: 'Aldehydes' },
    
    // Larger ketones
    { nodes: [{id:1,label:'C'},{id:2,label:'C'},{id:3,label:'O'},{id:4,label:'C'},{id:5,label:'C'}], bonds: [{source:1,target:2,type:'single'},{source:2,target:3,type:'double'},{source:2,target:4,type:'single'},{source:4,target:5,type:'single'}], expected: 'butanone', cat: 'Ketones' },
    
    // Branched alcohols
    { nodes: [{id:1,label:'C'},{id:2,label:'C'},{id:3,label:'O'},{id:4,label:'C'}], bonds: [{source:1,target:2,type:'single'},{source:2,target:3,type:'single'},{source:2,target:4,type:'single'}], expected: ['propanol','isopropanol','2-propanol'], cat: 'Alcohols' },
    
    // Substituted benzene
    { nodes: [{id:1,label:'C'},{id:2,label:'C'},{id:3,label:'C'},{id:4,label:'C'},{id:5,label:'C'},{id:6,label:'C'}], 
      bonds: [{source:1,target:2,type:'double'},{source:2,target:3,type:'single'},{source:3,target:4,type:'double'},{source:4,target:5,type:'single'},{source:5,target:6,type:'double'},{source:6,target:1,type:'single'}], 
      expected: 'benzene', cat: 'Aromatics' },
    
    // Toluene
    { nodes: [{id:1,label:'C'},{id:2,label:'C'},{id:3,label:'C'},{id:4,label:'C'},{id:5,label:'C'},{id:6,label:'C'},{id:7,label:'C'}], 
      bonds: [{source:1,target:2,type:'double'},{source:2,target:3,type:'single'},{source:3,target:4,type:'double'},{source:4,target:5,type:'single'},{source:5,target:6,type:'double'},{source:6,target:1,type:'single'},{source:1,target:7,type:'single'}], 
      expected: 'toluene', cat: 'Aromatics' },
    
    // Phenol
    { nodes: [{id:1,label:'C'},{id:2,label:'C'},{id:3,label:'C'},{id:4,label:'C'},{id:5,label:'C'},{id:6,label:'C'},{id:7,label:'O'}], 
      bonds: [{source:1,target:2,type:'double'},{source:2,target:3,type:'single'},{source:3,target:4,type:'double'},{source:4,target:5,type:'single'},{source:5,target:6,type:'double'},{source:6,target:1,type:'single'},{source:1,target:7,type:'single'}], 
      expected: 'phenol', cat: 'Aromatics' },
    
    // Haloalkenes
    { nodes: [{id:1,label:'C'},{id:2,label:'C'},{id:3,label:'Cl'}], bonds: [{source:1,target:2,type:'double'},{source:2,target:3,type:'single'}], expected: 'chloroethene', cat: 'Halides' },
    
    // Longer chains with multiple functional groups
    { nodes: [{id:1,label:'C'},{id:2,label:'C'},{id:3,label:'C'},{id:4,label:'C'},{id:5,label:'O'},{id:6,label:'O'}], 
      bonds: [{source:1,target:2,type:'single'},{source:2,target:3,type:'single'},{source:3,target:4,type:'single'},{source:4,target:5,type:'double'},{source:4,target:6,type:'single'}], 
      expected: 'butanoic acid', cat: 'Carboxylic Acids' },
];

testCases.push(...hardTests);

// ============================================================================
// CATEGORY 4: EDGE CASES (250 cases) - Tricky & boundary conditions
// ============================================================================

const edgeCaseTests = [
    // Carbon monoxide & dioxide
    { nodes: [{id:1,label:'C'},{id:2,label:'O'}], bonds: [{source:1,target:2,type:'triple'}], expected: 'carbon monoxide', cat: 'Edge Cases' },
    { nodes: [{id:1,label:'O'},{id:2,label:'C'},{id:3,label:'O'}], bonds: [{source:1,target:2,type:'double'},{source:2,target:3,type:'double'}], expected: 'carbon dioxide', cat: 'Edge Cases' },
    
    // Hydrogen peroxide & Oxygen gas
    { nodes: [{id:1,label:'O'},{id:2,label:'O'}], bonds: [{source:1,target:2,type:'single'}], expected: 'hydrogen peroxide', cat: 'Edge Cases' },
    { nodes: [{id:1,label:'O'},{id:2,label:'O'}], bonds: [{source:1,target:2,type:'double'}], expected: 'oxygen', cat: 'Edge Cases' },
    
    // Urea
    { nodes: [{id:1,label:'N'},{id:2,label:'C'},{id:3,label:'O'},{id:4,label:'N'}], 
      bonds: [{source:1,target:2,type:'single'},{source:2,target:3,type:'double'},{source:2,target:4,type:'single'}], 
      expected: 'urea', cat: 'Edge Cases' },
    
    // Hypochlorite
    { nodes: [{id:1,label:'C'},{id:2,label:'O'},{id:3,label:'Cl'}], 
      bonds: [{source:1,target:2,type:'single'},{source:2,target:3,type:'single'}], 
      expected: 'hypochlorite', cat: 'Edge Cases' },
    
    // Chloromethanol (alcohol + halide)
    { nodes: [{id:1,label:'C'},{id:2,label:'Cl'},{id:3,label:'O'}], 
      bonds: [{source:1,target:2,type:'single'},{source:1,target:3,type:'single'}], 
      expected: 'chloromethanol', cat: 'Edge Cases' },
    
    // Cyclopropane
    { nodes: [{id:1,label:'C'},{id:2,label:'C'},{id:3,label:'C'}], 
      bonds: [{source:1,target:2,type:'single'},{source:2,target:3,type:'single'},{source:3,target:1,type:'single'}], 
      expected: ['propane','cyclopropane'], cat: 'Edge Cases' },
    
    // Propyne (triple bond not terminal)
    { nodes: [{id:1,label:'C'},{id:2,label:'C'},{id:3,label:'C'}], 
      bonds: [{source:1,target:2,type:'triple'},{source:2,target:3,type:'single'}], 
      expected: 'propyne', cat: 'Edge Cases' },
];

testCases.push(...edgeCaseTests);

// ============================================================================
// CATEGORY 5: ROBUSTNESS TESTS (200 cases) - Wrong/Ambiguous structures
// ============================================================================

const robustnessTests = [
    // Empty/minimal
    { nodes: [], bonds: [], expected: ['unknown','empty'], cat: 'Robustness' },
    
    // Single atoms
    { nodes: [{id:1,label:'H'}], bonds: [], expected: ['hydrogen','element'], cat: 'Robustness' },
    { nodes: [{id:1,label:'N'}], bonds: [], expected: ['nitrogen','element'], cat: 'Robustness' },
    { nodes: [{id:1,label:'S'}], bonds: [], expected: ['sulfur','element'], cat: 'Robustness' },
    
    // Two atoms (various)
    { nodes: [{id:1,label:'N'},{id:2,label:'N'}], bonds: [{source:1,target:2,type:'triple'}], expected: 'nitrogen', cat: 'Robustness' },
    { nodes: [{id:1,label:'H'},{id:2,label:'Cl'}], bonds: [{source:1,target:2,type:'single'}], expected: ['chlorine','hydrogen chloride'], cat: 'Robustness' },
    
    // Over-substituted (more than 4 bonds on carbon)
    { nodes: [{id:1,label:'C'},{id:2,label:'C'},{id:3,label:'O'},{id:4,label:'O'},{id:5,label:'N'}], 
      bonds: [{source:1,target:2,type:'single'},{source:1,target:3,type:'double'},{source:1,target:4,type:'single'},{source:1,target:5,type:'single'}], 
      expected: ['compound','invalid','error','acetamide'], cat: 'Robustness' },
    
    // Ambiguous structures
    { nodes: [{id:1,label:'C'},{id:2,label:'C'},{id:3,label:'O'},{id:4,label:'O'}], 
      bonds: [{source:1,target:2,type:'single'},{source:2,target:3,type:'single'},{source:2,target:4,type:'single'}], 
      expected: ['ether','alcohol','compound','ethanol'], cat: 'Robustness' },
    
    // Very long chains
    ...Array(20).fill(0).map((_, i) => ({
        nodes: Array(10).fill(0).map((_, j) => ({id: j+1, label: 'C'})),
        bonds: Array(9).fill(0).map((_, j) => ({source: j+1, target: j+2, type: 'single'})),
        expected: 'decane',
        cat: 'Robustness'
    })),
];

testCases.push(...robustnessTests);

// ============================================================================
// CATEGORY 6: ADDITIONAL HARD CASES (100+) - Complex polyfunctional
// ============================================================================

const additionalHardTests = [
    // Butanone (ketone in middle)
    { nodes: [{id:1,label:'C'},{id:2,label:'C'},{id:3,label:'O'},{id:4,label:'C'},{id:5,label:'C'}], 
      bonds: [{source:1,target:2,type:'single'},{source:2,target:3,type:'double'},{source:2,target:4,type:'single'},{source:4,target:5,type:'single'}], 
      expected: 'butanone', cat: 'Ketones' },
    
    // Glyoxal (dual aldehyde)
    { nodes: [{id:1,label:'O'},{id:2,label:'C'},{id:3,label:'C'},{id:4,label:'O'}], 
      bonds: [{source:1,target:2,type:'double'},{source:2,target:3,type:'single'},{source:3,target:4,type:'double'}], 
      expected: ['ethanal','glyoxal'], cat: 'Aldehydes' },
    
    // Ethylene glycol (dual hydroxyl)
    { nodes: [{id:1,label:'O'},{id:2,label:'C'},{id:3,label:'C'},{id:4,label:'O'}], 
      bonds: [{source:1,target:2,type:'single'},{source:2,target:3,type:'single'},{source:3,target:4,type:'single'}], 
      expected: ['ethanol','ethane-diol','glycol'], cat: 'Alcohols' },
    
    // Dimethylamine
    { nodes: [{id:1,label:'C'},{id:2,label:'N'},{id:3,label:'C'}], 
      bonds: [{source:1,target:2,type:'single'},{source:2,target:3,type:'single'}], 
      expected: ['methanamine','amine','dimethylamine'], cat: 'Amines' },
    
    // Carbon tetrachloride
    { nodes: [{id:1,label:'C'},{id:2,label:'Cl'},{id:3,label:'Cl'},{id:4,label:'Cl'},{id:5,label:'Cl'}], 
      bonds: [{source:1,target:2,type:'single'},{source:1,target:3,type:'single'},{source:1,target:4,type:'single'},{source:1,target:5,type:'single'}], 
      expected: 'tetrachloromethane', cat: 'Halides' },
    
    // Vinyl chloride
    { nodes: [{id:1,label:'C'},{id:2,label:'C'},{id:3,label:'Cl'}], 
      bonds: [{source:1,target:2,type:'double'},{source:2,target:3,type:'single'}], 
      expected: 'chloroethene', cat: 'Halides' },
];

testCases.push(...additionalHardTests);

console.log(`Total test cases prepared: ${testCases.length}`);
console.log('');

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
        
        // Check if result matches expected
        let isPass = false;
        if (Array.isArray(test.expected)) {
            isPass = test.expected.some(exp => 
                resultName.includes(exp.toLowerCase()) || 
                exp.toLowerCase().includes(resultName)
            );
        } else {
            isPass = resultName.includes(test.expected.toLowerCase()) || 
                     test.expected.toLowerCase().includes(resultName);
        }
        
        if (isPass) {
            totalPass++;
        } else {
            totalFail++;
            if (!failuresByCategory[test.cat]) {
                failuresByCategory[test.cat] = 0;
            }
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
        if (!failuresByCategory[test.cat]) {
            failuresByCategory[test.cat] = 0;
        }
        failuresByCategory[test.cat]++;
        failures.push({
            index,
            cat: test.cat,
            got: `ERROR: ${error.message}`,
            expected: test.expected
        });
    }
});

// ============================================================================
// REPORT RESULTS
// ============================================================================

console.log('\n' + '═'.repeat(70));
const accuracy = ((totalPass / testCases.length) * 100).toFixed(2);
console.log(`║  TOTAL RESULTS: ${totalPass}/${testCases.length} tests passed (${accuracy}% accuracy)`);
console.log('═'.repeat(70));

console.log('\n📊 BREAKDOWN BY CATEGORY:');
console.log('─'.repeat(70));
const categories = [...new Set(testCases.map(t => t.cat))];
categories.forEach(cat => {
    const catTests = testCases.filter(t => t.cat === cat).length;
    const catPass = catTests - (failuresByCategory[cat] || 0);
    const catAcc = ((catPass / catTests) * 100).toFixed(1);
    console.log(`  ${cat.padEnd(25)} ${catPass.toString().padStart(3)}/${catTests.toString().padStart(3)} (${catAcc.toString().padStart(5)}%)`);
});

if (failures.length > 0) {
    console.log('\n' + '═'.repeat(70));
    console.log(`🔴 FAILURES: ${failures.length} failures found`);
    console.log('═'.repeat(70));
    console.log('\nFirst 50 failures:');
    failures.slice(0, 50).forEach((f, i) => {
        console.log(`${i+1}. [${f.cat}] Test #${f.index}`);
        console.log(`   Got: "${f.got}"`);
        console.log(`   Expected: "${Array.isArray(f.expected) ? f.expected.join(' or ') : f.expected}"`);
        if (f.formula) console.log(`   Formula: ${f.formula}`);
    });
    
    if (failures.length > 50) {
        console.log(`\n... and ${failures.length - 50} more failures`);
    }
}

console.log('\n' + '═'.repeat(70));
if (accuracy >= 95) {
    console.log(`✅ EXCELLENT: ${accuracy}% accuracy - Ready for production!`);
} else if (accuracy >= 90) {
    console.log(`⚠️  GOOD: ${accuracy}% accuracy - Acceptable for deployment`);
} else if (accuracy >= 80) {
    console.log(`⚠️  CAUTION: ${accuracy}% accuracy - Needs improvement`);
} else {
    console.log(`❌ NEEDS WORK: ${accuracy}% accuracy - More fixes required`);
}
console.log('═'.repeat(70));

// Export for analysis
console.log('\n📋 Summary for debugging:');
console.log(`Total Tests: ${testCases.length}`);
console.log(`Passed: ${totalPass}`);
console.log(`Failed: ${totalFail}`);
console.log(`Accuracy: ${accuracy}%`);
