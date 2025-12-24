// API Endpoint Tests
const http = require('http');

function makeRequest(method, path, data) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: 5000,
            path: path,
            method: method,
            headers: {
                'Content-Type': 'application/json'
            }
        };

        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                try {
                    resolve({
                        status: res.statusCode,
                        data: JSON.parse(body)
                    });
                } catch (e) {
                    resolve({
                        status: res.statusCode,
                        data: body
                    });
                }
            });
        });

        req.on('error', (err) => {
            console.error('Request error:', err.message);
            reject(err);
        });
        
        if (data) req.write(JSON.stringify(data));
        req.end();
    });
}

async function runTests() {
    console.log('\n🌐 Testing API Endpoints...\n');

    try {
        // Wait for server to be ready
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Test 1: Register new user
        console.log('1️⃣ Testing Registration API...');
        try {
            const registerRes = await makeRequest('POST', '/api/register', {
                fullName: 'John Scientist',
                email: 'john@example.com',
                password: 'secure123'
            });
            console.log('   Status:', registerRes.status);
            console.log('   Response:', JSON.stringify(registerRes.data, null, 2).substring(0, 200));
            console.log();
        } catch (e) {
            console.log('   Error:', e.message);
            console.log();
        }

        // Test 2: Login
        console.log('2️⃣ Testing Login API...');
        try {
            const loginRes = await makeRequest('POST', '/api/login', {
                email: 'john@example.com',
                password: 'secure123'
            });
            console.log('   Status:', loginRes.status);
            console.log('   User:', loginRes.data.user?.email);
            console.log();
        } catch (e) {
            console.log('   Error:', e.message);
            console.log();
        }

        console.log('✅ API tests completed!\n');
        process.exit(0);
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        process.exit(1);
    }
}

runTests();
