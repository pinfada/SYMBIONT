# 🤝 Guide de Contribution SYMBIONT

**Extension Chrome d'Organismes Intelligents Évolutifs**

## 👋 Bienvenue Contributeur !

Merci de votre intérêt pour contribuer à SYMBIONT ! Ce guide vous accompagnera dans votre première contribution et les standards de qualité du projet.

## 🎯 Types de Contributions

### 🐛 Corrections de Bugs
- Correction de bugs identifiés
- Amélioration de la stabilité
- Résolution de problèmes de performance

### ✨ Nouvelles Fonctionnalités
- Extensions du système neural
- Nouvelles visualisations 3D
- Améliorations d'interface utilisateur

### 📚 Documentation
- Amélioration des guides
- Traductions
- Exemples et tutoriels

### 🔧 Infrastructure
- Optimisations de build
- Amélioration des tests
- Configuration CI/CD

## 🚀 Premiers Pas

### Prérequis Techniques
```bash
# Versions minimales requises
node --version   # ≥ 18.0.0
npm --version    # ≥ 9.0.0
git --version    # ≥ 2.30.0
```

### 1. Fork et Clone
```bash
# Fork via GitHub UI puis :
git clone https://github.com/VOTRE-USERNAME/symbiont.git
cd symbiont

# Ajouter upstream remote
git remote add upstream https://github.com/your-org/symbiont.git
```

### 2. Installation Développement
```bash
# Installation dépendances
npm install
cd backend && npm install && cd ..

# Configuration environnement
cp .env.example .env.development
cp backend/.env.example backend/.env

# Validation installation
npm run validate-environment
npm test -- --testNamePattern="basic"
```

### 3. Comprendre la Structure
```bash
# Explorer le codebase
ls -la src/         # Code source principal
ls -la docs/        # Documentation
ls -la __tests__/   # Tests unitaires
ls -la scripts/     # Scripts utilitaires

# Lecture obligatoire
cat CLAUDE.md       # Instructions développement
cat docs/technical/architecture.md  # Architecture système
```

## 🎨 Standards de Code

### TypeScript / JavaScript

#### Style et Formatting
```typescript
// ✅ CORRECT - Naming conventions
class OrganismCore {
  private neuralMesh: NeuralMesh;
  
  public async processMutation(data: MutationData): Promise<MutationResult> {
    // Implementation
  }
}

// ✅ CORRECT - Import organization
import { logger } from '@shared/utils/secureLogger';
import { SecureRandom } from '@shared/utils/secureRandom';
import type { OrganismState } from '@types/organism';
```

#### Sécurité Obligatoire
```typescript
// ✅ CORRECT - Usage obligatoire
import { SecureRandom, logger } from '@shared/utils';

const randomValue = SecureRandom.random();
logger.info('Operation completed', { duration: 150 }, 'organism-core');

// ❌ INCORRECT - Interdit en production
const unsafeValue = Math.random();
console.log('Sensitive data:', userData);
```

#### TypeScript Strict
```typescript
// ✅ Configuration stricte requise
{
  "strict": true,
  "noImplicitAny": true,
  "noImplicitReturns": true,
  "noUnusedLocals": true,
  "noUnusedParameters": true
}
```

### Tests Obligatoires

#### Couverture Minimale
```bash
# Seuils de couverture requis
Global: 85%
Core modules: 90%
Security modules: 95%
Utils: 90%
```

#### Structure des Tests
```typescript
// Test unitaire type
describe('SecureRandom', () => {
  it('should generate cryptographically secure numbers', () => {
    const value = SecureRandom.random();
    expect(value).toBeGreaterThanOrEqual(0);
    expect(value).toBeLessThan(1);
  });
  
  it('should handle edge cases gracefully', () => {
    // Tests des cas limites obligatoires
  });
});

// Test d'intégration type
describe('OrganismCore Integration', () => {
  beforeEach(() => {
    // Setup clean pour chaque test
  });
  
  it('should complete full mutation cycle', async () => {
    // Test end-to-end critique
  });
});
```

### Gestion d'Erreurs
```typescript
// ✅ CORRECT - Pattern standard
try {
  const result = await riskyOperation();
  return result;
} catch (error) {
  logger.error('Operation failed', {
    operation: 'riskyOperation',
    errorCode: error.code
  }, 'error-handler');
  
  throw new SecuritySafeError('Operation failed', error.code);
}
```

## 🔄 Workflow de Contribution

### 1. Planification
```bash
# Créer issue GitHub pour discussion
# - Description détaillée du problème/feature
# - Proposer approche technique
# - Attendre validation maintainers

# Assigner issue à soi-même
# Estimer complexité et durée
```

