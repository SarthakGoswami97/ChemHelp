// Quick test script for database functionality
const db = require('./database/db');

async function runTests() {
    try {
        console.log('\n🧪 Starting Database Tests...\n');

        // Initialize database
        console.log('1️⃣ Initializing database...');
        await db.initDatabase();
        console.log('✅ Database initialized\n');

        // Test 1: Create a user
        console.log('2️⃣ Creating test user...');
        const testUser = await db.createUser('Test User', 'test@example.com', 'password123', null);
        console.log('✅ User created:', testUser);
        console.log('   ID:', testUser.id);
        console.log('   Email:', testUser.email, '\n');

        // Test 2: Retrieve user by email
        console.log('3️⃣ Retrieving user by email...');
        const retrievedUser = await db.getUserByEmail('test@example.com');
        console.log('✅ User retrieved:', retrievedUser.email, retrievedUser.fullName);
        console.log('   Password hashed:', retrievedUser.password.substring(0, 20) + '...', '\n');

        // Test 3: Verify password
        console.log('4️⃣ Verifying password...');
        const isValid = await db.verifyPassword('password123', retrievedUser.password);
        console.log('✅ Password valid:', isValid);
        const isInvalid = await db.verifyPassword('wrongpassword', retrievedUser.password);
        console.log('✅ Wrong password rejected:', !isInvalid, '\n');

        // Test 4: Save a structure
        console.log('5️⃣ Saving a structure...');
        const structureData = {
            nodes: [
                { id: 1, name: 'C', x: 100, y: 100 },
                { id: 2, name: 'H', x: 150, y: 100 }
            ],
            bonds: [{ from: 1, to: 2, type: 'single' }]
        };
        const structure = await db.saveStructure(testUser.id, 'Test Molecule', structureData);
        console.log('✅ Structure saved:', structure, '\n');

        // Test 5: Retrieve user structures
        console.log('6️⃣ Retrieving user structures...');
        const structures = await db.getUserStructures(testUser.id);
        console.log('✅ Structures retrieved:', structures.length);
        structures.forEach((s, i) => {
            console.log(`   [${i + 1}] ${s.name} (${s.data.nodes.length} nodes)`);
        });
        console.log();

        // Test 6: Save a reaction
        console.log('7️⃣ Saving a reaction...');
        const reactionData = {
            reactants: ['H2', 'O2'],
            products: ['H2O'],
            balanced: false
        };
        const reaction = await db.saveReaction(testUser.id, 'Hydrogen Combustion', reactionData);
        console.log('✅ Reaction saved:', reaction, '\n');

        // Test 7: Retrieve reactions
        console.log('8️⃣ Retrieving user reactions...');
        const reactions = await db.getUserReactions(testUser.id);
        console.log('✅ Reactions retrieved:', reactions.length);
        reactions.forEach((r, i) => {
            console.log(`   [${i + 1}] ${r.reactionName}`);
        });
        console.log();

        // Test 8: Get database stats
        console.log('9️⃣ Getting database statistics...');
        const stats = await db.getDatabaseStats();
        console.log('✅ Database Stats:');
        console.log('   Total Users:', stats.users);
        console.log('   Total Structures:', stats.structures);
        console.log('   Total Reactions:', stats.reactions, '\n');

        console.log('✅ All tests passed!\n');
        process.exit(0);
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        process.exit(1);
    }
}

runTests();
