# SYMBIONT - Guide de Test avec MCP Playwright

Ce guide explique comment tester l'extension Chrome SYMBIONT en utilisant Playwright et le serveur MCP Playwright.

## 📦 Installation

### 1. Installer les dépendances du projet

```bash
npm install
```

### 2. Installer MCP Playwright (déjà fait)

```bash
npm install --save-dev @playwright/mcp
```

### 3. Installer les navigateurs Playwright

```bash
npx playwright install chromium
```

Si vous rencontrez des erreurs 403, essayez:

```bash
# Installer avec dépendances système
npx playwright install chromium --with-deps

# Ou installer tous les navigateurs
npx playwright install
```

## 🏗️ Build de l'extension

Avant de lancer les tests, construisez l'extension:

```bash
npm run build
```

Cela créera le dossier `dist/` avec l'extension packagée.

## 🧪 Exécution des tests

### Tests complets de l'extension Chrome

```bash
# Exécuter tous les tests E2E
npm run test:e2e

# Exécuter uniquement les tests MCP Playwright
npx playwright test tests/e2e/chrome-extension-mcp.spec.ts

# Exécuter avec un navigateur spécifique
npx playwright test tests/e2e/chrome-extension-mcp.spec.ts --project=chromium

# Mode debug
npx playwright test tests/e2e/chrome-extension-mcp.spec.ts --debug

# Avec UI interactive
npx playwright test tests/e2e/chrome-extension-mcp.spec.ts --ui
```

### Tests existants

```bash
# Test d'extension simple
npx playwright test tests/e2e/extension-test.spec.ts

# Test du popup
npx playwright test tests/e2e/simple-popup.spec.ts

# Tous les tests
npm test
```

## 📋 Que testent les tests MCP Playwright?

Le fichier `tests/e2e/chrome-extension-mcp.spec.ts` vérifie:

### ✅ Test 1: Composants complets de l'extension

1. **Chargement de l'extension**
   - Vérifie que l'extension SYMBIONT est chargée dans Chrome
   - Détecte automatiquement l'ID de l'extension
   - Confirme que l'extension est activée