### 2. Développement
```bash
# Créer branche feature
git checkout -b feature/secure-random-optimization

# Développement itératif avec tests
npm run test:watch          # Tests continus
npm run lint:fix           # Correction style automatique
npm run build              # Validation build

# Commits fréquents et atomiques
git add .
git commit -m "feat: optimize SecureRandom caching

- Implement LRU cache for repeated values
- Add benchmark comparison vs Math.random
- Update tests with performance assertions
- Document caching strategy

Resolves #123"
```

### 3. Tests et Validation
```bash
# Suite complète de tests avant PR
npm test                   # Tests unitaires + intégration
npm run test:e2e          # Tests end-to-end
npm run lint              # Vérification style
npm run build:production  # Build optimisé

# Tests sécurité (si changements crypto)
npm test -- __tests__/security/
node scripts/validate-security.js

# Performance (si optimisations)
node scripts/performance-benchmark.js
```

### 4. Pull Request
```bash
# Push branche
git push origin feature/secure-random-optimization

# Créer PR via GitHub UI avec template :
```

#### Template Pull Request
```markdown
## 📋 Description
Brève description des changements et motivation.

## 🔄 Type de Changement
- [ ] Bug fix (non-breaking change)
- [ ] Nouvelle fonctionnalité (non-breaking change)
- [ ] Breaking change (fix ou feature qui change l'API)
- [ ] Documentation uniquement

## 🧪 Tests
- [ ] Tests existants passent
- [ ] Nouveaux tests ajoutés pour nouvelles fonctionnalités
- [ ] Tests E2E mis à jour si nécessaire
- [ ] Couverture ≥ seuils requis

## ✅ Checklist
- [ ] Code suit les standards du projet
- [ ] Auto-review du code effectué
- [ ] Documentation mise à jour
- [ ] Changelog mis à jour (si applicable)
- [ ] Tests de sécurité passés (si applicable)

## 🔗 Issues Liées
Resolves #123
Related to #456

## 📸 Screenshots (si UI)
[Ajouter captures d'écran si changements visuels]

## 🎯 Impact Performance
[Détailler impact performance si applicable]
```

## 🔍 Processus de Review

### Critères d'Acceptation

#### ✅ Requirements Techniques
- **Build réussit :** Pas d'erreurs compilation
- **Tests passent :** 100% suite de tests
- **Linting OK :** Respect standards code
- **Couverture :** Atteint seuils requis
- **Performance :** Pas de régression significative

#### ✅ Requirements Sécurité
- **Crypto conforme :** Usage SecureRandom/SecureLogger
- **Validation input :** Sanitization des données
- **Gestion erreurs :** Pas de leak d'information
- **Audit sécurité :** Score maintenu ≥ 80%

#### ✅ Requirements Fonctionnels
- **Fonctionnalité complète :** Feature entièrement implémentée
- **Edge cases :** Cas limites gérés
- **UX cohérente :** Interface intuitive
- **Documentation :** Guide utilisateur mis à jour

### Timeline Review
```
1. Review automatique (CI/CD) : < 10 minutes
2. Review code par peer : 24-48h
3. Review sécurité (si applicable) : 48-72h
4. Review final mainteneur : 24h
5. Merge si approuvé : Immédiat
```

### Feedback et Itération
- **Changements demandés :** Répondre dans 7 jours
- **Questions :** Clarification rapide encouragée
- **Commits additionnels :** Push sur même branche
- **Force push :** Éviter, utiliser commits additionnels

## 🏆 Bonnes Pratiques

### Commits de Qualité

#### Format Conventional Commits
```bash
# Types valides
feat:     # Nouvelle fonctionnalité
fix:      # Correction bug
docs:     # Documentation uniquement
style:    # Formatting, pas de changement code
refactor: # Refactoring sans changement fonctionnel
perf:     # Amélioration performance
test:     # Ajout/modification tests
chore:    # Maintenance, build, etc.

# Exemples
feat(neural): add hebbian learning algorithm
fix(security): prevent timing attack in crypto validation
docs(api): update mutation engine documentation
perf(webgl): optimize batch rendering performance
```

#### Messages Descriptifs
```bash
# ✅ CORRECT - Descriptif et contextuel
feat: implement secure random number generator

- Replace Math.random() with WebCrypto API
- Add fallback for older browsers
- Include comprehensive test suite
- Update security documentation

Performance: 15% faster than Math.random()
Security: FIPS 140-2 compliant
Resolves #234

# ❌ INCORRECT - Trop vague
fix: bug fix
update: changes
```

### Documentation Code

