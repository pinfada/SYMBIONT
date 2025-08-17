# 🚀 Plan de Déploiement Production SYMBIONT v2.0

## 📋 Vue d'ensemble stratégique

**Basé sur** : Audit complet Janvier 2025  
**État actuel** : Note globale 5.2/10  
**Objectif** : Note minimale 9.5/10 sur tous critères  
**Timeline** : 6 semaines de développement intensif  
**Approche** : Résolution bloqueurs → Optimisation → Validation  

---

## 🚨 PHASE 0 - RÉSOLUTION BLOQUEURS CRITIQUES (Jours 1-3)

### 🔐 Priorité 1 : Sécurisation immédiate

#### Action 1.1 : Élimination secrets hardcodés
**Impact** : CRITIQUE - Vulnérabilité totale  
**Délai** : 1 jour  

```typescript
// AVANT (VULNÉRABLE)
this.jwtSecret = process.env.JWT_SECRET || 'symbiont-dev-secret-key-change-in-production';

// APRÈS (SÉCURISÉ)
this.jwtSecret = (() => {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 64) {
    throw new Error('JWT_SECRET manquant ou trop court (minimum 64 caractères)');
  }
  return secret;
})();
```

**Fichiers à corriger** :
- [ ] `backend/src/services/AuthService.ts:38`
- [ ] `src/popup/services/RealDataService.ts:17`  
- [ ] `admin-rituals.js:12`

**Variables d'environnement requises** :
```bash
# Production OBLIGATOIRE
JWT_SECRET=<64 caractères cryptographiquement sécurisés>
SYMBIONT_API_KEY=<clé API production rotative>
ADMIN_API_KEY=<clé admin forte avec rotation 24h>
ENCRYPTION_KEY=<clé AES-256 pour chiffrement local>
```

#### Action 1.2 : Réparation tests de sécurité
**Impact** : CRITIQUE - Aucune validation crypto  
**Délai** : 2 jours  

```typescript
// SecurityManager.ts - Implémentation RÉELLE WebCrypto
class SecurityManager {
  private cryptoKey: CryptoKey | null = null;
  
  async initialize(): Promise<void> {
    this.cryptoKey = await crypto.subtle.generateKey(
      { name: 'AES-GCM', length: 256 },
      false, // Non exportable
      ['encrypt', 'decrypt']
    );
  }
  
  async encrypt(data: any): Promise<EncryptedData> {
    if (!this.cryptoKey) await this.initialize();
    
    const encoder = new TextEncoder();
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encodedData = encoder.encode(JSON.stringify(data));
    
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      this.cryptoKey!,
      encodedData
    );
    
    return {
      data: Array.from(new Uint8Array(encrypted)),
      iv: Array.from(iv),
      algorithm: 'AES-GCM'
    };
  }
}
```

**Validation** : SecurityManager.test.ts DOIT passer à 100%

### ✅ Critères Phase 0
- [ ] 0 secret hardcodé dans le code
- [ ] SecurityManager.test.ts passe
- [ ] Variables d'environnement validées
- [ ] Audit npm clean

---

## 🔧 PHASE 1 - CORRECTION ARCHITECTURE (Semaines 1-2)

### 🏗️ Priorité 2 : Refactoring OrganismCore

#### Action 2.1 : Migration vers version refactorisée
**Impact** : MAJEUR - Maintenabilité et performance  
**Délai** : 3 jours  

```typescript
// Nouvelle architecture par services
class OrganismCore {
  constructor(
    private readonly traitService: TraitService,
    private readonly energyService: EnergyService,
    private readonly neuralService: NeuralService,
    private readonly mutationService: MutationService,
    private readonly storageService: StorageService
  ) {}
  
  // Méthodes orchestration uniquement - SOUS 100 LIGNES
  async evolve(stimulus: Stimulus): Promise<EvolutionResult> {
    const traits = await this.traitService.getCurrentTraits();
    const energy = this.energyService.getAvailableEnergy();
    
    const mutation = this.mutationService.generateMutation(stimulus, traits, energy);
    const result = await this.neuralService.processMutation(mutation);
    
    await this.storageService.persistState(result);
    return result;
  }
}

// Services spécialisés
class TraitService {
  updateTrait(name: string, value: number): void;
  getTraitHistory(name: string): TraitHistory[];
  normalizeTraits(): void;
}

class EnergyService {
  consumeEnergy(amount: number): boolean;
  regenerateEnergy(): void;
  getOptimalEnergyDistribution(): EnergyDistribution;
}
```

