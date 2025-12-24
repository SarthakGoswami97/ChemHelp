# ChemHelp - Profile System Implementation

## Overview
A fully functional user profile system has been implemented for ChemHelp, allowing users to manage their accounts, save chemical structures, and track their progress.

## Features Implemented

### 1. **User Registration & Authentication**
- Users can create accounts with email and password (minimum 6 characters)
- Form validation for email format and password confirmation
- Demo login option for quick access
- Secure password storage in localStorage and server

### 2. **Profile Management**
- **Profile Modal**: Click the user profile button (👤) in the toolbar to view your profile
- **User Information Display**:
  - Full name
  - Email address
  - Number of structures saved
  - Account creation date
  
### 3. **Structure Management**
- **Save Structures to Profile**: Structures can be saved directly to your user profile
  - Use File → Save menu and select "Profile" option
  - Give structures custom names for easy identification
  - Track all saved structures in profile
  
- **Structure Storage**:
  - All structures are stored server-side in `users.json`
  - Each structure includes nodes, bonds, and creation timestamp
  - Automatic tracking of total structures saved

### 4. **Session Management**
- **Logout**: Click logout in profile modal to end your session
- **Auto-login**: On page load, the app checks for an active session
- **Profile Persistence**: User profile data syncs between client and server

## API Endpoints

### User Management
- `POST /api/register` - Register new user
- `GET /api/user/:email` - Fetch user profile
- `POST /api/user/:email/update` - Update user profile

### Structure Management
- `POST /api/user/:email/save-structure` - Save a structure to user profile
- `GET /api/user/:email/structures` - Fetch all user structures
- `POST /api/save` - Generic save endpoint (downloads locally)
- `GET /api/load` - Load previously saved data

## Data Storage

### Server-Side
- `users.json` - Contains all registered users and their structures
- `savedData.json` - Generic save/load data

### Client-Side
- `localStorage['chemhelp_currentUser']` - Current logged-in user
- `localStorage['chemhelp_users']` - Local backup of all users

## How to Use

### Registration
1. Click "Sign Up" on the login page
2. Enter full name, email, and password (minimum 6 characters)
3. Confirm password and click "Sign Up"
4. You'll be redirected to the main application

### Login
1. Enter email and password
2. Click "Login"
3. You'll be redirected to the main application with your profile loaded

### Saving Structures
1. Draw your chemical structure
2. Go to File → Save
3. Choose to save locally or to your profile
4. If saving to profile, enter a name for the structure
5. The structure is now saved to your account

### Viewing Profile
1. Click the user profile button (👤) in the top-right toolbar
2. View your information and saved structures count
3. Click "Logout" to end your session
4. Click "Close" to dismiss the modal

### Demo Mode
1. Click "Demo Login" on the login page
2. Use the app without creating an account
3. Changes won't be saved to a permanent profile

## Technical Architecture

### Frontend (app.js)
- Profile UI management
- User session handling
- Structure saving to profile
- Profile data display

### Backend (server.js)
- User registration and authentication
- Profile data persistence
- Structure storage and retrieval
- Data validation and error handling

## Security Notes

⚠️ **Important**: This implementation stores passwords in plain text for simplicity. In production:
- Use bcrypt or similar for password hashing
- Implement JWT authentication
- Use HTTPS for all communications
- Add CSRF protection
- Implement rate limiting

## Files Modified/Created

1. **server.js** - Added user management endpoints
2. **app.js** - Added profile UI and event listeners
3. **login.html** - Updated signup to register on server
4. **users.json** - New file (auto-created) for user storage

## Testing the System

1. Register a new user account
2. Create/draw a chemical structure
3. Save it to your profile
4. Logout and login again
5. Verify the structure is still there
6. Click the profile button to see your information

## Future Enhancements

- [ ] Edit structure names
- [ ] Delete saved structures
- [ ] Share structures with other users
- [ ] Export structures in various formats (MOL, SDF, SMILES)
- [ ] Structure search functionality
- [ ] User preferences/settings page
- [ ] Email verification
- [ ] Password recovery
- [ ] Social login (Google, GitHub)
