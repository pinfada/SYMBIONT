# Contributing to SYMBIONT

Guide de contribution pour développeurs souhaitant participer au projet SYMBIONT.

## 👋 Bienvenue Contributeur !

Merci de votre intérêt pour contribuer à SYMBIONT ! Ce guide vous accompagnera dans votre première contribution et les standards de qualité du projet.

SYMBIONT est une extension Chrome open source qui crée des organismes intelligents évolutifs. Nous accueillons toutes les contributions : code, documentation, design, tests, idées et feedback.

## 🎯 Types de Contributions

### 🐛 Corrections de Bugs
- Correction de bugs identifiés dans les [Issues](https://github.com/pinfada/SYMBIONT/issues)
- Amélioration de la stabilité et fiabilité
- Résolution de problèmes de performance
- Fixes de compatibilité navigateur

### ✨ Nouvelles Fonctionnalités
- Extensions du système neural et d'apprentissage
- Nouvelles visualisations 3D et effets visuels
- Améliorations d'interface utilisateur
- Fonctionnalités sociales et communautaires
- Intégrations avec des services externes

### 📚 Documentation
- Amélioration des guides utilisateur et développeur
- Traductions dans d'autres langues
- Exemples et tutoriels
- Commentaires de code et API documentation

### 🔧 Infrastructure
- Optimisations de build et performance
- Amélioration de la couverture de tests
- Configuration CI/CD et automatisation
- Outils de développement et debugging

### 🎨 Design et UX
- Amélioration de l'interface utilisateur
- Design d'icônes et assets
- Expérience utilisateur et accessibilité
- Thèmes et personnalisation

## 🚀 Premiers Pas

### Prérequis Techniques
```bash
# Versions minimales requises
node --version   # ≥ 18.0.0
npm --version    # ≥ 9.0.0
git --version    # ≥ 2.30.0

# Outils recommandés
code --version   # VS Code (optionnel)
chrome --version # Chrome/Chromium ≥ 90
```

### 1. Fork et Clone
```bash
# 1. Forker le repository sur GitHub (bouton Fork)

# 2. Cloner votre fork
git clone https://github.com/VOTRE-USERNAME/SYMBIONT.git
cd SYMBIONT

# 3. Ajouter upstream remote
git remote add upstream https://github.com/pinfada/SYMBIONT.git

# 4. Vérifier les remotes
git remote -v
```

### 2. Installation et Setup
```bash
# Installation des dépendances
npm install

# Installation backend (optionnel)
cd backend && npm install && cd ..

# Vérification de l'installation
npm run validate:installation

# Premier build
npm run build
```

### 3. Comprendre la Structure
```bash
# Explorer le codebase
ls -la src/         # Code source principal
ls -la docs/        # Documentation
ls -la __tests__/   # Tests unitaires
ls -la scripts/     # Scripts utilitaires

# Lecture recommandée
cat CLAUDE.md       # Instructions développement
cat docs/technical/architecture.md  # Architecture système
```

### 4. Validation de l'Environnement
```bash
# Tests rapides
npm test -- --testNamePattern="basic"

# Vérifications sécurité
node scripts/validate-security.js

# Linting
npm run lint

# Build complet
npm run build:all
```

## 🔄 Workflow de Contribution

### 1. Setup Feature Branch
```bash
# Sync avec upstream
git fetch upstream
git checkout main
git merge upstream/main

# Créer branche feature
git checkout -b feature/nom-descriptif
# ou
git checkout -b fix/description-bug
```

### 2. Développement

#### Standards de Code
```typescript
// Utiliser SecureRandom au lieu de Math.random()
import { SecureRandom } from '@/shared/utils';
const random = SecureRandom.random();

// Logging sécurisé
import { logger } from '@/shared/utils';
logger.info('Processing data', { count: items.length }, 'ServiceName');

// Types stricts TypeScript
interface StrictInterface {
  id: string;
  value: number;
  optional?: boolean; // Utilisez ? pour les propriétés optionnelles
}
```

#### Tests en Continu
```bash
# Tests en mode watch
npm run test:watch

# Tests spécifiques
npm test -- --testPathPattern="neural"

# Couverture
npm run test:coverage
```

#### Linting Automatique
```bash
# Fix automatique
npm run lint:fix

# Vérification manuelle
npm run lint
```

### 3. Commit et Push

#### Format Conventional Commits
```bash
# Types de commits
feat:     # Nouvelle fonctionnalité
fix:      # Correction bug
docs:     # Documentation uniquement
style:    # Formatting, pas de changement code
refactor: # Refactoring sans changement fonctionnel
perf:     # Amélioration performance
test:     # Ajout/modification tests
chore:    # Maintenance, build, etc.

# Exemples
git commit -m "feat(neural): add hebbian learning algorithm"
git commit -m "fix(security): prevent timing attack in crypto validation"
git commit -m "docs(api): update mutation engine documentation"
git commit -m "perf(webgl): optimize batch rendering performance"
```

#### Push et Suivi
```bash
# Push initial
git push -u origin feature/nom-descriptif

# Pushes suivants
git push
```

### 4. Pull Request

#### Avant de Créer la PR
```bash
# Tests complets
npm run test:ci

# Build production
npm run build:all

# Vérification finale
npm run validate:pr-ready
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
```

#### Review Process
1. **CI/CD automatique** : Tests, linting, build
2. **Review communautaire** : Feedback des mainteneurs
3. **Tests manuels** : Validation sur différents environnements
4. **Merge** : Après approbation et tests réussis

## 🏆 Bonnes Pratiques

### Code Quality

#### Sécurité Obligatoire
```typescript
// ❌ INTERDIT - Utilisation de Math.random()
const id = Math.random().toString(36);

// ✅ REQUIS - SecureRandom pour crypto
import { SecureRandom, generateSecureUUID } from '@/shared/utils';
const id = generateSecureUUID();
const random = SecureRandom.random();
```

#### Logging Responsable
```typescript
// ❌ DANGEREUX - Peut exposer des données sensibles
console.log('User data:', userData);

// ✅ SÉCURISÉ - Logger avec sanitisation automatique
import { logger } from '@/shared/utils';
logger.info('Processing user data', { count: userData.length }, 'UserService');
```

#### Types TypeScript Stricts
```typescript
// ✅ Preferred - Types explicites et stricts
interface OrganismMutation {
  readonly id: string;
  readonly type: MutationType;
  readonly timestamp: number;
  readonly effect: MutationEffect;
  readonly fitness: number;
}

// Configuration TypeScript stricte
// tsconfig.json doit avoir strict: true
```

### Architecture

#### Modules Découplés
```typescript
// ✅ Bon découplage avec injection de dépendances
class OrganismService {
  constructor(
    private storage: StorageManager,
    private neural: NeuralMesh,
    private logger: Logger
  ) {}
}
```

#### Communication via Message Bus
```typescript
// ✅ Communication standardisée
import { MessageBus } from '@/shared/messaging';

const messageBus = new MessageBus();
await messageBus.send({
  type: 'EVOLVE_ORGANISM',
  payload: { behaviorData }
});
```

### Tests

#### Couverture Requise
- **Global** : 80% minimum (lines, functions, statements)
- **Core modules** : 85% minimum
- **Utils** : 90% minimum
- **Nouvelles fonctionnalités** : 90% minimum

#### Structure des Tests
```typescript
// __tests__/core/OrganismCore.test.ts
import { OrganismCore } from '@/core/OrganismCore';

describe('OrganismCore', () => {
  let organism: OrganismCore;

  beforeEach(() => {
    organism = new OrganismCore({
      traits: mockTraits(),
      storage: mockStorage(),
      neural: mockNeuralMesh()
    });
  });

  describe('evolve()', () => {
    it('should evolve based on behavior data', () => {
      const behaviorData = [mockBehaviorData()];
      const result = organism.evolve(behaviorData);
      
      expect(result.mutations).toHaveLength(1);
      expect(result.fitness).toBeGreaterThan(0);
    });
  });
});
```

## 🚨 Problèmes Courants à Éviter

### ❌ Erreurs Techniques

#### Sécurité
- **Math.random() usage** : Toujours utiliser SecureRandom
- **Console.log avec données** : Utiliser le logger sécurisé
- **Hardcoded secrets** : Utiliser variables d'environnement
- **Validation manquante** : Valider toutes les entrées utilisateur

#### Performance
- **Memory leaks** : Toujours nettoyer les event listeners
- **Blocking operations** : Utiliser async/await et web workers
- **DOM manipulation** : Minimiser les accès DOM coûteux
- **Large bundles** : Code splitting et lazy loading

#### Types TypeScript
- **Any usage** : Éviter `any`, utiliser types stricts
- **Missing generics** : Utiliser generics pour réutilisabilité
- **Loose interfaces** : Propriétés obligatoires vs optionnelles

### ❌ Erreurs Processus

#### Pull Requests
- **Trop large** : PR > 500 lignes difficile à reviewer
- **Mixte** : Bug fix + nouvelle feature dans même PR
- **Pas de tests** : Code sans tests associés
- **Description vague** : "Fix stuff" n'aide personne

#### Communication
- **Pas de discussion** : Implémenter sans validation design
- **Assumptions** : Supposer requirements sans clarification
- **Silence** : Ne pas répondre aux comments de review

## 📊 Métriques de Qualité

### Code Coverage
```bash
# Générer rapport de couverture
npm run test:coverage

# Vérifier les seuils
npm run test:coverage:check
```

### Performance Benchmarks
```bash
# Lancer les benchmarks
npm run benchmark

# Profiling mémoire
npm run profile:memory
```

### Security Audit
```bash
# Audit sécurité
npm run security:audit

# Scan des vulnérabilités
npm audit
```

## 🎯 Roadmap Contributions

### Priorités Actuelles (2024-2025)

**Phase 4 - Optimisation Ultime** :
- [ ] Machine Learning avancé et algorithmes distribués
- [ ] Optimisation GPU et calculs parallèles masifs
- [ ] Intelligence collective étendue
- [ ] Intégration backend complète avec API REST

**Fonctionnalités Demandées** :
- [ ] Support multi-navigateur (Firefox, Safari)
- [ ] Application mobile companion
- [ ] Plugins tiers et marketplace
- [ ] Traductions multilingues
- [ ] Mode offline avancé

### Comment Contribuer aux Priorités

1. **Consulter les Issues** étiquetées "help wanted"
2. **Participer aux Discussions** sur les nouvelles fonctionnalités
3. **Proposer des RFC** pour changements majeurs
4. **Tester les features beta** et donner feedback

## 📚 Ressources pour Contributeurs

### Documentation Technique
- **[Architecture](Architecture)** : Design système complet
- **[API Reference](API-Reference)** : Documentation API
- **[Developer Guide](Developer-Guide)** : Setup développement

### Outils et Scripts
```bash
# Scripts utiles pour contributeurs
npm run dev:setup        # Setup complet environnement dev
npm run validate:all     # Validation complète avant PR
npm run generate:docs    # Génération documentation
npm run profile:app      # Profiling performance
```

### Communauté
- **GitHub Discussions** : Questions générales et idées
- **Issues** : Bugs et feature requests
- **Code Reviews** : Apprentissage par les reviews
- **Mentoring** : Programme mentor/mentee informel

## 🙏 Reconnaissance

### Contributeurs Réguliers
Les contributeurs actifs reçoivent :
- **Badge Contributor** dans le README
- **Access privilégié** aux versions beta
- **Participation** aux décisions architecture
- **Reconnaissance** dans les release notes

### Wall of Fame
Contributeurs ayant fait un impact significatif :
- Corrections majeures de sécurité
- Fonctionnalités importantes
- Amélioration significative de performance
- Documentation de référence

## 📞 Support Contributeurs

### Aide Technique
- **[Troubleshooting](Troubleshooting)** : Guide dépannage développeur
- **GitHub Issues** : Tag `question` pour aide technique
- **Discussions** : Échanges ouverts avec la communauté

### Processus de Contribution
- **Documentation** : Ce guide et guides liés
- **Mentoring** : Contributeurs expérimentés disponibles
- **Office Hours** : Sessions Q&A régulières (annoncées)

---

**Prêt à contribuer ?** 🚀

[**🐛 Chercher une Issue**](https://github.com/pinfada/SYMBIONT/issues?q=is%3Aopen+is%3Aissue+label%3A%22help+wanted%22) | [**💡 Proposer une Idée**](https://github.com/pinfada/SYMBIONT/discussions) | [**📖 Lire le Developer Guide**](Developer-Guide)