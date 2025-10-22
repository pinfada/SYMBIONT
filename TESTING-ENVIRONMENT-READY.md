# 🎉 SYMBIONT Testing Environment - Ready!

**Status:** ✅ Docker container running with Chrome + noVNC  
**Date:** October 22, 2025

---

## 🚀 Quick Access

### Access Chrome Browser
**URL:** http://localhost:6901  
**Password:** `symbiont123`

### Quick Start Command
```bash
./test-extension.sh
```

This script will:
- ✅ Build the extension
- ✅ Start/restart Docker container
- ✅ Display access URL and instructions

---

## 📋 What's Been Set Up

### 1. Docker Environment ✅
- **Container:** `symbiont-chrome-test`
- **Image:** `kasmweb/chromium:1.15.0`
- **Status:** Running
- **Ports:**
  - 6901: noVNC web interface
  - 5901: VNC direct connection

### 2. Extension Files ✅
- **Location in container:** `/extension/dist`
- **Mounted from:** `./dist` (read-only)
- **Build status:** ✅ Compiled successfully
- **Manifest:** ✅ Valid

### 3. Testing Tools ✅
- **Chrome/Chromium:** Latest version
- **Developer Tools:** Available
- **Extension DevTools:** Available
- **noVNC Interface:** Web-based access

---

## 🧪 Testing Instructions

### Step 1: Access Chrome
1. Open your browser
2. Navigate to: http://localhost:6901
3. Enter password: `symbiont123`
4. You should see a Linux desktop with Chrome

### Step 2: Load Extension
1. In Chrome, navigate to: `chrome://extensions/`
2. Enable **Developer mode** (toggle in top-right)
3. Click **Load unpacked**
4. Navigate to: `/extension/dist`
5. Click **Select** or **Open**

### Step 3: Verify Extension
- ✅ Extension appears in list
- ✅ No errors shown
- ✅ Extension icon in toolbar
- ✅ Can click icon to open popup

### Step 4: Test Fixes
Follow the checklist in `EXTENSION-TESTING-GUIDE.md`

---

## 🔍 What to Test

### Priority 1: Security Fixes (BUG-001, BUG-002)

#### Test BUG-001: Secure Random Generation
```
1. Open extension popup
2. Generate invitation code
3. Verify code is 6 characters
4. Generate multiple codes
5. Codes should be unpredictable
6. No console warnings about Math.random()
```

**Expected Result:** ✅ Cryptographically secure codes

#### Test BUG-002: Service Worker Storage
```
1. Open chrome://extensions/
2. Click "Service Worker" under SYMBIONT
3. Open DevTools console
4. Trigger organism mutation
5. Check for errors
```

**Expected Result:** ✅ No "localStorage is not defined" errors

### Priority 2: Basic Functionality

#### Popup UI
- [ ] Opens without errors
- [ ] Displays organism dashboard
- [ ] UI renders correctly
- [ ] React components work

#### Background Script
- [ ] Service worker starts
- [ ] No console errors
- [ ] Storage operations work
- [ ] Message handling works

#### Content Script
- [ ] Injects on web pages
- [ ] No console errors
- [ ] Collects behavior data
- [ ] Communicates with background

---

## 🐛 Known Issues & Workarounds

### Issue: Container Warnings
**Symptoms:** CPU frequency warnings in logs  
**Impact:** None - cosmetic only  
**Action:** Ignore these warnings

### Issue: Missing System Services
**Symptoms:** Warnings about nm-applet, colord  
**Impact:** None - not needed for testing  
**Action:** Ignore these warnings

### Issue: Extension Not Loading
**Solution:**
```bash
# Rebuild extension
npm run build

# Restart container
docker-compose -f docker-compose.test.yml restart

# Reload extension in Chrome
# chrome://extensions/ → Click reload icon
```

---

## 📊 Test Results Template

Use this template to document your testing:

```markdown
## Test Session: [Date]

### Environment
- Container: Running ✅
- Chrome Version: [Check in chrome://version/]
- Extension Version: 1.0.0

### BUG-001: Secure Random Generation
- [ ] Invitation codes generated: PASS/FAIL
- [ ] Codes are unpredictable: PASS/FAIL
- [ ] No Math.random() warnings: PASS/FAIL
- **Notes:** [Any observations]

### BUG-002: Service Worker Storage
- [ ] Service worker starts: PASS/FAIL
- [ ] No localStorage errors: PASS/FAIL
- [ ] Data persists: PASS/FAIL
- [ ] chrome.storage.local works: PASS/FAIL
- **Notes:** [Any observations]

### Basic Functionality
- [ ] Popup opens: PASS/FAIL
- [ ] UI renders: PASS/FAIL
- [ ] Background script: PASS/FAIL
- [ ] Content script: PASS/FAIL
- **Notes:** [Any observations]

### Issues Found
1. [Description]
   - Steps to reproduce
   - Expected vs actual
   - Screenshots/logs

### Overall Result
- [ ] Ready for staging
- [ ] Needs fixes
- [ ] Blocked by: [Issue]
```

