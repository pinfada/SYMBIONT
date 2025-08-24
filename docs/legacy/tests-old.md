# 🧪 Stratégie de Tests SYMBIONT

## 📋 Vue d'ensemble

SYMBIONT utilise une stratégie de tests multi-couches pour garantir la fiabilité d'une extension Chrome complexe avec backend Node.js.

**Configuration actuelle :**
- **Jest** pour tests unitaires et d'intégration
- **Playwright** pour tests E2E
- **Coverage cible :** 80% global, 85% modules core, 90% utilitaires
- **41 fichiers de tests** répartis sur 3 niveaux
- **Timeout configuré :** 30s pour tests asynchrones
- **Cache optimisé :** .jest-cache pour améliorer les performances

## 🏗️ Types de tests

### 1. Tests unitaires (`tests/unit/`)
Tests des modules isolés avec mocks des dépendances externes.

```typescript
// Exemple : OrganismCore.test.ts
describe('OrganismCore', () => {
  test('should initialize with default traits', () => {
    const organism = new OrganismCore();
    expect(organism.traits.curiosity).toBeGreaterThan(0);
  });
});
```

**Modules couverts :**
- `core/` : OrganismCore, NeuralMesh, MessageBus, SymbiontStorage
- `behavioral/` : ActionPredictor, BehavioralEngine, PatternDetector
- `generative/` : DNAInterpreter, MutationEngine, OrganismEngine
- `neural/` : NeuralMesh, NeuronTypes, SynapticRouter

### 2. Tests d'intégration (`tests/integration/`)
Tests des interactions entre composants et flux de données.

```typescript
// Exemple : messaging.test.ts
describe('MessageBus Integration', () => {
  test('should handle background to popup communication', async () => {
    const bus = MessageBus.getInstance();
    const response = await bus.sendMessage({
      type: 'ORGANISM_UPDATE',
      data: { traits: updatedTraits }
    });
    expect(response.success).toBe(true);
  });
});
```

**Flux testés :**
- Communication inter-modules (background ↔ content ↔ popup)
- Persistance et récupération de données
- WebGL rendering pipeline
- Système de cache Redis + IndexedDB

### 3. Tests E2E (`tests/e2e/`)
Tests complets d'expérience utilisateur avec Playwright.

```typescript
// Exemple : dashboard.spec.ts
test('should display organism evolution', async ({ page }) => {
  await page.goto('chrome-extension://[id]/popup/index.html');
  await expect(page.locator('.organism-dashboard')).toBeVisible();
  await expect(page.locator('.traits-chart')).toContainText('Curiosité');
});
```

**Scénarios E2E :**
- Installation et onboarding complet
- Évolution d'organismes en conditions réelles
- Fonctionnalités sociales (invitations, rituels)
- Performance et résilience système

### 4. Tests de performance (`__tests__/performance.benchmark.test.ts`)
Benchmarks pour valider les performances critiques.

```typescript
// Exemple : Performance WebGL
test('WebGL rendering should stay under 16ms', async () => {
  const renderer = new WebGLRenderer();
  const startTime = performance.now();
  await renderer.renderFrame(complexScene);
  const duration = performance.now() - startTime;
  expect(duration).toBeLessThan(16); // 60 FPS
});
```

## 📊 Configuration et commandes

### Lancement des tests

```bash
# Tests complets avec coverage
npm test

# Tests en mode watch (développement)
npm run test:watch

# Tests E2E uniquement
npm run test:e2e

# Coverage détaillé
npm run test:ci

# Tests backend séparément
cd backend && npm test
```

### Configuration Jest

```javascript
// jest.config.js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  
  // Coverage requirements
  coverageThreshold: {
    global: {
      branches: 75,
      functions: 80,
      lines: 80,
      statements: 80
    },
    './src/core/': {
      branches: 85,
      functions: 85,
      lines: 85,
      statements: 85
    },
    './src/shared/utils/': {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90
    }
  },
  
  // Mocks pour environnement Chrome
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@core/(.*)$': '<rootDir>/src/core/$1'
  }
};
```

## 🎭 Mocks et stubs

### Chrome Extensions API

```typescript
// tests/__mocks__/chrome.ts
global.chrome = {
  storage: {
    local: {
      get: jest.fn(),
      set: jest.fn(),
      clear: jest.fn()
    }
  },
  runtime: {
    sendMessage: jest.fn(),
    onMessage: {
      addListener: jest.fn(),
      removeListener: jest.fn()
    }
  },
  tabs: {
    query: jest.fn(),
    create: jest.fn()
  }
};
```