#### Action 2.2 : Injection de dépendances propre
**Impact** : MAJEUR - Testabilité et flexibilité  
**Délai** : 2 jours  

```typescript
// Container IoC
class DIContainer {
  private services = new Map<string, any>();
  
  register<T>(name: string, factory: () => T): void {
    this.services.set(name, factory);
  }
  
  resolve<T>(name: string): T {
    const factory = this.services.get(name);
    if (!factory) throw new Error(`Service ${name} non trouvé`);
    return factory();
  }
}

// Configuration DI
container.register('TraitService', () => new TraitService());
container.register('EnergyService', () => new EnergyService());
container.register('OrganismCore', () => new OrganismCore(
  container.resolve('TraitService'),
  container.resolve('EnergyService'),
  container.resolve('NeuralService'),
  container.resolve('MutationService'),
  container.resolve('StorageService')
));
```

### 📊 Priorité 3 : Métriques réelles vs simulées

#### Action 3.1 : Remplacement Math.random() par vraies métriques
**Impact** : CRITIQUE - Visibilité performance réelle  
**Délai** : 4 jours  

```typescript
// AVANT (FAUX)
cpu: 0.2 * Math.random(),
memory: 20 * Math.random(),

// APRÈS (RÉEL)
class RealPerformanceCollector {
  async collectMetrics(): Promise<RealMetrics> {
    const memory = (performance as any).memory ? {
      used: (performance as any).memory.usedJSHeapSize,
      total: (performance as any).memory.totalJSHeapSize,
      limit: (performance as any).memory.jsHeapSizeLimit
    } : this.estimateMemoryUsage();
    
    const timing = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    
    return {
      memory: {
        usage: memory.used,
        percentage: (memory.used / memory.limit) * 100
      },
      timing: {
        loadTime: timing.loadEventEnd - timing.navigationStart,
        domReady: timing.domContentLoadedEventEnd - timing.navigationStart,
        firstPaint: this.getFirstPaintTime()
      },
      webgl: await this.collectWebGLMetrics(),
      timestamp: Date.now()
    };
  }
}
```

#### Action 3.2 : Feature flags production
**Impact** : MAJEUR - Séparation dev/prod claire  
**Délai** : 1 jour  

```typescript
// FeatureFlags.ts
export const FEATURE_FLAGS = {
  USE_MOCK_DATA: process.env.NODE_ENV !== 'production',
  ENABLE_DEBUG_LOGGING: process.env.NODE_ENV === 'development',
  COLLECT_REAL_METRICS: process.env.NODE_ENV === 'production',
  ENABLE_ADVANCED_TRACING: process.env.ENABLE_TRACING === 'true'
};

// Usage dans le code
const metrics = FEATURE_FLAGS.USE_MOCK_DATA 
  ? this.generateMockMetrics() 
  : await this.collectRealMetrics();
```

### ✅ Critères Phase 1
- [ ] OrganismCore < 150 lignes
- [ ] Services découplés avec interfaces
- [ ] 0 Math.random() en métriques production
- [ ] Feature flags fonctionnels
- [ ] Tests de régression passent

---

## 🧪 PHASE 2 - QUALITÉ ET TESTS (Semaines 2-3)

### 🎯 Priorité 4 : Couverture de tests

#### Action 4.1 : Réparation suite de tests
**Impact** : CRITIQUE - Confiance déploiement  
**Délai** : 5 jours  

