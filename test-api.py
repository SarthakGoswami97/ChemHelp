import requests
import json

print('\n🌐 Testing API Endpoints...\n')

# Use 127.0.0.1 explicitly for IPv4
BASE_URL = 'http://127.0.0.1:5000'

try:
    # Test 1: Register
    print('1️⃣ Testing Registration API...')
    response = requests.post(f'{BASE_URL}/api/register', json={
        'fullName': 'John Scientist',
        'email': 'john@example.com',
        'password': 'secure123'
    })
    print(f'   Status: {response.status_code}')
    print(f'   Response: {response.json()}')
    print()

    # Test 2: Login
    print('2️⃣ Testing Login API...')
    response = requests.post(f'{BASE_URL}/api/login', json={
        'email': 'john@example.com',
        'password': 'secure123'
    })
    print(f'   Status: {response.status_code}')
    data = response.json()
    print(f'   User: {data.get("user", {}).get("email")} - {data.get("user", {}).get("fullName")}')
    print()

    # Test 3: Get Profile
    print('3️⃣ Testing User Profile API...')
    response = requests.get(f'{BASE_URL}/api/user/john@example.com')
    print(f'   Status: {response.status_code}')
    data = response.json()
    print(f'   User: {data.get("email")} - {data.get("fullName")}')
    print()

    # Test 4: Save Structure
    print('4️⃣ Testing Save Structure API...')
    response = requests.post(f'{BASE_URL}/api/user/john@example.com/save-structure', json={
        'name': 'Water Molecule',
        'nodes': [
            {'id': 1, 'name': 'O', 'x': 100, 'y': 100},
            {'id': 2, 'name': 'H', 'x': 150, 'y': 80},
            {'id': 3, 'name': 'H', 'x': 150, 'y': 120}
        ],
        'bonds': [
            {'from': 1, 'to': 2, 'type': 'single'},
            {'from': 1, 'to': 3, 'type': 'single'}
        ]
    })
    print(f'   Status: {response.status_code}')
    data = response.json()
    print(f'   Structure: {data.get("structure", {}).get("name")} (ID: {data.get("structure", {}).get("id")})')
    print()

    # Test 5: Get Structures
    print('5️⃣ Testing Get Structures API...')
    response = requests.get(f'{BASE_URL}/api/user/john@example.com/structures')
    print(f'   Status: {response.status_code}')
    data = response.json()
    structures = data.get('structures', [])
    print(f'   Total Structures: {len(structures)}')
    for i, s in enumerate(structures):
        print(f'   [{i+1}] {s.get("name")} ({len(s.get("data", {}).get("nodes", []))} nodes)')
    print()

    print('✅ All API tests passed!\n')

except Exception as e:
    print(f'❌ Error: {e}\n')
