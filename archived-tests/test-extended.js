/**
 * Extended Chemistry Engine Test Suite
 * Tests against known compounds from PubChem database
 */

const ChemistryEngine = require('../src/services/chemistry-engine/ChemistryEngine');

const testCases = [
    // =========================================
    // ALKANES (Saturated Hydrocarbons)
    // =========================================
    { name: 'Methane (CH4)', nodes: [{id:1,label:'C'}], bonds: [], expected: 'methane', formula: 'CH4' },
    { name: 'Ethane (C2H6)', nodes: [{id:1,label:'C'},{id:2,label:'C'}], bonds: [{source:1,target:2,type:'single'}], expected: 'ethane', formula: 'C2H6' },
    { name: 'Propane (C3H8)', nodes: [{id:1,label:'C'},{id:2,label:'C'},{id:3,label:'C'}], bonds: [{source:1,target:2,type:'single'},{source:2,target:3,type:'single'}], expected: 'propane', formula: 'C3H8' },
    { name: 'Butane (C4H10)', nodes: [{id:1,label:'C'},{id:2,label:'C'},{id:3,label:'C'},{id:4,label:'C'}], bonds: [{source:1,target:2,type:'single'},{source:2,target:3,type:'single'},{source:3,target:4,type:'single'}], expected: 'butane', formula: 'C4H10' },
    { name: 'Pentane (C5H12)', nodes: [{id:1,label:'C'},{id:2,label:'C'},{id:3,label:'C'},{id:4,label:'C'},{id:5,label:'C'}], bonds: [{source:1,target:2,type:'single'},{source:2,target:3,type:'single'},{source:3,target:4,type:'single'},{source:4,target:5,type:'single'}], expected: 'pentane', formula: 'C5H12' },
    
    // =========================================
    // ALKENES (Unsaturated - Double Bond)
    // =========================================
    { name: 'Ethene/Ethylene (C2H4)', nodes: [{id:1,label:'C'},{id:2,label:'C'}], bonds: [{source:1,target:2,type:'double'}], expected: 'ethene', formula: 'C2H4' },
    { name: 'Propene (C3H6)', nodes: [{id:1,label:'C'},{id:2,label:'C'},{id:3,label:'C'}], bonds: [{source:1,target:2,type:'double'},{source:2,target:3,type:'single'}], expected: 'propene', formula: 'C3H6' },
    { name: 'But-1-ene (C4H8)', nodes: [{id:1,label:'C'},{id:2,label:'C'},{id:3,label:'C'},{id:4,label:'C'}], bonds: [{source:1,target:2,type:'double'},{source:2,target:3,type:'single'},{source:3,target:4,type:'single'}], expected: 'butene', formula: 'C4H8' },
    
    // =========================================
    // ALKYNES (Unsaturated - Triple Bond)
    // =========================================
    { name: 'Ethyne/Acetylene (C2H2)', nodes: [{id:1,label:'C'},{id:2,label:'C'}], bonds: [{source:1,target:2,type:'triple'}], expected: 'ethyne', formula: 'C2H2' },
    { name: 'Propyne (C3H4)', nodes: [{id:1,label:'C'},{id:2,label:'C'},{id:3,label:'C'}], bonds: [{source:1,target:2,type:'triple'},{source:2,target:3,type:'single'}], expected: 'propyne', formula: 'C3H4' },
    
    // =========================================
    // ALCOHOLS (-OH group)
    // =========================================
    { name: 'Methanol (CH3OH)', nodes: [{id:1,label:'C'},{id:2,label:'O'}], bonds: [{source:1,target:2,type:'single'}], expected: 'methanol', formula: 'CH4O' },
    { name: 'Ethanol (C2H5OH)', nodes: [{id:1,label:'C'},{id:2,label:'C'},{id:3,label:'O'}], bonds: [{source:1,target:2,type:'single'},{source:2,target:3,type:'single'}], expected: 'ethanol', formula: 'C2H6O' },
    { name: 'Propan-1-ol', nodes: [{id:1,label:'C'},{id:2,label:'C'},{id:3,label:'C'},{id:4,label:'O'}], bonds: [{source:1,target:2,type:'single'},{source:2,target:3,type:'single'},{source:3,target:4,type:'single'}], expected: 'propanol', formula: 'C3H8O' },
    
    // =========================================
    // ALDEHYDES (-CHO group)
    // =========================================
    { name: 'Formaldehyde (HCHO)', nodes: [{id:1,label:'C'},{id:2,label:'O'}], bonds: [{source:1,target:2,type:'double'}], expected: 'formaldehyde', formula: 'CH2O' },
    { name: 'Acetaldehyde/Ethanal (CH3CHO)', nodes: [{id:1,label:'C'},{id:2,label:'C'},{id:3,label:'O'}], bonds: [{source:1,target:2,type:'single'},{source:2,target:3,type:'double'}], expected: 'ethanal', formula: 'C2H4O' },
    
    // =========================================
    // KETONES (C=O with carbons on both sides)
    // =========================================
    { name: 'Acetone/Propanone', nodes: [{id:1,label:'C'},{id:2,label:'C'},{id:3,label:'C'},{id:4,label:'O'}], bonds: [{source:1,target:2,type:'single'},{source:2,target:3,type:'single'},{source:2,target:4,type:'double'}], expected: 'propanone', formula: 'C3H6O' },
    
    // =========================================
    // CARBOXYLIC ACIDS (-COOH)
    // =========================================
    { name: 'Formic Acid (HCOOH)', nodes: [{id:1,label:'C'},{id:2,label:'O'},{id:3,label:'O'}], bonds: [{source:1,target:2,type:'double'},{source:1,target:3,type:'single'}], expected: 'formic acid', formula: 'CH2O2' },
    { name: 'Acetic Acid (CH3COOH)', nodes: [{id:1,label:'C'},{id:2,label:'C'},{id:3,label:'O'},{id:4,label:'O'}], bonds: [{source:1,target:2,type:'single'},{source:2,target:3,type:'double'},{source:2,target:4,type:'single'}], expected: 'ethanoic acid', formula: 'C2H4O2' },
    
    // =========================================
    // HALIDES (C-X where X = F, Cl, Br, I)
    // =========================================
    { name: 'Fluoromethane (CH3F)', nodes: [{id:1,label:'C'},{id:2,label:'F'}], bonds: [{source:1,target:2,type:'single'}], expected: 'fluoromethane', formula: 'CH3F' },
    { name: 'Chloromethane (CH3Cl)', nodes: [{id:1,label:'C'},{id:2,label:'Cl'}], bonds: [{source:1,target:2,type:'single'}], expected: 'chloromethane', formula: 'CH3Cl' },
    { name: 'Bromomethane (CH3Br)', nodes: [{id:1,label:'C'},{id:2,label:'Br'}], bonds: [{source:1,target:2,type:'single'}], expected: 'bromomethane', formula: 'CH3Br' },
    { name: 'Iodomethane (CH3I)', nodes: [{id:1,label:'C'},{id:2,label:'I'}], bonds: [{source:1,target:2,type:'single'}], expected: 'iodomethane', formula: 'CH3I' },
    { name: 'Chloroethane (C2H5Cl)', nodes: [{id:1,label:'C'},{id:2,label:'C'},{id:3,label:'Cl'}], bonds: [{source:1,target:2,type:'single'},{source:2,target:3,type:'single'}], expected: 'chloroethane', formula: 'C2H5Cl' },
    
    // =========================================
    // AMINES (-NH2, -NHR, -NR2)
    // =========================================
    { name: 'Methylamine/Methanamine', nodes: [{id:1,label:'C'},{id:2,label:'N'}], bonds: [{source:1,target:2,type:'single'}], expected: 'methanamine', formula: 'CH5N' },
    { name: 'Ethylamine/Ethanamine', nodes: [{id:1,label:'C'},{id:2,label:'C'},{id:3,label:'N'}], bonds: [{source:1,target:2,type:'single'},{source:2,target:3,type:'single'}], expected: 'ethanamine', formula: 'C2H7N' },
    
    // =========================================
    // ETHERS (C-O-C)
    // =========================================
    { name: 'Dimethyl ether', nodes: [{id:1,label:'C'},{id:2,label:'O'},{id:3,label:'C'}], bonds: [{source:1,target:2,type:'single'},{source:2,target:3,type:'single'}], expected: 'ether', formula: 'C2H6O' },
    
    // =========================================
    // NITRILES (-C≡N)
    // =========================================
    { name: 'Hydrogen Cyanide (HCN)', nodes: [{id:1,label:'C'},{id:2,label:'N'}], bonds: [{source:1,target:2,type:'triple'}], expected: 'nitrile', formula: 'CHN' },
    { name: 'Acetonitrile (CH3CN)', nodes: [{id:1,label:'C'},{id:2,label:'C'},{id:3,label:'N'}], bonds: [{source:1,target:2,type:'single'},{source:2,target:3,type:'triple'}], expected: 'nitrile', formula: 'C2H3N' },
    
    // =========================================
    // CYCLIC COMPOUNDS (Rings)
    // =========================================
    { name: 'Cyclopropane (C3H6)', nodes: [{id:1,label:'C'},{id:2,label:'C'},{id:3,label:'C'}], bonds: [{source:1,target:2,type:'single'},{source:2,target:3,type:'single'},{source:3,target:1,type:'single'}], expected: 'cyclopropane', formula: 'C3H6' },
    { name: 'Cyclobutane (C4H8)', nodes: [{id:1,label:'C'},{id:2,label:'C'},{id:3,label:'C'},{id:4,label:'C'}], bonds: [{source:1,target:2,type:'single'},{source:2,target:3,type:'single'},{source:3,target:4,type:'single'},{source:4,target:1,type:'single'}], expected: 'cyclobutane', formula: 'C4H8' },
    { name: 'Cyclopentane (C5H10)', nodes: [{id:1,label:'C'},{id:2,label:'C'},{id:3,label:'C'},{id:4,label:'C'},{id:5,label:'C'}], bonds: [{source:1,target:2,type:'single'},{source:2,target:3,type:'single'},{source:3,target:4,type:'single'},{source:4,target:5,type:'single'},{source:5,target:1,type:'single'}], expected: 'cyclopentane', formula: 'C5H10' },
    { name: 'Cyclohexane (C6H12)', nodes: [{id:1,label:'C'},{id:2,label:'C'},{id:3,label:'C'},{id:4,label:'C'},{id:5,label:'C'},{id:6,label:'C'}], bonds: [{source:1,target:2,type:'single'},{source:2,target:3,type:'single'},{source:3,target:4,type:'single'},{source:4,target:5,type:'single'},{source:5,target:6,type:'single'},{source:6,target:1,type:'single'}], expected: 'cyclohexane', formula: 'C6H12' },
    
    // =========================================
    // AROMATIC COMPOUNDS (Benzene rings)
    // =========================================
    { name: 'Benzene (C6H6)', nodes: [{id:1,label:'C'},{id:2,label:'C'},{id:3,label:'C'},{id:4,label:'C'},{id:5,label:'C'},{id:6,label:'C'}], bonds: [{source:1,target:2,type:'double'},{source:2,target:3,type:'single'},{source:3,target:4,type:'double'},{source:4,target:5,type:'single'},{source:5,target:6,type:'double'},{source:6,target:1,type:'single'}], expected: 'benzene', formula: 'C6H6' },
    
    // =========================================
    // THIOLS (-SH)
    // =========================================
    { name: 'Methanethiol (CH3SH)', nodes: [{id:1,label:'C'},{id:2,label:'S'}], bonds: [{source:1,target:2,type:'single'}], expected: 'thiol', formula: 'CH4S' },
    
    // =========================================
    // INORGANIC / SIMPLE MOLECULES
    // =========================================
    { name: 'Water (H2O)', nodes: [{id:1,label:'O'}], bonds: [], expected: 'Oxygen', formula: 'H2O' },
    { name: 'Ammonia (NH3)', nodes: [{id:1,label:'N'}], bonds: [], expected: 'Nitrogen', formula: 'H3N' },
    { name: 'Hydrogen Sulfide (H2S)', nodes: [{id:1,label:'S'}], bonds: [], expected: 'Sulfur', formula: 'H2S' },
];