```javascript
// jest.config.js - Configuration optimisée
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  testTimeout: 15000, // 15s au lieu de 5s
  
  setupFilesAfterEnv: [
    '<rootDir>/jest.setup.js',
    '<rootDir>/__tests__/setup.ts'
  ],
  
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    'backend/src/**/*.{ts}',
    '!src/**/*.d.ts',
    '!src/**/*.test.{ts,tsx}',
    '!**/__mocks__/**'
  ],
  
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 85,
      lines: 85,
      statements: 85
    },
    // Seuils stricts pour modules critiques
    'src/core/': {
      branches: 90,
      functions: 95,
      lines: 95,
      statements: 95
    }
  },
  
  // Parallélisation optimisée
  maxWorkers: '50%',
  cache: true,
  cacheDirectory: '<rootDir>/.jest-cache'
};
```

#### Action 4.2 : Tests unitaires robustes
**Impact** : MAJEUR - Prévention régression  
**Délai** : 3 jours  

```typescript
// SecurityManager.test.ts - Tests complets
describe('SecurityManager', () => {
  let securityManager: SecurityManager;
  
  beforeEach(() => {
    securityManager = new SecurityManager();
    // Mock WebCrypto API complet
    Object.defineProperty(global, 'crypto', {
      value: {
        subtle: {
          generateKey: jest.fn().mockResolvedValue(mockCryptoKey),
          encrypt: jest.fn().mockResolvedValue(mockEncryptedData),
          decrypt: jest.fn().mockResolvedValue(mockDecryptedData)
        },
        getRandomValues: jest.fn().mockImplementation((arr) => {
          for (let i = 0; i < arr.length; i++) {
            arr[i] = Math.floor(Math.random() * 256);
          }
          return arr;
        })
      }
    });
  });
  
  it('should encrypt data securely', async () => {
    const testData = { sensitive: 'information' };
    const encrypted = await securityManager.encrypt(testData);
    
    expect(encrypted).toHaveProperty('data');
    expect(encrypted).toHaveProperty('iv');
    expect(encrypted.algorithm).toBe('AES-GCM');
    expect(crypto.subtle.encrypt).toHaveBeenCalled();
  });
  
  it('should handle encryption failures gracefully', async () => {
    (crypto.subtle.encrypt as jest.Mock).mockRejectedValue(new Error('Crypto failure'));
    
    await expect(securityManager.encrypt({})).rejects.toThrow('Crypto failure');
  });
});
```

### 🎮 Priorité 5 : Tests E2E production

#### Action 5.1 : Playwright production-ready
**Impact** : MAJEUR - Validation end-to-end  
**Délai** : 3 jours  

```typescript
// playwright.config.ts - Configuration robuste
export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30000,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'chrome-extension',
      use: { 
        ...devices['Desktop Chrome'],
        launchOptions: {
          args: [
            '--disable-web-security',
            '--load-extension=./dist',
            '--disable-extensions-except=./dist'
          ]
        }
      },
    }
  ],
  
  use: {
    baseURL: 'chrome-extension://test-extension-id',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  }
});

// tests/e2e/extension.spec.ts
test.describe('SYMBIONT Extension', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('chrome-extension://test/popup/index.html');
    await page.waitForLoadState('networkidle');
  });
  
  test('should load organism dashboard', async ({ page }) => {
    await expect(page.locator('[data-testid="organism-dashboard"]')).toBeVisible();
    await expect(page.locator('[data-testid="traits-display"]')).toBeVisible();
  });
  
  test('should handle organism evolution', async ({ page }) => {
    await page.click('[data-testid="evolve-button"]');
    await expect(page.locator('[data-testid="evolution-result"]')).toBeVisible();
    
    // Vérification métriques réelles
    const metrics = await page.evaluate(() => {
      return window.SYMBIONT?.getMetrics();
    });
    
    expect(metrics).toBeDefined();
    expect(metrics.memory).toBeGreaterThan(0);
    expect(metrics.timestamp).toBeGreaterThan(Date.now() - 10000);
  });
});
```