### WebGL Context Mock

```typescript
// tests/__mocks__/webgl.ts
const mockWebGLContext = {
  createProgram: jest.fn(),
  createShader: jest.fn(),
  compileShader: jest.fn(),
  linkProgram: jest.fn(),
  useProgram: jest.fn(),
  uniform1f: jest.fn(),
  drawArrays: jest.fn()
};
```

### IndexedDB Mock

```typescript
// tests/__mocks__/storage.ts
class MockIDBDatabase {
  transaction = jest.fn(() => ({
    objectStore: jest.fn(() => ({
      get: jest.fn(),
      put: jest.fn(),
      delete: jest.fn()
    }))
  }));
}
```

## ✅ Bonnes pratiques

### 1. Structure des tests

```typescript
describe('ModuleName', () => {
  let module: ModuleName;
  
  beforeEach(() => {
    // Setup propre pour chaque test
    module = new ModuleName(mockDependencies);
  });
  
  afterEach(() => {
    // Cleanup pour éviter les fuites mémoire
    module.destroy();
    jest.clearAllMocks();
  });
  
  describe('core functionality', () => {
    test('should handle normal case', () => {
      // Test du cas nominal
    });
    
    test('should handle edge case', () => {
      // Test des cas limites
    });
    
    test('should handle error case', () => {
      // Test de gestion d'erreurs
    });
  });
});
```

### 2. Tests asynchrones

```typescript
// Utiliser async/await systématiquement
test('async operation should resolve', async () => {
  const result = await module.asyncMethod();
  expect(result).toBeDefined();
});

// Timeout pour tests longs
test('performance operation', async () => {
  // Test complexe
}, 30000); // 30s timeout
```

### 3. Tests de performance

```typescript
// Mesurer les performances critiques
test('should process data under threshold', () => {
  const largeDataset = generateTestData(10000);
  const startTime = performance.now();
  
  module.processData(largeDataset);
  
  const duration = performance.now() - startTime;
  expect(duration).toBeLessThan(100); // 100ms max
});
```

### 4. Isolation des tests

```typescript
// Mock des services externes
jest.mock('../services/APIService', () => ({
  fetchData: jest.fn().mockResolvedValue(mockData),
  postData: jest.fn().mockResolvedValue({ success: true })
}));
```

## 🐛 Débogage des tests

### Diagnostics courants

```bash
# Tests qui timeout
npm test -- --verbose --detectOpenHandles

# Coverage détaillé
npm test -- --coverage --coverageReporters=text

# Un seul fichier de test
npm test -- OrganismCore.test.ts

# Tests en mode debug
npm test -- --inspect-brk

# Tests avec logs détaillés
npm test -- --verbose --silent=false

# Réinitialiser le cache Jest
npm test -- --clearCache
```

### Logs de débogage

```typescript
// Activer les logs dans les tests
process.env.NODE_ENV = 'test';
process.env.DEBUG = 'symbiont:*';

// Pour debug spécifique
process.env.DEBUG = 'symbiont:core,symbiont:neural';
```

### Résolution des problèmes fréquents

```bash
# Erreur "Cannot find module"
npm install && npm run build

# Tests qui ne passent plus après refactoring
npm test -- --updateSnapshot

# Mémoire insuffisante
export NODE_OPTIONS="--max-old-space-size=4096"

# Tests E2E qui échouent
npm run test:e2e -- --headed --debug
```

## 📈 Métriques et rapports

### Coverage HTML

```bash
npm run test:ci
# Ouvre coverage/lcov-report/index.html
```

### Rapports Playwright

```bash
npm run test:e2e
# Ouvre playwright-report/index.html
```

### CI/CD Integration

```yaml
# .github/workflows/test.yml
- name: Run tests
  run: |
    npm test
    npm run test:e2e
    
- name: Upload coverage
  uses: codecov/codecov-action@v3
```

## 🚀 Feuille de route

### Améliorations prévues

1. **Tests de charge** : Simulation de 1000+ utilisateurs simultanés
2. **Tests de régression visuelle** : Comparaison d'images avec Percy.io
3. **Tests d'accessibilité** : Intégration axe-core
4. **Tests de sécurité** : Scan automatique des vulnérabilités
5. **Tests cross-browser** : Chrome, Firefox, Edge

### Outils à intégrer

- **Storybook** : Tests d'interaction des composants
- **MSW** : Mock Service Worker pour APIs
- **Testing Library** : Tests orientés utilisateur
- **Puppeteer** : Tests supplémentaires d'automatisation 