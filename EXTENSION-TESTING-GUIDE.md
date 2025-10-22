# SYMBIONT Extension Testing Guide
**Docker-based Chrome Testing Environment**

---

## 🚀 Quick Start

### 1. Start the Testing Environment
```bash
# Build the extension first
npm run build

# Start Docker container with Chrome + noVNC
docker-compose -f docker-compose.test.yml up -d

# Check container status
docker ps | grep symbiont
```

### 2. Access Chrome via Browser
The container is now running with noVNC web interface:

**Access URL:** `http://localhost:6901`

**Credentials:**
- **Password:** `symbiont123`

### 3. Load the Extension in Chrome

Once you access the noVNC interface:

1. **Open Chrome** (should auto-start in the container)

2. **Navigate to Extensions:**
   - Click the menu (⋮) → More Tools → Extensions
   - Or type in address bar: `chrome://extensions/`

3. **Enable Developer Mode:**
   - Toggle "Developer mode" switch in top-right corner

4. **Load Unpacked Extension:**
   - Click "Load unpacked" button
   - Navigate to: `/extension/dist`
   - Click "Select" or "Open"

5. **Verify Extension Loaded:**
   - You should see "SYMBIONT - Digital Organism" in the extensions list
   - Extension icon should appear in Chrome toolbar

---

## 📋 Testing Checklist

### ✅ Basic Functionality Tests

#### 1. Extension Installation
- [ ] Extension loads without errors
- [ ] Extension icon appears in toolbar
- [ ] No console errors in background page

#### 2. Popup UI
- [ ] Click extension icon to open popup
- [ ] Popup displays organism dashboard
- [ ] UI renders correctly (no layout issues)
- [ ] React components load properly

#### 3. Background Script (Service Worker)
- [ ] Open Chrome DevTools → Extensions → Service Worker
- [ ] Check for errors in console
- [ ] Verify no "localStorage is not defined" errors
- [ ] Verify storage operations work