### ✅ Critères Phase 2
- [ ] Coverage ≥ 85% global, ≥ 95% core
- [ ] Tous tests unitaires passent
- [ ] Tests E2E robustes
- [ ] Mocks WebAPI complets
- [ ] Performance tests < 30s

---

## ⚡ PHASE 3 - OPTIMISATION PERFORMANCE (Semaines 3-4)

### 🚀 Priorité 6 : Performance monitoring

#### Action 6.1 : Observabilité temps réel
**Impact** : CRITIQUE - Visibilité production  
**Délai** : 4 jours  

```typescript
// RealTimeMonitor.ts - Monitoring production
class ProductionMonitor {
  private metrics: Map<string, MetricHistory> = new Map();
  private observers: PerformanceObserver[] = [];
  
  initialize(): void {
    this.setupPerformanceObservers();
    this.setupWebVitalsTracking();
    this.setupMemoryMonitoring();
    this.startMetricCollection();
  }
  
  private setupPerformanceObservers(): void {
    // Navigation timing
    const navObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        this.recordNavigationMetric(entry as PerformanceNavigationTiming);
      }
    });
    navObserver.observe({ entryTypes: ['navigation'] });
    
    // Resource timing
    const resourceObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        this.recordResourceMetric(entry as PerformanceResourceTiming);
      }
    });
    resourceObserver.observe({ entryTypes: ['resource'] });
    
    // User timing
    const measureObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        this.recordCustomMetric(entry);
      }
    });
    measureObserver.observe({ entryTypes: ['measure'] });
  }
  
  async collectWebVitals(): Promise<WebVitalsSnapshot> {
    return {
      lcp: await this.measureLCP(),
      fid: await this.measureFID(),
      cls: await this.measureCLS(),
      fcp: await this.measureFCP(),
      ttfb: await this.measureTTFB(),
      timestamp: performance.now()
    };
  }
  
  startAlertingSystem(): void {
    setInterval(async () => {
      const currentMetrics = await this.getCurrentMetrics();
      
      // Alertes intelligentes
      if (currentMetrics.memory.usage > 50 * 1024 * 1024) { // 50MB
        this.triggerAlert('memory_high', currentMetrics);
      }
      
      if (currentMetrics.webgl.fps < 45) { // Sous 45 FPS
        this.triggerAlert('performance_degradation', currentMetrics);
      }
      
      if (currentMetrics.errors.rate > 0.01) { // Plus de 1% d'erreurs
        this.triggerAlert('error_spike', currentMetrics);
      }
    }, 60000); // Check chaque minute
  }
}
```

### 🎯 Priorité 7 : Budget performance

#### Action 7.1 : Limites strictes et enforcement
**Impact** : MAJEUR - Performance garantie  
**Délai** : 2 jours  

```typescript
// PerformanceBudget.ts - Limites strictes
const PERFORMANCE_BUDGET = {
  memory: {
    max_usage: 50 * 1024 * 1024, // 50MB
    warning_threshold: 40 * 1024 * 1024, // 40MB
    check_interval: 30000 // 30s
  },
  webgl: {
    min_fps: 55, // 55 FPS minimum
    max_frame_time: 18, // 18ms max par frame
    max_draw_calls: 100 // 100 draw calls max
  },
  network: {
    max_requests_per_minute: 10,
    max_payload_size: 1024 * 1024, // 1MB
    timeout: 5000 // 5s
  },
  storage: {
    max_local_storage: 5 * 1024 * 1024, // 5MB
    max_indexeddb: 50 * 1024 * 1024, // 50MB
    cleanup_threshold: 0.8 // 80% occupation
  }
};

class BudgetEnforcer {
  private violations: BudgetViolation[] = [];
  
  async enforceMemoryBudget(): Promise<void> {
    const usage = await this.getCurrentMemoryUsage();
    
    if (usage > PERFORMANCE_BUDGET.memory.max_usage) {
      // Action corrective immédiate
      await this.emergencyCleanup();
      this.recordViolation('memory_exceeded', usage);
    } else if (usage > PERFORMANCE_BUDGET.memory.warning_threshold) {
      // Nettoyage préventif
      await this.preventiveCleanup();
    }
  }
  
  async emergencyCleanup(): Promise<void> {
    // Libération mémoire agressive
    this.organismCache.clear();
    this.textureCache.evictLRU(0.5); // Éviction 50% des textures
    this.neuralNetwork.pruneConnections(0.3); // Élagage 30%
    
    if (typeof global.gc === 'function') {
      global.gc(); // Force garbage collection si disponible
    }
  }
}
```

