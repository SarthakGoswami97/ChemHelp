# 🗂️ ChemHelp Database Implementation Checklist

**Start Date:** December 24, 2025  
**Target Completion:** January 2, 2026  
**Status:** ✅ Phase 1-3 Complete | 🔄 Phase 4 In Progress

---

## 📋 PHASE 1: SQLite Setup (1-2 hours)

### 1.1 Environment Preparation
- [x] Backup current `users.json` file
- [x] Backup `package.json` (in case we need to revert)
- [x] Create `database/` folder in project root

### 1.2 Install Dependencies
- [x] Run `npm install sqlite3` in terminal
- [x] Run `npm install bcryptjs` (for password hashing)
- [x] Verify installation with `npm list sqlite3`
- [x] Verify installation with `npm list bcryptjs`

### 1.3 Create Database Schema
- [x] Create `database/schema.sql` file
- [x] Define USERS table
  - [x] id (primary key)
  - [x] fullName
  - [x] email (unique)
  - [x] password (hashed)
  - [x] photo (blob/text)
  - [x] createdAt
  - [x] updatedAt
- [x] Define STRUCTURES table
  - [x] id (primary key)
  - [x] userId (foreign key)
  - [x] name
  - [x] data (JSON)
  - [x] createdAt
- [x] Define REACTIONS table
  - [x] id (primary key)
  - [x] userId (foreign key)
  - [x] reactionName
  - [x] savedData
  - [x] savedAt

### 1.4 Create Database Helper Module
- [x] Create `database/db.js` file
- [x] Initialize SQLite database connection
- [x] Create table initialization function
- [x] Export database functions:
  - [x] `createUser()`
  - [x] `getUserByEmail()`
  - [x] `updateUserProfile()`
  - [x] `saveStructure()`
  - [x] `getUserStructures()`
  - [x] `saveReaction()`
  - [x] `getAllReactions()`

### 1.5 Test Database Functions Locally
- [x] Test creating a user
- [x] Test retrieving a user
- [x] Test updating user profile
- [x] Test saving a structure
- [x] Test retrieving structures
- [x] Verify data is saved in `.db` file

---

## 📋 PHASE 2: Update Server.js (2-3 hours)

### 2.1 Update User Registration API
- [x] Replace JSON file read in `/api/register`
- [x] Use `createUser()` database function
- [x] Add password hashing with bcryptjs
- [x] Test registration endpoint
- [x] Verify user saved to database

### 2.2 Update User Profile API
- [x] Replace JSON file read in `/api/user/:email`
- [x] Use `getUserByEmail()` database function
- [x] Test profile retrieval
- [x] Verify correct user data returned

### 2.3 Update User Update API
- [x] Replace JSON file write in `/api/user/:email/profile-update`
- [x] Use `updateUserProfile()` database function
- [x] Test profile update
- [x] Verify changes saved to database

### 2.4 Update Structure Save API
- [x] Replace JSON file write in `/api/user/:email/save-structure`
- [x] Use `saveStructure()` database function
- [x] Test structure saving
- [x] Verify data stored in STRUCTURES table

### 2.5 Update Reactions API
- [x] Update reactions endpoints
- [x] Use `saveReaction()` function
- [x] Test reaction saving
- [x] Verify reactions retrieved correctly

### 2.6 Remove JSON File Dependencies
- [x] Remove all `fs.readFileSync()` calls for users.json
- [x] Remove all `fs.writeFileSync()` calls for users.json
- [x] Search for any remaining JSON file operations
- [x] Comment out or delete them

---

## 📋 PHASE 3: Frontend Updates (1-2 hours)

### 3.1 Test Login System
- [x] Test login with demo credentials (demo@test.com / demo123)
- [x] Verify user data loads correctly
- [x] Test "Continue as Guest" functionality
- [x] Test signup with new user

### 3.2 Test Profile System
- [x] Test profile modal opens
- [x] Test profile information displays
- [x] Test profile photo upload
- [x] Test logout functionality
- [x] Verify logout clears localStorage

### 3.3 Test Structure Saving
- [x] Draw a molecule
- [x] Save it via File → Save
- [x] Check notification appears
- [x] Log out and log back in
- [x] Verify saved structure is still there

### 3.4 Test Reactions
- [x] Draw a structure
- [x] Open Reactions panel
- [x] Select a reaction
- [x] Verify reaction displays
- [x] Test saving reaction to profile

---

## 📋 PHASE 4: Data Migration (30 minutes)

### 4.1 Migrate Existing Users
- [ ] Read demo user from users.json
- [ ] Insert into database with hashed password
- [ ] Verify demo user can login
- [ ] Test with demo@test.com / demo123

### 4.2 Migrate Existing Structures
- [ ] Read any saved structures from savedData.json
- [ ] Insert into STRUCTURES table with correct userIds
- [ ] Verify structures appear in profile

