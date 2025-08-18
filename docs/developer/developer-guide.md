# Guide Développeur SYMBIONT

**Version:** 1.0  
**Date:** 17 août 2025  
**Environnement:** Production Ready

## 🚀 Introduction

Bienvenue dans l'écosystème de développement SYMBIONT ! Ce guide vous accompagnera dans la configuration, le développement et le déploiement de l'extension Chrome d'organismes intelligents évolutifs.

## 📋 Prérequis

### Environnement de Développement
```bash
# Node.js LTS
node --version  # ≥ 18.0.0
npm --version   # ≥ 9.0.0

# Git
git --version  # ≥ 2.30.0

# Chrome/Chromium pour tests
google-chrome --version  # ≥ 90.0.0
```

### Outils Recommandés
- **IDE:** Visual Studio Code avec extensions TypeScript
- **Terminal:** Bash/Zsh avec support Unicode
- **Navigateur:** Chrome Dev Channel pour tests avancés

## 🛠️ Installation & Configuration

### 1. Clonage du Projet
```bash
git clone https://github.com/your-org/symbiont.git
cd symbiont

# Vérification de l'intégrité
git log --oneline -5  # Voir les derniers commits
```

### 2. Installation des Dépendances
```bash
# Installation des dépendances principales
npm install

# Installation dépendances backend
cd backend && npm install && cd ..

# Vérification installation
npm list --depth=0
```

### 3. Configuration Environnement
```bash
# Copie des fichiers d'environnement
cp .env.example .env.development
cp .env.production.example .env.production

# Configuration backend
cd backend
cp .env.example .env
```

#### Variables d'Environnement Critiques
```bash
# .env.development
NODE_ENV=development
SYMBIONT_DEBUG=true
SHOW_PERFORMANCE_LOGS=true
JEST_VERBOSE=true

# Base de données (backend)
DATABASE_URL="postgresql://user:password@localhost:5432/symbiont_dev"
JWT_SECRET="your-development-jwt-secret"
REDIS_URL="redis://localhost:6379"
```

### 4. Validation de l'Installation
```bash
# Test de l'environnement
node scripts/validate-environment.js

# Vérification sécurité
node scripts/validate-security.js

# Tests rapides
npm test -- --testNamePattern="basic" --verbose
```

## 🏗️ Architecture du Projet

### Structure des Répertoires
```
symbiont/
├── src/                    # Code source principal
│   ├── background/         # Service Worker (Manifest V3)
│   │   ├── index.ts       # Point d'entrée background
│   │   ├── SecurityManager.ts
│   │   ├── WebGLOrchestrator.ts
│   │   └── services/
│   ├── content/           # Scripts d'injection de contenu
│   │   ├── index.ts
│   │   ├── collectors/    # Collecteurs de données
│   │   └── observers/     # Observateurs DOM
│   ├── popup/             # Interface utilisateur popup
│   │   ├── index.tsx
│   │   ├── components/
│   │   └── services/
│   ├── core/              # Logique métier centrale
│   │   ├── OrganismCore.ts
│   │   ├── NeuralMesh.ts
│   │   ├── services/
│   │   └── storage/
│   ├── shared/            # Utilitaires partagés
│   │   ├── utils/         # SecureRandom, SecureLogger, UUID
│   │   ├── messaging/     # Communication inter-composants
│   │   └── config/
│   └── types/             # Définitions TypeScript
├── backend/               # API Express (optionnel)
│   ├── src/
│   │   ├── server.ts
│   │   ├── routes/
│   │   ├── services/
│   │   └── models/
│   └── prisma/           # Schema base de données
├── __tests__/            # Tests unitaires et intégration
│   ├── setup.ts         # Configuration Jest
│   ├── security/        # Tests sécurité
│   ├── core/           # Tests logique métier
│   └── performance/    # Tests performance
├── tests/              # Tests E2E
│   └── e2e/           # Tests Playwright
├── scripts/           # Scripts utilitaires
├── docs/             # Documentation
└── dist/             # Build artifacts
```