#### Commentaires Utiles
```typescript
// ✅ CORRECT - Explique le "pourquoi"
/**
 * Implements secure random generation using WebCrypto API.
 * Fallback to Math.random() only in test environment.
 * 
 * @security Critical for cryptographic operations
 * @performance Cached pool reduces API calls by 60%
 */
class SecureRandom {
  // Complex algorithm explanation when needed
  private static generateSecurePool(): Uint32Array {
    // Using WebCrypto instead of Math.random to ensure
    // cryptographic security for UUID generation and
    // mutation randomness that affects organism evolution
    return crypto.getRandomValues(new Uint32Array(1000));
  }
}

// ❌ INCORRECT - Explique le "quoi" (obvious)
// Generates random number
const num = SecureRandom.random();
```

#### JSDoc Complet
```typescript
/**
 * Processes organism mutation with neural network adaptation.
 * 
 * @param mutation - Mutation data containing behavioral patterns
 * @param options - Processing options for neural adaptation
 * @returns Promise resolving to mutation result with new traits
 * 
 * @throws {ValidationError} When mutation data is invalid
 * @throws {SecurityError} When cryptographic validation fails
 * 
 * @example
 * ```typescript
 * const result = await organism.processMutation({
 *   type: 'behavioral',
 *   patterns: ['navigation', 'attention'],
 *   intensity: 0.7
 * });
 * ```
 * 
 * @since 1.0.0
 * @security Validates input to prevent injection attacks
 */
public async processMutation(
  mutation: MutationData,
  options?: ProcessingOptions
): Promise<MutationResult> {
  // Implementation
}
```

### Tests Robustes

#### Test Pyramid
```typescript
// Tests unitaires (70%)
describe('SecureRandom.random()', () => {
  it('returns values in [0,1) range', () => {
    for (let i = 0; i < 1000; i++) {
      const value = SecureRandom.random();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });
});

// Tests d'intégration (20%)
describe('Neural Network Integration', () => {
  it('handles complete learning cycle', async () => {
    const network = new NeuralMesh();
    const patterns = generateTestPatterns();
    
    await network.initialize();
    const result = await network.processPatterns(patterns);
    
    expect(result.accuracy).toBeGreaterThan(0.8);
  });
});

// Tests E2E (10%)
describe('User Experience Flow', () => {
  it('completes organism evolution journey', async () => {
    await page.goto('/popup.html');
    await page.click('[data-testid="start-evolution"]');
    
    await expect(page.locator('.organism-viewer')).toBeVisible();
    await expect(page.locator('.mutation-indicator')).toContainText('Active');
  });
});
```

#### Mocking Intelligent
```typescript
// ✅ CORRECT - Mock spécifique et utile
jest.mock('@shared/utils/secureRandom', () => ({
  SecureRandom: {
    random: jest.fn(() => 0.5), // Valeur déterministe pour tests
    randomInt: jest.fn((min, max) => min + Math.floor((max - min) * 0.5))
  }
}));

// ❌ INCORRECT - Mock trop large
jest.mock('@shared/utils'); // Mock tout le module
```

### Performance et Optimisation

#### Mesures Objectives
```typescript
// Benchmark performance
describe('Performance Tests', () => {
  it('should complete mutation in <100ms', async () => {
    const start = performance.now();
    
    await organism.processMutation(testMutation);
    
    const duration = performance.now() - start;
    expect(duration).toBeLessThan(100);
  });
  
  it('should handle 1000 concurrent operations', async () => {
    const operations = Array(1000).fill(null).map(() => 
      organism.processMutation(testMutation)
    );
    
    const results = await Promise.all(operations);
    expect(results).toHaveLength(1000);
    expect(results.every(r => r.success)).toBe(true);
  });
});
```

#### Optimisations Documentées
```typescript
/**
 * WebGL batch operations to reduce GPU context switches.
 * 
 * @performance Reduces render time by 40% for complex scenes
 * @memory Uses object pooling to prevent GC pressure
 */
class WebGLBatcher {
  private static readonly BATCH_SIZE = 1000;
  private static readonly POOL_SIZE = 100;
  
  // Documented optimization decisions
  public batchOperations(operations: WebGLOperation[]): void {
    // Group by shader program to minimize state changes
    const grouped = this.groupByShader(operations);
    
    // Process in optimal batch sizes
    grouped.forEach(batch => this.processBatch(batch));
  }
}
```

## 🚨 Problèmes Courants à Éviter

### ❌ Erreurs Techniques Fréquentes

#### Sécurité
```typescript
// ❌ INCORRECT - Utilisation Math.random() en production
const unsafe = Math.random();

// ❌ INCORRECT - Logs non sécurisés
console.log('User data:', userData);

// ❌ INCORRECT - Gestion d'erreur exposante
catch(error) {
  throw new Error(error.message); // Peut exposer données sensibles
}
```

