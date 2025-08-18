# 🛠️ Configuration Environnement Développeur SYMBIONT

## 🎯 Prérequis

### Outils Requis
```bash
# Node.js LTS (18+)
node --version  # ≥ 18.0.0
npm --version   # ≥ 9.0.0

# Git
git --version  # ≥ 2.30.0

# Chrome pour tests
google-chrome --version  # ≥ 90.0.0
```

### Éditeur Recommandé
**Visual Studio Code** avec extensions :
- TypeScript and JavaScript Language Features
- ESLint
- Prettier
- Chrome Debugger
- GitLens
- Jest Runner

## 📥 Installation

### 1. Clonage du Projet
```bash
# Cloner le repository
git clone https://github.com/your-org/symbiont.git
cd symbiont

# Vérifier l'intégrité
git log --oneline -5
```

### 2. Installation Dépendances
```bash
# Dépendances principales
npm install

# Dépendances backend (optionnel)
cd backend && npm install && cd ..

# Vérification
npm list --depth=0
```

### 3. Configuration Environnement
```bash
# Fichiers d'environnement
cp .env.example .env.development
cp .env.production.example .env.production

# Backend (si utilisé)
cd backend
cp .env.example .env
cd ..
```

#### Variables Critiques
```bash
# .env.development
NODE_ENV=development
SYMBIONT_DEBUG=true
SHOW_PERFORMANCE_LOGS=true
JEST_VERBOSE=true

# .env.production
NODE_ENV=production
SYMBIONT_DEBUG=false
```

### 4. Validation Installation
```bash
# Test environnement
node scripts/validate-environment.js

# Validation sécurité
node scripts/validate-security.js

# Tests rapides
npm test -- --testNamePattern="basic"
```

## 🏗️ Commandes Développement

### Build et Watch
```bash
# Développement avec hot reload
npm run dev

# Build complet
npm run build:all

# Build extension uniquement
npm run build

# Build backend uniquement
cd backend && npm run build
```

### Tests
```bash
# Suite complète
npm test

# Tests avec couverture
npm run test:ci

# Mode watch
npm run test:watch

# Tests E2E
npm run test:e2e

# Tests spécifiques
npm test -- __tests__/security/
```

### Qualité Code
```bash
# Linting
npm run lint

# Correction automatique
npm run lint:fix

# Validation TypeScript
npx tsc --noEmit

# Validation manifest
npm run check-manifest
```

## 🔧 Configuration VSCode

### Settings Recommandées
```json
// .vscode/settings.json
{
  "typescript.preferences.importModuleSpecifier": "relative",
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "jest.autoRun": "watch",
  "jest.showCoverageOnLoad": true,
  "files.exclude": {
    "**/node_modules": true,
    "**/dist": true,
    "**/.nyc_output": true,
    "**/coverage": true
  }
}
```

### Extensions Pack
```json
// .vscode/extensions.json
{
  "recommendations": [
    "ms-vscode.vscode-typescript-next",
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "ms-vscode.vscode-chrome-debug",
    "eamodio.gitlens",
    "orta.vscode-jest"
  ]
}
```

### Tasks de Build
```json
// .vscode/tasks.json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "build:dev",
      "type": "npm",
      "script": "dev",
      "group": {
        "kind": "build",
        "isDefault": true
      }
    },
    {
      "label": "test:watch",
      "type": "npm", 
      "script": "test:watch",
      "group": "test"
    }
  ]
}
```

## 🐛 Debug Configuration

### Chrome Extension Debugging
```json
// .vscode/launch.json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug Extension",
      "type": "chrome",
      "request": "launch",
      "url": "chrome://extensions/",
      "webRoot": "${workspaceFolder}/src",
      "sourceMapPathOverrides": {
        "webpack://symbiont/*": "${workspaceFolder}/src/*"
      }
    }
  ]
}
```

### Node.js Scripts Debugging
```json
{
  "name": "Debug Scripts",
  "type": "node",
  "request": "launch",
  "program": "${workspaceFolder}/scripts/validate-security.js",
  "console": "integratedTerminal",
  "env": {
    "NODE_ENV": "development"
  }
}
```