### Flux de Données
```mermaid
graph LR
    A[Content Script] --> B[Background Service]
    B --> C[Organism Core]
    C --> D[Neural Mesh]
    D --> E[WebGL Renderer]
    B --> F[Storage Manager]
    G[Popup UI] <--> B
    H[External API] <--> B
```

## 🔧 Commandes de Développement

### Développement Quotidien
```bash
# Développement avec hot reload
npm run dev

# Build complet (extension + backend)
npm run build:all

# Tests en mode watch
npm run test:watch

# Linting avec correction automatique
npm run lint:fix
```

### Tests et Qualité
```bash
# Suite complète de tests
npm test

# Tests avec couverture
npm run test:ci

# Tests E2E Playwright
npm run test:e2e

# Tests de performance
npm test -- __tests__/performance/

# Benchmark SecureRandom
node scripts/performance-benchmark.js
```

### Build et Packaging
```bash
# Build optimisé production
NODE_ENV=production npm run build

# Package extension pour store
npm run package

# Validation manifest Chrome
npm run check-manifest

# Audit sécurité complet
node scripts/final-security-audit.js
```

## 🧪 Tests et Debugging

### Configuration Jest
```typescript
// jest.config.js principales options
{
  testTimeout: 60000,           // Timeout étendu pour tests crypto
  setupFilesAfterEnv: ['<rootDir>/__tests__/setup.ts'],
  coverageThreshold: {
    global: { lines: 85, functions: 85, statements: 85 },
    'src/core/**/*.ts': { lines: 95, functions: 95 }
  }
}
```

### Stratégie de Tests
```typescript
// Test unitaire exemple
describe('SecureRandom', () => {
  it('should generate cryptographically secure numbers', () => {
    const value = SecureRandom.random();
    expect(value).toBeGreaterThanOrEqual(0);
    expect(value).toBeLessThan(1);
  });
});

// Test d'intégration
describe('OrganismCore Integration', () => {
  it('should handle complete mutation cycle', async () => {
    const organism = new OrganismCore();
    await organism.initialize();
    const result = await organism.processMutation(mockMutation);
    expect(result.success).toBe(true);
  });
});
```

### Debugging Avancé
```typescript
// Activation logs détaillés
localStorage.setItem('SYMBIONT_DEBUG', 'true');

// Profiling performance
console.time('organism-initialization');
await organism.initialize();
console.timeEnd('organism-initialization');

// Debug WebGL
const debugInfo = WebGLOrchestrator.getDebugInfo();
logger.debug('WebGL Debug Info', debugInfo);
```

## 🔒 Sécurité & Bonnes Pratiques

### Utilisation SecureRandom
```typescript
// ✅ CORRECT - Pour génération cryptographique
const secureValue = SecureRandom.random();
const secureUUID = generateSecureUUID();
const randomInt = SecureRandom.randomInt(1, 100);

// ❌ INCORRECT - Plus utilisé en production
const unsafeValue = Math.random(); // Seulement pour tests/mocks
```

### Logging Sécurisé
```typescript
// ✅ CORRECT - Utilisation logger sécurisé
import { logger } from '@shared/utils/secureLogger';

logger.info('User action completed', {
  actionType: 'mutation',
  duration: 150,
  success: true
}, 'organism-core');

// ❌ INCORRECT - Exposition données sensibles
console.log('User email:', user.email); // Interdit en production
```

### Gestion des Erreurs
```typescript
// ✅ Gestion d'erreur robuste
try {
  const result = await riskyOperation();
  return result;
} catch (error) {
  logger.error('Operation failed', {
    operation: 'riskyOperation',
    errorCode: error.code,
    // Ne pas logger error.message si peut contenir données sensibles
  }, 'error-handler');
  
  throw new SecuritySafeError('Operation failed', error.code);
}
```