#### Performance
```typescript
// ❌ INCORRECT - Pas de cache, recalcul constant
function expensiveOperation() {
  return heavyComputation(); // Appelé à chaque fois
}

// ❌ INCORRECT - Memory leaks
class ComponentWithLeak {
  constructor() {
    // Event listener jamais nettoyé
    window.addEventListener('resize', this.handleResize);
  }
}
```

#### Tests
```typescript
// ❌ INCORRECT - Tests non déterministes
it('should work sometimes', () => {
  const random = Math.random();
  expect(random).toBeLessThan(0.5); // 50% chance d'échec
});

// ❌ INCORRECT - Tests trop couplés
it('depends on previous test state', () => {
  // Utilise l'état laissé par test précédent
});
```

### ❌ Erreurs Processus

#### Pull Requests
- **Trop large :** PR > 500 lignes difficile à reviewer
- **Mixte :** Bug fix + nouvelle feature dans même PR
- **Pas de tests :** Code sans tests associés
- **Description vague :** "Fix stuff" n'aide personne

#### Communication
- **Pas de discussion :** Implémenter sans validation design
- **Assumptions :** Supposer requirements sans clarification
- **Silence :** Ne pas répondre aux comments de review

## 🎖️ Reconnaissance Contributeurs

### Niveaux de Contribution

#### 🥉 Contributeur Bronze
- **1-5 PRs** acceptées
- **Reconnaissance :** Mention dans CONTRIBUTORS.md
- **Badge :** GitHub contributor badge

#### 🥈 Contributeur Silver  
- **6-20 PRs** acceptées ou contributions significatives
- **Reconnaissance :** Section dédiée documentation
- **Privilèges :** Priority review, early access features

#### 🥇 Contributeur Gold
- **20+ PRs** ou contributions majeures
- **Reconnaissance :** Page dédiée + blog post
- **Privilèges :** Reviewer rights, architecture decisions input

#### 💎 Core Maintainer
- **Invitation seulement** après contributions exceptionnelles
- **Privilèges :** Merge rights, release management
- **Responsabilités :** Mentoring nouveaux contributeurs

### Contributions Spéciales

#### 🔒 Security Researcher
- **Découverte vulnérabilités** avec responsible disclosure
- **Reconnaissance :** Security Hall of Fame
- **Récompense :** Potential bug bounty

#### 📚 Documentation Hero
- **Amélioration documentation** significative
- **Traductions** complètes
- **Reconnaissance :** Documentation credits

#### 🎨 UX/UI Designer
- **Amélioration expérience utilisateur**
- **Designs systèmes** cohérents
- **Reconnaissance :** Design credits

## 📞 Support et Aide

### Canaux de Communication

#### Questions Techniques
- **GitHub Discussions :** Questions design et architecture
- **GitHub Issues :** Bugs spécifiques et feature requests
- **Discord Developer Channel :** Chat temps réel

#### Mentorship
- **Buddy System :** Assignment automatique mentor pour nouveaux
- **Office Hours :** Sessions hebdomadaires Q&A avec maintainers
- **Code Review Sessions :** Reviews collectives éducatives

### Ressources d'Apprentissage

#### Documentation Technique
- **[Architecture Guide](../technical/architecture.md)** - Comprendre le système
- **[Security Guide](../technical/security.md)** - Standards sécurité
- **[Performance Guide](../technical/performance.md)** - Optimisations

#### Outils Recommandés
```bash
# VSCode Extensions recommandées
- TypeScript
- ESLint
- Prettier
- Jest Runner
- GitLens

# Scripts utiles
npm run dev              # Développement avec hot reload
npm run test:watch       # Tests continus
npm run lint:fix         # Fix automatique style
npm run validate-all     # Validation complète avant commit
```

### FAQ Contributeurs

#### Q: Comment choisir quoi contribuer ?
**R:** Consultez les `good first issue` labels sur GitHub, ou demandez dans Discord.

#### Q: Combien de temps pour review ?
**R:** 24-48h pour review initial, plus si changements sécurité critiques.

#### Q: Puis-je travailler sur plusieurs features simultanément ?
**R:** Oui, mais créez des branches séparées et des PRs indépendantes.

#### Q: Comment tester les changements Chrome extension ?
**R:** Utilisez `npm run build` puis chargez `dist/` en mode développeur dans Chrome.

---

## 🎉 Merci pour votre Contribution !

Chaque contribution, petite ou grande, aide à faire évoluer SYMBIONT et la communauté. Votre travail est apprécié et reconnu.

**Happy Coding! 🚀**

---

*Guide maintenu par l'équipe SYMBIONT | Dernière mise à jour: 17 août 2025*