### 4.3 Backup & Cleanup
- [ ] Create backup folder `backups/`
- [ ] Copy original `users.json` to `backups/users.json.backup`
- [ ] Copy original `savedData.json` to `backups/savedData.json.backup`
- [ ] Rename original JSON files (e.g., `users.json.old`)
- [ ] DO NOT DELETE YET - keep for safety

### 4.4 Final Verification
- [ ] Server starts without errors
- [ ] All login/logout works
- [ ] All profile operations work
- [ ] All structure saving works
- [ ] Database file created successfully

---

## 📋 PHASE 5: Testing & Deployment (1-2 hours)

### 5.1 Comprehensive Testing
- [ ] Test complete user flow:
  - [ ] New user registration
  - [ ] User login
  - [ ] Update profile
  - [ ] Upload photo
  - [ ] Save structures
  - [ ] View saved structures
  - [ ] Logout
- [ ] Test demo user flow
- [ ] Test dark mode toggle
- [ ] Test all API endpoints

### 5.2 Error Handling
- [ ] Test duplicate email registration (should fail)
- [ ] Test invalid login credentials
- [ ] Test structure save without user
- [ ] Test profile update with missing fields
- [ ] Verify error messages display

### 5.3 Performance Testing
- [ ] Login response time < 1 second
- [ ] Structure save response time < 1 second
- [ ] Profile retrieval response time < 1 second
- [ ] Database query performance acceptable

### 5.4 Git Commit
- [ ] Stage all changes: `git add -A`
- [ ] Commit with message: `git commit -m "Implement SQLite database for user persistence"`
- [ ] Push to GitHub: `git push`
- [ ] Verify on GitHub that files appear

---

## 📋 PHASE 6: Production Deployment (Later)

### 6.1 Prepare for Render/Other Hosting
- [ ] Create `.env` file for environment variables
- [ ] Add database file path to `.env`
- [ ] Update `.gitignore` to exclude `.db` files
- [ ] Test local copy of production setup

### 6.2 Deploy to Render (When Ready)
- [ ] Create account on Render
- [ ] Connect GitHub repository
- [ ] Set environment variables
- [ ] Deploy application
- [ ] Test live application
- [ ] Verify database persists across restarts

### 6.3 Backup Strategy
- [ ] Set up regular database backups
- [ ] Document backup process
- [ ] Create restore procedure

---

## 📋 OPTIONAL: Advanced Features (Future)

### 7.1 Enhanced User Features
- [ ] User preferences table
- [ ] Reaction history tracking
- [ ] Favorite structures
- [ ] Structure sharing with other users
- [ ] User search functionality

### 7.2 Security Enhancements
- [ ] JWT tokens for session management
- [ ] Email verification on signup
- [ ] Password reset functionality
- [ ] Rate limiting on API endpoints
- [ ] Input validation & sanitization

### 7.3 Advanced Database Features
- [ ] Database indexing for faster queries
- [ ] Query optimization
- [ ] Automated backups
- [ ] Database migration scripts

---

## 📊 Progress Summary

### Completed
```
✅ Items Completed: 0
⏳ Items In Progress: 0
❌ Items Not Started: 50+
```

### Time Tracking
| Phase | Estimated | Actual | Status |
|-------|-----------|--------|--------|
| Phase 1 | 1-2 hrs | — | ⏳ |
| Phase 2 | 2-3 hrs | — | ⏳ |
| Phase 3 | 1-2 hrs | — | ⏳ |
| Phase 4 | 30 min | — | ⏳ |
| Phase 5 | 1-2 hrs | — | ⏳ |
| **Total** | **6-10 hrs** | **—** | **⏳** |

---

## 📝 Notes & Questions

### Important Reminders
1. **Backup first!** Before deleting any JSON files
2. **Test thoroughly** before deploying
3. **Keep git commits clean** for easy rollback
4. **Read error messages** carefully - they help debug
5. **Ask for help** if stuck on any step

### Common Issues & Solutions

**Issue: "sqlite3 not found"**
- Solution: Run `npm install sqlite3` again
- Check: `npm list sqlite3`

**Issue: "Cannot read JSON files after migration"**
- Solution: This is expected! Database is the new source
- Check: Data is in `.db` file instead

**Issue: "Foreign key constraint failed"**
- Solution: Make sure userId exists in USERS table before inserting STRUCTURES

---

## ✅ Sign-Off

**When Complete, Update This:**

- [ ] All phases completed
- [ ] All tests passed
- [ ] Code pushed to GitHub
- [ ] Deployment successful
- [ ] Documentation updated

**Completion Date:** _______________

**Developer Name:** Sarthak Goswami

**Notes:** _______________________________________________

---

**Good luck! 🚀 You've got this! Mark items as you complete them!**