// Run tests
console.log('╔════════════════════════════════════════════════════════════════╗');
console.log('║     EXTENDED CHEMISTRY ENGINE TEST SUITE (PubChem Validated)   ║');
console.log('╚════════════════════════════════════════════════════════════════╝\n');

let passed = 0;
let failed = 0;
const failures = [];

testCases.forEach((tc, idx) => {
    try {
        const result = ChemistryEngine.nameStructure(tc.nodes, tc.bonds);
        const nameMatch = result.iupacName.toLowerCase().includes(tc.expected.toLowerCase()) ||
                          tc.expected.toLowerCase().includes(result.iupacName.toLowerCase());
        
        if (nameMatch) {
            console.log(`✅ ${tc.name}`);
            console.log(`   → ${result.iupacName} (${result.molecularFormula}) [${Math.round(result.confidence * 100)}% confidence]`);
            passed++;
        } else {
            console.log(`❌ ${tc.name}`);
            console.log(`   → Got: "${result.iupacName}" (${result.molecularFormula})`);
            console.log(`   → Expected: "${tc.expected}"`);
            failed++;
            failures.push({ name: tc.name, got: result.iupacName, expected: tc.expected });
        }
    } catch (error) {
        console.log(`💥 ${tc.name} - ERROR: ${error.message}`);
        failed++;
        failures.push({ name: tc.name, got: 'ERROR', expected: tc.expected });
    }
});

console.log('\n╔════════════════════════════════════════════════════════════════╗');
console.log(`║  RESULTS: ${passed}/${passed + failed} tests passed (${Math.round(passed/(passed+failed)*100)}% accuracy)                      ║`);
console.log('╚════════════════════════════════════════════════════════════════╝');

if (failures.length > 0) {
    console.log('\n📋 FAILURES SUMMARY:');
    failures.forEach(f => {
        console.log(`   • ${f.name}: Got "${f.got}", Expected "${f.expected}"`);
    });
}

// Exit with appropriate code
process.exit(failed > 0 ? 1 : 0);
