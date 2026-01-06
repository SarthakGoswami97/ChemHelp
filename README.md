# 🧪 ChemHelp - Chemistry Drawing Application

A web-based chemistry drawing application with AI-powered features.

## 📁 Project Structure

```
chemhelp/
├── 📂 public/               # Frontend files (served to browser)
│   ├── 📂 css/              # Stylesheets
│   │   └── styles.css       # Main application styles
│   ├── 📂 js/               # JavaScript files
│   │   └── app.js           # Main application logic
│   ├── index.html           # Main application page
│   └── login.html           # Login/signup page
│
├── 📂 src/                  # Backend source files
│   ├── 📂 api/              # API route handlers
│   │   └── reactions-api.js # Chemistry reactions endpoints
│   └── 📂 config/           # Configuration files
│       └── reactions.json   # Reactions database
│
├── 📂 database/             # Database files
│   ├── chemhelp.db          # SQLite database (users, structures, reactions)
│   ├── db.js                # Database helper functions
│   └── schema.sql           # Database schema definition
│
├── 📂 docs/                 # Documentation
│   ├── DATABASE_IMPLEMENTATION_CHECKLIST.md
│   ├── PROFILE_SYSTEM.md
│   ├── REACTIONS_IMPLEMENTATION_PLAN.md
│   └── UPDATES_SUMMARY.md
│
├── 📂 tests/                # Test files
│   ├── test-api.js          # API endpoint tests (Node.js)
│   ├── test-api.py          # API endpoint tests (Python)
│   └── test-db.js           # Database function tests
│
├── 📂 backups/              # Backup files
│   ├── users.json.backup
│   └── package.json.backup
│
├── server.js                # Express server (main entry point)
├── package.json             # NPM dependencies
└── README.md                # This file
```

## 🚀 Getting Started

### Prerequisites
- Node.js v14+
- npm

### Installation
```bash
npm install
```

### Running the Server
```bash
npm start
```
Server runs at: http://localhost:5000

### Development Mode
```bash
npm run dev
```

## 🔑 Features

- **Chemistry Drawing** - Draw molecular structures with bonds
- **User Accounts** - Register, login, save structures
- **Profile System** - Photo upload, editable name
- **Dark Mode** - Toggle between light/dark themes
- **Reactions** - View and explore chemistry reactions
- **SQLite Database** - Persistent user data storage

## 📊 Database Schema

### Users Table
| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER | Primary key |
| fullName | TEXT | User's full name |
| email | TEXT | User's email (unique) |
| password | TEXT | Hashed password (bcrypt) |
| photo | TEXT | Profile photo (base64) |

### Structures Table
| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER | Primary key |
| userId | INTEGER | Foreign key to users |
| name | TEXT | Structure name |
| data | TEXT | JSON structure data |

### Reactions Table
| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER | Primary key |
| userId | INTEGER | Foreign key to users |
| reactionName | TEXT | Reaction name |
| savedData | TEXT | JSON reaction data |

## 🔧 API Endpoints

### Authentication
- `POST /api/register` - Create new account
- `POST /api/login` - Login to account

### User Profile
- `GET /api/user/:email` - Get user profile
- `POST /api/user/:email/profile-update` - Update profile (name, photo)

### Structures
- `POST /api/user/:email/save-structure` - Save structure
- `GET /api/user/:email/structures` - Get saved structures

### Reactions
- `GET /api/reactions` - Get all reactions
- `GET /api/reactions/:id` - Get reaction by ID

## 👤 Test Users

| Email | Password |
|-------|----------|
| john@example.com | secure123 |
| demo@test.com | (demo mode) |

## 📝 License

MIT
