# Remaining Critical Bugs - Quick Reference Guide

**Status:** 6 of 8 bugs remaining  
**Priority:** 1 Critical, 2 High, 3 Medium  
**Estimated Effort:** 5-6 days

---

## 🔴 BUG-003: JWT Secret Validation (CRITICAL)

**File:** `backend/src/services/AuthService.ts`, `backend/src/server.ts`  
**Priority:** IMMEDIATE  
**Effort:** 1 day  
**Impact:** Backend authentication completely broken

### Problem
```typescript
// AuthService constructor throws but server doesn't validate before startup
if (!jwtSecret || jwtSecret.length < 64) {
  throw new Error('JWT_SECRET manquant');
}
```

### Fix Steps
1. Add environment validation in `server.ts` before service initialization
2. Implement key rotation mechanism
3. Remove mock authentication in `middleware/auth.ts`
4. Add monitoring for key expiration

### Code Template
```typescript
// backend/src/config/validateEnv.ts
export function validateEnvironment() {
  const required = ['JWT_SECRET', 'JWT_REFRESH_SECRET', 'DATABASE_URL'];
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required env vars: ${missing.join(', ')}`);
  }
  
  if (process.env.JWT_SECRET!.length < 64) {
    throw new Error('JWT_SECRET must be at least 64 characters');
  }
}

// backend/src/server.ts
import { validateEnvironment } from './config/validateEnv';

// Before any service initialization
validateEnvironment();
```

---

## 🟠 BUG-004: Message Bus Race Condition (HIGH)

**Files:** `src/communication/resilient-message-bus.ts`, `src/shared/messaging/SecureMessageBus.ts`  
**Priority:** HIGH  
**Effort:** 2 days  
**Impact:** 30% of messages processed incorrectly

### Problem
- Two message buses process same messages
- No coordination between ResilientMessageBus and SecureMessageBus
- Race conditions cause duplicate mutations

### Fix Steps
1. Consolidate into single `UnifiedMessageBus`
2. Implement message deduplication with nonce tracking
3. Add circuit breaker coordination
4. Migrate all consumers to unified bus

### Code Template
```typescript
// src/shared/messaging/UnifiedMessageBus.ts
export class UnifiedMessageBus {
  private static instance: UnifiedMessageBus;
  private processedNonces = new Set<string>();
  private circuitBreaker = new CircuitBreaker();
  
  async send(message: Message): Promise<void> {
    // Deduplicate
    if (this.processedNonces.has(message.nonce)) {
      return;
    }
    
    // Validate (from SecureMessageBus)
    if (!SecureMessageBus.validateMessage(message)) {
      throw new Error('Invalid message');
    }
    
    // Circuit breaker (from ResilientMessageBus)
    if (this.circuitBreaker.isOpen()) {
      await this.queueForLater(message);
      return;
    }
    
    // Process
    await this.processMessage(message);
    this.processedNonces.add(message.nonce);
  }
}
```

---

## 🟠 BUG-005: Storage Error Handling (HIGH)

**File:** `src/core/storage/SymbiontStorage.ts`  
**Priority:** HIGH  
**Effort:** 1 day  
**Impact:** 5-10% of save operations fail silently

### Problem
```typescript
// No error handling for quota exceeded
async saveOrganism(state: OrganismState): Promise<void> {
  const transaction = this.db!.transaction(['organisms'], 'readwrite');
  const store = transaction.objectStore('organisms');
  store.put(state); // Can fail silently
}
```

### Fix Steps
1. Add try-catch blocks to all IndexedDB operations
2. Implement retry logic with exponential backoff
3. Add user notifications for persistent failures
4. Implement fallback to chrome.storage.local

### Code Template
```typescript
async saveOrganism(state: OrganismState): Promise<void> {
  const maxRetries = 3;
  let attempt = 0;
  
  while (attempt < maxRetries) {
    try {
      await this.saveWithTransaction(state);
      return; // Success
    } catch (error) {
      attempt++;
      
      if (error.name === 'QuotaExceededError') {
        // Try to free space
        await this.cleanOldData();
        
        if (attempt === maxRetries) {
          // Fallback to chrome.storage
          await this.saveToChromeStorage(state);
          this.notifyUser('Storage quota exceeded, using fallback');
        }
      } else if (attempt === maxRetries) {
        // Permanent failure
        this.notifyUser('Failed to save organism state');
        throw error;
      }
      
      // Exponential backoff
      await this.delay(Math.pow(2, attempt) * 1000);
    }
  }
}
```

---

## 🟡 BUG-006: WebGL Memory Leak (MEDIUM)

**Files:** `src/ui/OrganismViewer.tsx`, `src/shared/utils/webgl.ts`  
**Priority:** MEDIUM  
**Effort:** 2 days  
**Impact:** Memory grows unbounded after 30+ minutes

### Problem
```typescript
// No cleanup in useEffect
useEffect(() => {
  const renderLoop = () => {
    render();
    requestAnimationFrame(renderLoop);
  };
  renderLoop();
  // Missing: return () => cleanup();
}, []);
```

### Fix Steps
1. Add cleanup function to useEffect
2. Implement resource disposal in WebGLUtils
3. Cancel animation frames on unmount
4. Dispose buffers, textures, shaders

### Code Template
```typescript
// src/ui/OrganismViewer.tsx
useEffect(() => {
  let animationId: number;
  let disposed = false;
  
  const renderLoop = () => {
    if (disposed) return;
    render();
    animationId = requestAnimationFrame(renderLoop);
  };
  
  renderLoop();
  
  return () => {
    disposed = true;
    cancelAnimationFrame(animationId);
    disposeWebGLResources();
  };
}, []);