## 🔌 Installation Extension Développement

### Mode Développeur Chrome
1. Ouvrir `chrome://extensions/`
2. Activer "Mode développeur"
3. Cliquer "Charger l'extension non empaquetée"
4. Sélectionner le dossier `dist/`

### Hot Reload Setup
```bash
# Terminal 1 : Build watch
npm run dev

# Terminal 2 : Tests watch
npm run test:watch

# Extension se recharge automatiquement
```

### Debugging Avancé
```javascript
// Dans le code source
if (process.env.NODE_ENV === 'development') {
  console.log('Debug info:', data);
  debugger; // Point d'arrêt
}

// Logs conditionnels
logger.debug('Performance metrics', metrics, 'perf-monitor');
```

## 📊 Outils Monitoring

### Performance Profiling
```bash
# Benchmark performance
node scripts/performance-benchmark.js

# Profiling mémoire
node --inspect scripts/memory-profile.js

# Analyse bundle
npm run analyze-bundle
```

### Coverage Reports
```bash
# Génération coverage
npm run test:ci

# Rapport HTML
open coverage/html/index.html

# Rapport modulaire
node scripts/generate-coverage-report.js
```

## 🔄 Workflow Git

### Branches Standards
```bash
# Feature branch
git checkout -b feature/secure-random-optimization

# Bugfix branch
git checkout -b bugfix/memory-leak-webgl

# Hotfix branch
git checkout -b hotfix/security-patch
```

### Commit Conventions
```bash
# Format des commits
feat: add neural mesh caching system
fix: resolve WebGL memory leak
docs: update API documentation
test: add SecureRandom performance tests
refactor: optimize organism serialization
```

### Pre-commit Hooks
```bash
# Installation
npm install --save-dev husky lint-staged

# Configuration automatique
npx husky install
npx husky add .husky/pre-commit "npm run lint"
```

## 🧪 Tests Locaux Extension

### Installation Test
```bash
# Build extension
npm run build

# Charger dans Chrome
# chrome://extensions/ > Load unpacked > dist/
```

### Tests Fonctionnels
```bash
# Vérifier popup
# Cliquer sur icône extension

# Tester content script
# Naviguer sur une page web

# Vérifier background
# chrome://extensions/ > inspect background page
```

### Tests Performance
```bash
# Monitoring mémoire
# Chrome Task Manager (Shift+Esc)

# Profiling performance
# DevTools > Performance tab

# Analyse réseau
# DevTools > Network tab
```

## 🚨 Dépannage Courant

### Problèmes Build
```bash
# Cache cleaning
npm run clean
rm -rf node_modules package-lock.json
npm install

# Rebuild complet
npm run build -- --clean
```

### Problèmes TypeScript
```bash
# Vérification types
npx tsc --noEmit --listFiles

# Regénération types
npm run type-check

# Reset TypeScript service
# VSCode: Ctrl+Shift+P > "TypeScript: Restart TS Server"
```

### Problèmes Extension
```bash
# Rechargement extension
# chrome://extensions/ > Reload

# Reset données développement
# DevTools > Application > Storage > Clear

# Logs background
# chrome://extensions/ > Inspect background page
```

## 📚 Ressources Développement

### Documentation Technique
- [Architecture](../technical/architecture.md)
- [API Messages](../technical/api-messages.md)
- [Security Guide](../technical/security.md)

### Outils Externes
- [Chrome Extension API](https://developer.chrome.com/docs/extensions/)
- [WebGL Reference](https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)

### Support Communauté
- [GitHub Issues](https://github.com/your-org/symbiont/issues)
- [Discord Développeurs](https://discord.gg/symbiont-dev)
- [Stack Overflow Tag](https://stackoverflow.com/questions/tagged/symbiont)

---

**Environnement configuré avec succès ! 🚀**

*Vous êtes maintenant prêt à contribuer au projet SYMBIONT.*