### ✅ Critères Phase 3
- [ ] Monitoring temps réel actif
- [ ] Budget performance défini et enforced
- [ ] Alertes configurées et testées
- [ ] WebGL optimisé 60+ FPS
- [ ] Mémoire < 50MB garanti

---

## 📊 PHASE 4 - OBSERVABILITÉ AVANCÉE (Semaines 4-5)

### 🔍 Priorité 8 : Logging et tracing

#### Action 8.1 : Logs structurés production
**Impact** : CRITIQUE - Debugging production  
**Délai** : 3 jours  

```typescript
// ProductionLogger.ts - Logs structurés
interface StructuredLog {
  timestamp: number;
  level: 'debug' | 'info' | 'warn' | 'error' | 'critical';
  component: string;
  message: string;
  context: Record<string, any>;
  sessionId: string;
  userId?: string; // Hash anonyme
  traceId?: string;
  spanId?: string;
}

class ProductionLogger {
  private buffer: StructuredLog[] = [];
  private sessionId: string = crypto.randomUUID();
  
  log(level: LogLevel, component: string, message: string, context: any = {}): void {
    const entry: StructuredLog = {
      timestamp: Date.now(),
      level,
      component,
      message,
      context: this.sanitizeContext(context),
      sessionId: this.sessionId,
      traceId: this.getCurrentTraceId(),
      spanId: this.getCurrentSpanId()
    };
    
    this.buffer.push(entry);
    
    // Flush immédiat pour erreurs critiques
    if (level === 'critical' || level === 'error') {
      this.flush();
    }
    
    // Flush périodique
    if (this.buffer.length >= 100) {
      this.flush();
    }
  }
  
  private sanitizeContext(context: any): Record<string, any> {
    // Suppression données sensibles
    const sanitized = { ...context };
    
    const sensitiveKeys = ['password', 'token', 'key', 'secret', 'auth'];
    for (const key of Object.keys(sanitized)) {
      if (sensitiveKeys.some(sensitive => key.toLowerCase().includes(sensitive))) {
        sanitized[key] = '[REDACTED]';
      }
    }
    
    return sanitized;
  }
  
  async flush(): Promise<void> {
    if (this.buffer.length === 0) return;
    
    const logs = [...this.buffer];
    this.buffer = [];
    
    try {
      await this.sendToLoggingService(logs);
    } catch (error) {
      // Fallback local storage si service indisponible
      this.storeLogsLocally(logs);
    }
  }
}
```

### 📈 Priorité 9 : Métriques business

#### Action 9.1 : Analytics et KPIs
**Impact** : MAJEUR - Insights utilisateur  
**Délai** : 4 jours  