## 🚀 Déploiement et CI/CD

### Pipeline GitHub Actions
Le projet utilise un pipeline automatisé en 8 phases :

1. **🔍 Lint & Style Check** - Validation qualité code
2. **🏗️ Build** - Construction artefacts
3. **🧪 Tests** - Tests unitaires/intégration/sécurité 
4. **🎭 E2E Tests** - Tests Playwright multi-navigateurs
5. **🛡️ Security Audit** - Audit sécurité complet
6. **📦 Package** - Création package final
7. **⚡ Performance** - Monitoring performance
8. **📢 Notification** - Communication résultats

### Déclenchement Pipeline
```bash
# Push sur main -> Pipeline complet + déploiement
git push origin main

# Pull Request -> Pipeline sans déploiement  
git checkout -b feature/my-feature
git push origin feature/my-feature
# Créer PR via GitHub UI

# Release -> Pipeline optimisé production
git tag v1.0.0
git push origin v1.0.0
# Créer release via GitHub UI
```

### Critères de Passage
- ✅ ESLint : 0 erreur critique
- ✅ TypeScript : Compilation réussie
- ✅ Tests : Coverage ≥ 85%
- ✅ E2E : Tests navigateurs réussis
- ✅ Sécurité : Score audit ≥ 80% (Grade B+)
- ✅ Performance : Pas de régression > 3x

## 📱 Extension Chrome - Spécificités

### Manifest V3
```json
{
  "manifest_version": 3,
  "service_worker": "background/index.js",
  "content_scripts": [{
    "matches": ["<all_urls>"],
    "js": ["content/index.js"]
  }],
  "permissions": [
    "storage",
    "activeTab"
  ]
}
```

### Communication Inter-Scripts
```typescript
// Background -> Content Script
chrome.tabs.sendMessage(tabId, {
  type: 'ORGANISM_UPDATE',
  payload: { mutations: newMutations }
});

// Content Script -> Background  
chrome.runtime.sendMessage({
  type: 'BEHAVIOR_COLLECTED',
  payload: { behaviors: collectedBehaviors }
});

// Popup -> Background
const response = await chrome.runtime.sendMessage({
  type: 'GET_ORGANISM_STATE'
});
```

### Stockage Local
```typescript
// Utilisation SymbiontStorage (chiffré)
await SymbiontStorage.set('organism-state', {
  energy: 100,
  mutations: [],
  timestamp: Date.now()
});

const state = await SymbiontStorage.get('organism-state');
```

## 🎨 Interface Utilisateur

### Stack Technologique
- **Framework:** React 18 avec TypeScript
- **Styling:** CSS Modules + Styled Components
- **State Management:** React Context + Hooks
- **Icons:** Custom SVG + Lucide React

### Composants Principaux
```typescript
// Organism Dashboard
<OrganismDashboard
  organism={currentOrganism}
  onMutationTrigger={handleMutation}
  realTimeMetrics={metrics}
/>

// Settings Panel
<SettingsPanel
  onSecuritySettingsChange={updateSecurityConfig}
  onPrivacyToggle={handlePrivacyToggle}
/>
```

### Responsive Design
```css
/* Mobile First Approach */
.organism-panel {
  width: 320px; /* Mobile minimum */
}

@media (min-width: 768px) {
  .organism-panel {
    width: 400px; /* Desktop optimisé */
  }
}
```

## 🔄 Workflow de Contribution

### 1. Setup Feature Branch
```bash
# Synchronisation avec main
git checkout main
git pull origin main

# Création branche feature
git checkout -b feature/secure-random-optimization
```

### 2. Développement
```bash
# Tests continus pendant développement
npm run test:watch

# Linting automatique
npm run lint:fix

# Validation avant commit
npm run validate-all
```