// src/shared/utils/webgl.ts
export function disposeProgram(gl: WebGLRenderingContext, program: ShaderProgram) {
  gl.deleteProgram(program.program);
}

export function disposeMesh(gl: WebGLRenderingContext, mesh: WebGLMesh) {
  gl.deleteBuffer(mesh.vertexBuffer);
  gl.deleteBuffer(mesh.indexBuffer);
}
```

---

## 🟡 BUG-007: Interval Cleanup (MEDIUM)

**Files:** Multiple (see list below)  
**Priority:** MEDIUM  
**Effort:** 1 day  
**Impact:** CPU usage grows with each page navigation

### Problem
```typescript
// No cleanup
setInterval(() => this.flushEvents(), 1000);
setInterval(() => this.analyzeAttention(), 5000);
```

### Affected Files
1. `src/content/collectors/InteractionCollector.ts`
2. `src/content/monitors/AttentionMonitor.ts`
3. `src/shared/utils/HybridRandomProvider.ts`
4. `src/shared/utils/BoundedCollection.ts`
5. `src/shared/messaging/SecureMessageBus.ts`

### Fix Steps
1. Store interval IDs
2. Clear intervals on cleanup
3. Create useInterval hook for React components

### Code Template
```typescript
// src/shared/hooks/useInterval.ts
export function useInterval(callback: () => void, delay: number | null) {
  const savedCallback = useRef(callback);
  
  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);
  
  useEffect(() => {
    if (delay === null) return;
    
    const id = setInterval(() => savedCallback.current(), delay);
    return () => clearInterval(id);
  }, [delay]);
}

// Usage in components
useInterval(() => {
  flushEvents();
}, 1000);
```

---

## 🟡 BUG-008: Console.log Cleanup (LOW)

**Files:** 25+ files with console statements  
**Priority:** LOW  
**Effort:** 1 day  
**Impact:** Minor security/compliance risk

### Problem
```typescript
console.log('User data:', userData); // Exposes PII
console.error('Auth failed:', token); // Exposes tokens
```

### Fix Steps
1. Replace all console.* with logger.*
2. Add ESLint rule to ban console
3. Add pre-commit hook to enforce

### Code Template
```javascript
// .eslintrc.js
rules: {
  'no-console': ['error', {
    allow: [] // No console methods allowed
  }]
}

// Migration script
find src -name "*.ts" -o -name "*.tsx" | xargs sed -i 's/console\.log/logger.info/g'
find src -name "*.ts" -o -name "*.tsx" | xargs sed -i 's/console\.error/logger.error/g'
find src -name "*.ts" -o -name "*.tsx" | xargs sed -i 's/console\.warn/logger.warn/g'
```

---

## 📋 Implementation Checklist

### Week 1 (Critical)
- [ ] BUG-003: JWT Secret Validation
  - [ ] Add environment validation
  - [ ] Implement key rotation
  - [ ] Remove mock auth
  - [ ] Add monitoring
  - [ ] Test in staging

### Week 2 (High Priority)
- [ ] BUG-004: Message Bus Consolidation
  - [ ] Design unified architecture
  - [ ] Implement UnifiedMessageBus
  - [ ] Migrate consumers
  - [ ] Test message flow
  - [ ] Remove old buses

- [ ] BUG-005: Storage Error Handling
  - [ ] Add try-catch blocks
  - [ ] Implement retry logic
  - [ ] Add user notifications
  - [ ] Test quota scenarios
  - [ ] Monitor error rates

### Week 3 (Medium Priority)
- [ ] BUG-006: WebGL Memory Leak
  - [ ] Add cleanup functions
  - [ ] Implement disposal
  - [ ] Test memory usage
  - [ ] Monitor over time

- [ ] BUG-007: Interval Cleanup
  - [ ] Audit all intervals
  - [ ] Add cleanup
  - [ ] Create useInterval hook
  - [ ] Test in multi-tab

- [ ] BUG-008: Console.log Cleanup
  - [ ] Replace console statements
  - [ ] Add ESLint rules
  - [ ] Add pre-commit hooks
  - [ ] Verify in production

---

## 🎯 Success Metrics

### After All Fixes
- [ ] 0 security vulnerabilities
- [ ] < 5 support tickets/week
- [ ] 90%+ user retention
- [ ] 4.5+ star rating
- [ ] 0 data loss incidents
- [ ] Memory stable over 2+ hours
- [ ] CPU usage < 5% idle

---

## 📞 Quick Links

- **Full Analysis:** `CRITICAL-BUGS-REPORT.md`
- **Completed Fixes:** `FIXES-IMPLEMENTED.md`
- **Executive Summary:** `SECURITY-AUDIT-SUMMARY.md`
- **This Guide:** `REMAINING-BUGS-QUICK-REFERENCE.md`

---

**Last Updated:** October 22, 2025  
**Status:** 2 of 8 bugs fixed, 6 remaining  
**Next Priority:** BUG-003 (JWT Secret Validation)