---

## 🔧 Useful Commands

### Container Management
```bash
# View real-time logs
docker logs -f symbiont-chrome-test

# Stop container
docker-compose -f docker-compose.test.yml down

# Restart container
docker-compose -f docker-compose.test.yml restart

# Check container status
docker ps | grep symbiont

# Execute command in container
docker exec -it symbiont-chrome-test bash
```

### Extension Development
```bash
# Rebuild extension
npm run build

# Rebuild and restart container
npm run build && docker-compose -f docker-compose.test.yml restart

# Quick test script
./test-extension.sh
```

### Debugging
```bash
# Check extension files in container
docker exec symbiont-chrome-test ls -la /extension/dist

# View Chrome processes
docker exec symbiont-chrome-test ps aux | grep chrome

# Check storage in Chrome
# In Service Worker console:
chrome.storage.local.get(null, console.log)
```

---

## 📚 Documentation

### Full Guides
- **EXTENSION-TESTING-GUIDE.md** - Complete testing guide
- **CRITICAL-BUGS-REPORT.md** - All bugs identified
- **FIXES-IMPLEMENTED.md** - What was fixed
- **SECURITY-AUDIT-SUMMARY.md** - Executive summary

### Quick References
- **REMAINING-BUGS-QUICK-REFERENCE.md** - Bugs still to fix
- **test-extension.sh** - Automated setup script

---

## 🎯 Success Criteria

### Must Pass
- ✅ Extension loads without errors
- ✅ No "localStorage is not defined" errors
- ✅ Invitation codes are cryptographically secure
- ✅ Data persists across reloads
- ✅ Service worker operates correctly

### Should Pass
- ✅ Popup UI renders correctly
- ✅ Content script injects properly
- ✅ Message bus works
- ✅ No memory leaks (after 30 min)

### Nice to Have
- ✅ WebGL rendering works
- ✅ All features functional
- ✅ Performance is good

---

## 🚨 If Something Goes Wrong

### Extension Won't Load
1. Check manifest.json is valid: `cat manifest.json | jq .`
2. Rebuild: `npm run build`
3. Check dist/ folder exists: `ls -la dist/`
4. Restart container: `docker-compose -f docker-compose.test.yml restart`

### Container Won't Start
1. Check Docker is running: `docker info`
2. Check port 6901 is free: `lsof -i :6901`
3. View logs: `docker logs symbiont-chrome-test`
4. Remove and recreate: `docker-compose -f docker-compose.test.yml down && docker-compose -f docker-compose.test.yml up -d`

### Can't Access noVNC
1. Verify container is running: `docker ps | grep symbiont`
2. Check port mapping: `docker port symbiont-chrome-test`
3. Try direct curl: `curl http://localhost:6901`
4. Check firewall settings

### Extension Errors
1. Open Chrome DevTools (F12)
2. Check Console tab for errors
3. Go to chrome://extensions/
4. Click "Errors" button if present
5. Check Service Worker console

---

## 📞 Next Steps

### After Testing
1. **Document Results** - Use template above
2. **Report Issues** - Create detailed bug reports
3. **Verify Fixes** - Confirm BUG-001 and BUG-002 are resolved
4. **Performance Test** - Run for 30+ minutes
5. **Create Test Report** - Summarize findings

### If Tests Pass
1. ✅ Mark bugs as verified
2. ✅ Update FIXES-IMPLEMENTED.md
3. ✅ Prepare for staging deployment
4. ✅ Move to next priority bugs

### If Tests Fail
1. ❌ Document failures in detail
2. ❌ Debug using Chrome DevTools
3. ❌ Review code changes
4. ❌ Fix issues and retest

---

## 🎉 You're All Set!

The testing environment is ready. Access Chrome at:

**http://localhost:6901**

Password: `symbiont123`

Follow the instructions above to load and test the extension.

**Happy Testing! 🧪**

---

**Environment Status:** ✅ READY  
**Container Status:** ✅ RUNNING  
**Extension Status:** ✅ BUILT  
**Documentation:** ✅ COMPLETE

**Last Updated:** October 22, 2025