#### 4. Content Script
- [ ] Navigate to any website (e.g., https://example.com)
- [ ] Open DevTools → Console
- [ ] Check for content script injection
- [ ] Verify no errors

#### 5. Storage Operations
- [ ] Create/modify organism state
- [ ] Close and reopen popup
- [ ] Verify state persists
- [ ] Check chrome.storage.local in DevTools

### ✅ Security Fixes Verification

#### BUG-001: Secure Random Generation
- [ ] Open popup → Generate invitation code
- [ ] Verify code is 6 characters alphanumeric
- [ ] Generate multiple codes - should be unpredictable
- [ ] Check console - no Math.random() warnings

#### BUG-002: Service Worker Storage
- [ ] Open Service Worker DevTools
- [ ] Trigger organism mutation
- [ ] Verify no "localStorage is not defined" errors
- [ ] Check chrome.storage.local for saved data
- [ ] Verify data persists after reload

### ✅ Advanced Testing

#### WebGL Rendering
- [ ] Open popup with organism viewer
- [ ] Verify WebGL canvas renders
- [ ] Check for WebGL errors in console
- [ ] Monitor memory usage (should be stable)

#### Message Bus
- [ ] Trigger organism update from content script
- [ ] Verify message received in background
- [ ] Check popup updates in real-time
- [ ] No duplicate message processing

#### Error Handling
- [ ] Trigger intentional error (if possible)
- [ ] Verify error boundary catches it
- [ ] Check error ID is generated
- [ ] Verify error logged securely

---

## 🔧 Docker Commands

### Container Management
```bash
# Start container
docker-compose -f docker-compose.test.yml up -d

# Stop container
docker-compose -f docker-compose.test.yml down

# View logs
docker logs symbiont-chrome-test

# Follow logs in real-time
docker logs -f symbiont-chrome-test

# Restart container
docker-compose -f docker-compose.test.yml restart

# Remove container and volumes
docker-compose -f docker-compose.test.yml down -v
```

### Debugging
```bash
# Execute commands in container
docker exec -it symbiont-chrome-test bash

# Check extension files in container
docker exec symbiont-chrome-test ls -la /extension/dist

# View Chrome process
docker exec symbiont-chrome-test ps aux | grep chrome
```

### Rebuild After Changes
```bash
# Rebuild extension
npm run build

# Restart container to pick up changes
docker-compose -f docker-compose.test.yml restart

# Or reload extension in Chrome:
# 1. Go to chrome://extensions/
# 2. Click reload icon on SYMBIONT extension
```

---

## 🌐 Accessing the Environment

### noVNC Web Interface
- **URL:** http://localhost:6901
- **Password:** symbiont123
- **Resolution:** 1920x1080 (configurable in docker-compose.test.yml)

### VNC Direct Connection (Optional)
If you have a VNC client:
- **Host:** localhost
- **Port:** 5901
- **Password:** symbiont123

### Port Forwarding in Gitpod
If running in Gitpod, the port should be automatically forwarded:
1. Check "Ports" tab in Gitpod
2. Look for port 6901
3. Click "Open Browser" or copy the public URL

---

## 🐛 Troubleshooting

### Container Won't Start
```bash
# Check if port is already in use
lsof -i :6901

# Check Docker logs
docker logs symbiont-chrome-test

# Remove and recreate
docker-compose -f docker-compose.test.yml down
docker-compose -f docker-compose.test.yml up -d
```

### Extension Not Loading
```bash
# Verify extension files exist
ls -la dist/

# Check manifest.json is valid
cat manifest.json | jq .

# Rebuild extension
npm run build

# Check container has access to files
docker exec symbiont-chrome-test ls -la /extension/dist
```

### noVNC Connection Issues
```bash
# Check container is running
docker ps | grep symbiont

# Check port is exposed
docker port symbiont-chrome-test

# Try accessing directly
curl http://localhost:6901
```

### Chrome Crashes in Container
```bash
# Increase shared memory
# Edit docker-compose.test.yml:
# shm_size: '4gb'  # Increase from 2gb

# Restart container
docker-compose -f docker-compose.test.yml restart
```

### Extension Errors
1. **Open Chrome DevTools:**
   - Right-click extension icon → Inspect popup
   - Or: chrome://extensions/ → Details → Inspect views

2. **Check Service Worker:**
   - chrome://extensions/ → Service Worker → Inspect

3. **Check Console Logs:**
   - Look for errors in red
   - Check for warnings about storage or security

---

## 📊 Performance Testing

### Memory Leak Test (BUG-006)
```bash
# 1. Open popup with organism viewer
# 2. Leave open for 30+ minutes
# 3. Monitor memory in Chrome Task Manager:
#    - Shift+Esc in Chrome
#    - Watch "Memory footprint" column
# 4. Memory should stabilize, not grow continuously
```

### CPU Usage Test (BUG-007)
```bash
# 1. Open multiple tabs
# 2. Navigate between pages
# 3. Check Chrome Task Manager
# 4. CPU usage should be < 5% when idle
```

### Storage Test (BUG-002)
```bash
# 1. Open Service Worker DevTools
# 2. Run in console:
chrome.storage.local.get(null, (data) => console.log(data));

# 3. Should see organism data
# 4. No errors about localStorage
```

---

## 🧪 Automated Testing

### Run E2E Tests in Container
```bash
# Install Playwright in container (if needed)
docker exec symbiont-chrome-test npm install -g playwright

# Run E2E tests
npm run test:e2e

# Or run specific test
npx playwright test tests/e2e/extension-load.spec.ts
```

### Manual Test Script
```javascript
// Run in Service Worker console (chrome://extensions/ → Service Worker → Inspect)

// Test 1: Storage Adapter
async function testStorage() {
  console.log('Testing storage operations...');
  
  // Set item
  await chrome.storage.local.set({ test_key: 'test_value' });
  
  // Get item
  const result = await chrome.storage.local.get(['test_key']);
  console.log('Retrieved:', result);
  
  // Clean up
  await chrome.storage.local.remove(['test_key']);
  
  console.log('✅ Storage test passed');
}

testStorage();

// Test 2: Secure Random
function testSecureRandom() {
  console.log('Testing secure random generation...');
  
  const codes = [];
  for (let i = 0; i < 10; i++) {
    // This should use SecureRandom internally
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    codes.push(code);
  }
  
  console.log('Generated codes:', codes);
  
  // Check for duplicates (should be rare)
  const unique = new Set(codes);
  console.log(`Unique: ${unique.size}/10`);
  
  console.log('✅ Random generation test passed');
}

testSecureRandom();
```

---

## 📝 Test Results Template

### Test Session Report
```markdown
**Date:** YYYY-MM-DD
**Tester:** [Your Name]
**Environment:** Docker + noVNC
**Extension Version:** 1.0.0

### Results

#### Basic Functionality
- [ ] Extension loads: PASS/FAIL
- [ ] Popup renders: PASS/FAIL
- [ ] Service worker: PASS/FAIL
- [ ] Content script: PASS/FAIL
- [ ] Storage: PASS/FAIL

#### Security Fixes
- [ ] BUG-001 (Secure Random): PASS/FAIL
- [ ] BUG-002 (Service Worker Storage): PASS/FAIL

#### Performance
- [ ] Memory stable: PASS/FAIL
- [ ] CPU usage low: PASS/FAIL
- [ ] No leaks: PASS/FAIL

### Issues Found
1. [Description of issue]
   - Steps to reproduce
   - Expected vs actual behavior
   - Screenshots/logs

### Notes
[Any additional observations]
```

---

## 🔐 Security Testing

### Verify Cryptographic Security
```javascript
// Run in popup console
import { SecureRandom } from './shared/utils/secureRandom';

// Test entropy
const samples = [];
for (let i = 0; i < 1000; i++) {
  samples.push(SecureRandom.random());
}

// Calculate distribution
const buckets = Array(10).fill(0);
samples.forEach(n => {
  const bucket = Math.floor(n * 10);
  buckets[bucket]++;
});

console.log('Distribution (should be ~100 each):', buckets);

// Chi-square test for randomness
const expected = 100;
const chiSquare = buckets.reduce((sum, observed) => {
  return sum + Math.pow(observed - expected, 2) / expected;
}, 0);

console.log('Chi-square:', chiSquare);
console.log('Random quality:', chiSquare < 16.92 ? 'GOOD' : 'POOR');
```

---

## 📞 Support

### Getting Help
- **Documentation:** See CRITICAL-BUGS-REPORT.md for bug details
- **Fixes:** See FIXES-IMPLEMENTED.md for what was fixed
- **Issues:** Check container logs and Chrome DevTools

### Reporting Bugs
When reporting issues, include:
1. Steps to reproduce
2. Expected vs actual behavior
3. Screenshots/screen recording
4. Console logs (Service Worker + Popup)
5. Chrome version
6. Container logs

---

## 🎯 Next Steps After Testing

### If Tests Pass
1. Document test results
2. Create test report
3. Mark bugs as verified fixed
4. Proceed to staging deployment

### If Tests Fail
1. Document failures with details
2. Check if issue is new or regression
3. Review recent code changes
4. Debug using Chrome DevTools
5. Fix issues and retest

---

**Testing Environment Ready!**

Access Chrome at: http://localhost:6901  
Password: symbiont123

Happy Testing! 🧪