```typescript
// BusinessAnalytics.ts - KPIs métier
class BusinessAnalytics {
  
  async trackUserJourney(): Promise<void> {
    const journey: UserJourneyStage[] = [
      'extension_install',
      'popup_first_open', 
      'organism_creation',
      'trait_customization',
      'first_evolution',
      'social_discovery',
      'ritual_participation',
      'retention_7d'
    ];
    
    for (const stage of journey) {
      await this.trackStage(stage);
    }
  }
  
  async generateInsights(): Promise<BusinessInsights> {
    const metrics = await this.collectBusinessMetrics();
    
    return {
      userEngagement: {
        dailyActiveUsers: metrics.dau,
        sessionDuration: metrics.avgSessionTime,
        stickiness: metrics.dau / metrics.mau, // DAU/MAU ratio
        retentionCohorts: await this.calculateRetentionCohorts()
      },
      
      featureAdoption: {
        traitCustomization: metrics.users_customizing_traits / metrics.total_users,
        socialFeatures: metrics.users_social_activity / metrics.total_users,
        ritualParticipation: metrics.ritual_participants / metrics.total_users
      },
      
      performanceImpact: {
        correlationEngagementPerformance: await this.analyzePerformanceEngagement(),
        churnPredictors: await this.identifyChurnPredictors()
      },
      
      recommendations: await this.generateRecommendations(metrics)
    };
  }
}
```

### ✅ Critères Phase 4
- [ ] Logs structurés en production
- [ ] Métriques business collectées
- [ ] Dashboards opérationnels
- [ ] Alerting intelligent actif
- [ ] Tracing distribué fonctionnel

---

## 🚀 PHASE 5 - DÉPLOIEMENT ET CI/CD (Semaines 5-6)

### 🔄 Priorité 10 : Pipeline production

#### Action 10.1 : CI/CD sécurisé complet
**Impact** : CRITIQUE - Déploiement fiable  
**Délai** : 4 jours  

```yaml
# .github/workflows/production-pipeline.yml
name: 🚀 Production Deployment Pipeline

on:
  push:
    branches: [main]
    tags: ['v*.*.*']
  pull_request:
    branches: [main]

env:
  NODE_VERSION: '18'
  CACHE_VERSION: v1

jobs:
  # ============= PHASE SÉCURITÉ =============
  security-audit:
    name: 🔒 Security Audit
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
          
      - name: Install dependencies
        run: npm ci
        
      - name: 🔍 npm audit
        run: npm audit --audit-level=moderate
        
      - name: 🔎 Secret scanning
        uses: trufflesecurity/trufflehog@main
        with:
          path: ./
          base: main
          head: HEAD
          
      - name: 🛡️ SAST Analysis
        uses: github/super-linter@v4
        env:
          VALIDATE_TYPESCRIPT_ES: true
          VALIDATE_JAVASCRIPT_ES: true
          DEFAULT_BRANCH: main
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}

  # ============= PHASE TESTS =============
  test-suite:
    name: 🧪 Test Suite
    runs-on: ubuntu-latest
    needs: security-audit
    
    strategy:
      matrix:
        test-type: [unit, integration, e2e]
        
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
          
      - name: Install dependencies
        run: npm ci
        
      - name: 🏗️ Build application
        run: npm run build:production
        
      - name: 🧪 Run tests
        run: |
          case "${{ matrix.test-type }}" in
            unit)
              npm run test:unit -- --coverage --ci
              ;;
            integration)
              npm run test:integration -- --ci
              ;;
            e2e)
              npm run test:e2e -- --ci
              ;;
          esac
          
      - name: 📊 Upload coverage
        if: matrix.test-type == 'unit'
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info
          
      - name: 📋 Coverage gate
        if: matrix.test-type == 'unit'
        run: |
          COVERAGE=$(npm run coverage:check)
          if [ $COVERAGE -lt 85 ]; then
            echo "❌ Coverage $COVERAGE% below 85% threshold"
            exit 1
          fi

  # ============= PHASE PERFORMANCE =============
  performance-test:
    name: ⚡ Performance Tests
    runs-on: ubuntu-latest
    needs: test-suite
    
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          
      - name: 🏗️ Build for performance
        run: npm run build:production
        
      - name: 🎯 Load testing
        run: npm run test:load
        
      - name: 📊 Performance budget check
        run: npm run performance:budget-check
        
      - name: 🚨 Performance regression check
        run: npm run performance:regression-check

  # ============= PHASE BUILD =============
  build-and-package:
    name: 📦 Build & Package
    runs-on: ubuntu-latest
    needs: [security-audit, test-suite, performance-test]
    
    outputs:
      version: ${{ steps.version.outputs.version }}
      artifact-url: ${{ steps.upload.outputs.artifact-url }}
      
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        
      - name: 📋 Extract version
        id: version
        run: echo "version=$(jq -r .version package.json)" >> $GITHUB_OUTPUT
        
      - name: 🏗️ Production build
        run: |
          npm ci --production
          npm run build:production
          npm run optimize:bundle
          
      - name: 📦 Package extension
        run: |
          npm run package:extension
          npm run package:backend
          
      - name: 🔍 Validate package
        run: |
          npm run validate:manifest
          npm run validate:bundle-size
          
      - name: ⬆️ Upload artifacts
        id: upload
        uses: actions/upload-artifact@v3
        with:
          name: symbiont-${{ steps.version.outputs.version }}
          path: |
            dist/
            backend/dist/
            package.json
            manifest.json

  # ============= PHASE DÉPLOIEMENT =============
  deploy-staging:
    name: 🚀 Deploy to Staging
    runs-on: ubuntu-latest
    needs: build-and-package
    if: github.ref == 'refs/heads/main'
    
    environment: staging
    
    steps:
      - name: ⬇️ Download artifacts
        uses: actions/download-artifact@v3
        
      - name: 🚀 Deploy to staging
        run: |
          # Deploy backend
          echo "Deploying backend to staging..."
          # Deploy extension to test store
          echo "Deploying extension to test Chrome Web Store..."
          
      - name: ⏱️ Health check
        timeout-minutes: 5
        run: |
          echo "Waiting for staging deployment..."
          sleep 60
          npm run health-check:staging

  deploy-production:
    name: 🌟 Deploy to Production
    runs-on: ubuntu-latest
    needs: [build-and-package, deploy-staging]
    if: startsWith(github.ref, 'refs/tags/v')
    
    environment: production
    
    steps:
      - name: ⬇️ Download artifacts
        uses: actions/download-artifact@v3
        
      - name: 🌟 Deploy to production
        run: |
          # Deploy avec rollback automatique
          npm run deploy:production-with-rollback
          
      - name: 📊 Post-deployment monitoring
        run: |
          npm run monitor:post-deployment
          npm run alerts:enable-production
```