### 3. Commit et Push
```bash
# Commit avec message descriptif
git add .
git commit -m "feat: optimize SecureRandom performance with caching

- Implement LRU cache for repeated random values
- Add benchmark comparison vs Math.random  
- Update tests with performance assertions
- Document caching strategy in README

Resolves #123"

# Push et création PR
git push origin feature/secure-random-optimization
```

### 4. Code Review
- **Automatique:** Pipeline CI/CD vérifie qualité
- **Manuel:** Review par équipe sécurité si changements crypto
- **Validation:** Tests E2E réussis sur multiple navigateurs

## 📊 Monitoring et Métriques

### Métriques de Performance
```typescript
// Collecte automatique métriques
const performanceMonitor = new RealTimePerformanceMonitor();

performanceMonitor.track('organism-mutation', {
  startTime: performance.now(),
  mutationType: 'behavioral',
  complexity: 'high'
});
```

### Métriques Business
```typescript
// Tracking événements utilisateur (anonymisé)
logger.info('Feature usage', {
  feature: 'neural-mesh-visualization',
  duration: 30000, // 30 secondes
  userType: 'returning'
}, 'analytics');
```

### Dashboard Production
- **Coverage:** Reports HTML automatiques
- **Performance:** Benchmarks dans artifacts CI/CD
- **Sécurité:** Audits quotidiens
- **Erreurs:** Monitoring temps réel (si backend déployé)

## 🛠️ Dépannage Courant

### Problèmes Build
```bash
# Nettoyage cache complet
npm run clean
rm -rf node_modules package-lock.json
npm install

# Rebuild avec logs détaillés  
npm run build -- --verbose
```

### Problèmes Tests
```bash
# Tests en mode debug
npm test -- --verbose --no-cache

# Tests spécifiques avec timeout étendu
npm test -- __tests__/security/ --testTimeout=120000
```

### Problèmes WebGL
```typescript
// Debug contexte WebGL
const gl = canvas.getContext('webgl2');
if (!gl) {
  logger.error('WebGL2 not supported', {
    userAgent: navigator.userAgent,
    webglSupport: !!canvas.getContext('webgl')
  });
}
```

### Performance Issues
```bash
# Profiling détaillé
node --inspect scripts/performance-benchmark.js

# Analyse bundle size
npm run analyze-bundle
```

## 📚 Ressources et Références

### Documentation Interne
- **[Architecture Overview](./architecture.md)** - Vue d'ensemble système
- **[Security Guide](./security-guide.md)** - Bonnes pratiques sécurité  
- **[Performance Optimization](./performance.md)** - Optimisations avancées
- **[API Reference](./api-reference.md)** - Documentation API complète

### Références Externes
- **[Chrome Extension API](https://developer.chrome.com/docs/extensions/)** - Documentation officielle
- **[Manifest V3 Migration](https://developer.chrome.com/docs/extensions/mv3/intro/)** - Guide migration
- **[WebGL 2.0 Specification](https://www.khronos.org/webgl/)** - Standards WebGL
- **[RGPD Guidelines](https://gdpr.eu/)** - Conformité données personnelles

### Support Communauté
- **GitHub Issues:** [Repository Issues](https://github.com/your-org/symbiont/issues)
- **Discussions:** [GitHub Discussions](https://github.com/your-org/symbiont/discussions)
- **Discord:** [Serveur développeur](https://discord.gg/symbiont-dev)

## 📞 Support et Contact

### Équipe Technique
- **Lead Developer:** developer@symbiont-extension.com
- **Security Team:** security@symbiont-extension.com  
- **DevOps:** devops@symbiont-extension.com

### Urgences
- **Security Incident:** security-incident@symbiont-extension.com
- **Production Down:** emergency@symbiont-extension.com
- **Data Breach:** dpo@symbiont-extension.com

---

**Bon développement ! 🚀**

*Guide maintenu par l'équipe SYMBIONT | Dernière mise à jour: 17 août 2025*