2. **Interface Popup**
   - Vérifie le titre de la page
   - Vérifie la structure DOM (#root)
   - Confirme que React s'est chargé correctement
   - Capture un screenshot du popup

3. **Injection du Content Script**
   - Teste l'injection sur example.com
   - Vérifie la présence de l'objet SYMBIONT dans window
   - Capture un screenshot de la page

4. **Service Worker Background**
   - Vérifie que le service worker est opérationnel
   - Consulte chrome://serviceworker-internals/

5. **Fonctionnalités de stockage**
   - Teste chrome.storage.local
   - Vérifie la lecture/écriture de données

### ✅ Test 2: Visualisation de l'organisme

1. **Rendu WebGL/Canvas**
   - Vérifie la présence d'un élément canvas
   - Teste le contexte WebGL
   - Capture la visualisation

## 📊 Résultats des tests

Les tests génèrent plusieurs artifacts:

```
test-results/
├── symbiont-popup.png              # Screenshot du popup
├── symbiont-content-script.png    # Page avec content script
├── symbiont-visualization.png     # Visualisation de l'organisme
└── symbiont-error.png             # Screenshots d'erreur (si échec)

playwright-report/
└── index.html                     # Rapport HTML interactif
```

Pour voir le rapport HTML:

```bash
npx playwright show-report
```

## 🔧 Configuration

### Playwright Config

Le fichier `playwright.config.ts` configure:

- Tests sur Chromium, Firefox, WebKit
- Tests mobile (Pixel 5, iPhone 12)
- Timeout de 60 secondes
- 2 retries en cas d'échec
- Screenshots automatiques en cas d'échec
- Rapports HTML, liste, et JUnit

### Structure des tests Chrome Extension

Pour tester une extension Chrome avec Playwright:

```typescript
import { chromium } from '@playwright/test';
import path from 'path';

const extensionPath = path.resolve(__dirname, '../../dist');

const browser = await chromium.launch({
  headless: false, // Les extensions nécessitent le mode non-headless
  args: [
    `--load-extension=${extensionPath}`,
    `--disable-extensions-except=${extensionPath}`,
    '--disable-web-security',
    '--no-sandbox'
  ]
});
```

## 🐛 Dépannage

### Erreur: "Executable doesn't exist"

```bash
# Réinstaller les navigateurs
npx playwright install --force
```

### Erreur: Download 403

Cela peut se produire dans des environnements restreints. Solutions:

```bash
# Utiliser un proxy
HTTP_PROXY=http://proxy:port npx playwright install

# Installer avec system dependencies
npx playwright install --with-deps

# Télécharger manuellement
# Voir: https://playwright.dev/docs/browsers#download-from-artifact-repository
```

### Extension ne se charge pas

1. Vérifiez que le build est complet:
   ```bash
   npm run build
   ls -la dist/
   ```

2. Vérifiez le manifest:
   ```bash
   cat dist/manifest.json
   ```

3. Testez manuellement:
   - Ouvrez Chrome
   - Allez à `chrome://extensions/`
   - Activez "Mode développeur"
   - Cliquez "Charger l'extension non empaquetée"
   - Sélectionnez le dossier `dist/`

### Tests en mode headless

⚠️ **Important**: Les tests d'extension Chrome ne peuvent pas s'exécuter en mode headless car Chrome n'autorise pas le chargement d'extensions dans ce mode.

Pour des tests CI/CD, utilisez:
- Tests unitaires (Jest)
- Tests de composants React
- Tests API du backend

## 🚀 Intégration Continue

Pour CI/CD, créez un workflow qui:

1. Installe les dépendances
2. Build l'extension
3. Installe Playwright
4. Exécute les tests avec Xvfb (environnement display virtuel)

Exemple GitHub Actions:

```yaml
- name: Install Playwright
  run: npx playwright install --with-deps chromium

- name: Run tests
  run: xvfb-run npm run test:e2e
```

## 📚 Ressources

- [Playwright Documentation](https://playwright.dev/)
- [MCP Playwright](https://github.com/microsoft/playwright-mcp)
- [Chrome Extension Testing](https://playwright.dev/docs/chrome-extensions)
- [SYMBIONT Documentation](./CLAUDE.md)

## 🎯 Commandes rapides

```bash
# Installation complète
npm install && npx playwright install chromium

# Build + Test
npm run build && npm run test:e2e

# Test unique avec debug
npx playwright test tests/e2e/chrome-extension-mcp.spec.ts --debug

# Voir le rapport
npx playwright show-report

# Nettoyer et recommencer
npm run clean && npm run build && npm run test:e2e
```

## 📝 Notes importantes

1. **Mode non-headless requis**: Les tests d'extension doivent s'exécuter avec `headless: false`
2. **Extension ID dynamique**: L'ID de l'extension change à chaque chargement, les tests le détectent automatiquement
3. **Screenshots**: Tous les tests capturent des screenshots pour le debugging
4. **Timeout**: Tests configurés avec 120 secondes de timeout
5. **Retries**: 2 retries automatiques en cas d'échec

## ✨ Ajout de nouveaux tests

Pour ajouter un nouveau test:

1. Créez un fichier dans `tests/e2e/`
2. Utilisez le pattern d'extension existant
3. Ajoutez des assertions spécifiques
4. N'oubliez pas les screenshots pour le debug
5. Documentez ce que le test vérifie

Exemple:

```typescript
test('should test new feature', async () => {
  const extensionPath = path.resolve(__dirname, '../../dist');
  const browser = await chromium.launch({
    headless: false,
    args: [`--load-extension=${extensionPath}`]
  });

  // Votre test ici

  await browser.close();
});
```

---

**Note**: MCP Playwright est maintenant installé et configuré. Les tests sont prêts à être exécutés localement avec un environnement qui permet le téléchargement des navigateurs.