### 🔄 Priorité 11 : Rollback automatique

#### Action 11.1 : Stratégie de rollback intelligent
**Impact** : CRITIQUE - Stabilité production  
**Délai** : 3 jours  

```typescript
// DeploymentManager.ts - Rollback intelligent
class DeploymentManager {
  
  async deployWithAutoRollback(version: string): Promise<DeploymentResult> {
    const rolloutStrategy = {
      canary: { percentage: 5, duration: 300000 }, // 5% pendant 5min
      staged: { percentage: 25, duration: 600000 }, // 25% pendant 10min
      full: { percentage: 100, duration: 1800000 } // 100% pendant 30min
    };
    
    try {
      // Phase 1: Canary deployment
      await this.deployCanary(version, rolloutStrategy.canary);
      const canaryHealth = await this.monitorHealth(rolloutStrategy.canary.duration);
      
      if (!this.isHealthy(canaryHealth)) {
        await this.rollback('canary_unhealthy');
        throw new Error('Canary deployment failed health checks');
      }
      
      // Phase 2: Staged rollout
      await this.deployStaged(version, rolloutStrategy.staged);
      const stagedHealth = await this.monitorHealth(rolloutStrategy.staged.duration);
      
      if (!this.isHealthy(stagedHealth)) {
        await this.rollback('staged_unhealthy');
        throw new Error('Staged deployment failed health checks');
      }
      
      // Phase 3: Full deployment
      await this.deployFull(version);
      const fullHealth = await this.monitorHealth(rolloutStrategy.full.duration);
      
      if (!this.isHealthy(fullHealth)) {
        await this.rollback('full_deployment_unhealthy');
        throw new Error('Full deployment failed health checks');
      }
      
      return { success: true, version, health: fullHealth };
      
    } catch (error) {
      await this.notifyDeploymentFailure(error);
      throw error;
    }
  }
  
  private isHealthy(health: HealthMetrics): boolean {
    return (
      health.errorRate < 0.01 && // Moins de 1% d'erreurs
      health.responseTime < 100 && // Moins de 100ms
      health.availability > 0.999 && // Plus de 99.9% disponibilité
      health.memoryUsage < 0.8 // Moins de 80% mémoire
    );
  }
  
  private async rollback(reason: string): Promise<void> {
    const lastKnownGood = await this.getLastKnownGoodVersion();
    
    console.log(`🔄 Initiating rollback due to: ${reason}`);
    console.log(`🔄 Rolling back to version: ${lastKnownGood}`);
    
    await this.deployVersion(lastKnownGood);
    await this.notifyRollbackCompleted(reason, lastKnownGood);
  }
}
```

### ✅ Critères Phase 5
- [ ] Pipeline CI/CD complet
- [ ] Déploiement multi-environnements
- [ ] Rollback automatique testé
- [ ] Monitoring post-déploiement
- [ ] Gates de qualité automatiques

---

## 📊 VALIDATION FINALE ET ÉVALUATION

### 🎯 Critères de succès obligatoires

| Critère | Seuil Minimum | Validation |
|---------|---------------|------------|
| **Sécurité** | 9.5/10 | ✅ 0 vulnérabilité critique |
| **Performance** | 9.5/10 | ✅ Budget respecté |
| **Architecture** | 9.5/10 | ✅ SOLID + Clean code |
| **Tests** | 9.5/10 | ✅ Coverage ≥ 85% |
| **Observabilité** | 9.5/10 | ✅ Monitoring complet |
| **CI/CD** | 9.5/10 | ✅ Pipeline robuste |

### 🔬 Tests de validation finale

```bash
# Checklist de validation complète
npm run validate:security      # 0 vulnérabilité
npm run validate:performance   # Budget respecté
npm run validate:architecture  # Metrics qualité
npm run validate:tests         # Coverage + passage
npm run validate:monitoring    # Observabilité
npm run validate:deployment    # Pipeline + rollback

# Score global calculé
npm run calculate:readiness-score
# Résultat attendu: ≥ 9.5/10
```

### 📋 Checklist pré-production finale

- [ ] **Sécurité**
  - [ ] 0 secret hardcodé
  - [ ] WebCrypto implémenté
  - [ ] Tests sécurité passent 100%
  - [ ] Audit externe validé

- [ ] **Performance** 
  - [ ] Métriques réelles activées
  - [ ] Budget performance respecté
  - [ ] Tests de charge validés
  - [ ] WebGL optimisé 60+ FPS

- [ ] **Architecture**
  - [ ] OrganismCore refactorisé
  - [ ] Services découplés
  - [ ] DI propre
  - [ ] Code coverage ≥ 85%

- [ ] **Qualité**
  - [ ] Tous tests passent
  - [ ] E2E Playwright robustes
  - [ ] Linting sans erreur
  - [ ] Documentation complète

- [ ] **Observabilité**
  - [ ] Logs structurés
  - [ ] Métriques business
  - [ ] Alerting configuré
  - [ ] Dashboards opérationnels

- [ ] **Déploiement**
  - [ ] Pipeline CI/CD validé
  - [ ] Rollback automatique testé
  - [ ] Environnements configurés
  - [ ] Monitoring post-déploiement

### 🏆 OBJECTIF FINAL

**Note globale cible : 9.5/10 minimum**  
**Timeline : 6 semaines maximum**  
**Résultat attendu : Application production-ready de qualité exceptionnelle**

---

Ce plan corrigé et basé sur l'audit réel garantit une transition sécurisée et performante de SYMBIONT vers la production, avec des actions concrètes et des critères de validation stricts à chaque étape.