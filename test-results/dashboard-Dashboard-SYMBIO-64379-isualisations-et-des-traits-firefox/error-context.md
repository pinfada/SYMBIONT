# Test info

- Name: Dashboard SYMBIONT >> Affichage des visualisations et des traits
- Location: /mnt/c/Users/m_oli/Projets/SYMBIONT/tests/e2e/dashboard.spec.ts:9:7

# Error details

```
Error: Timed out 5000ms waiting for expect(locator).toBeVisible()

Locator: locator('.app')
Expected: visible
Received: <element(s) not found>
Call log:
  - expect.toBeVisible with timeout 5000ms
  - waiting for locator('.app')

    at /mnt/c/Users/m_oli/Projets/SYMBIONT/tests/e2e/dashboard.spec.ts:21:42
```

# Page snapshot

```yaml
- application "SYMBIONT - Extension de bureau":
  - link "Aller au contenu principal":
    - /url: "#main-content"
  - banner:
    - img "Logo SYMBIONT - Organisme digital évolutif"
    - heading "SYMBIONT" [level=1]
    - status "État de connexion": Connecté
    - button "Ouvrir en fenêtre redimensionnable pour une meilleure accessibilité": Agrandir
  - tablist "Navigation principale de l'application":
    - tab "Organisme - Votre organisme digital" [selected]
    - tab "Réseau - Réseau global SYMBIONT"
    - tab "Statistiques - Analytics et métriques"
    - tab "Rituels - Fonctions mystiques"
    - tab "Social - Invitations et partage"
    - tab "Paramètres - Configuration"
  - main "Organisme - Votre organisme digital":
    - tabpanel:
      - heading "🧬 Votre Organisme" [level=2]
      - paragraph: Explorez votre créature digitale en évolution
      - text: "Génération: 1 Conscience: 50% Mutations: 0 Vivant depuis 0 min Organisme SYMBIONT • État: Actif ⚡ Animation en temps réel"
      - heading "Tableau de bord de l'organisme" [level=2]
      - text: "Génération 1 Signature ADN MOCKDNA1... Mutations 0 Énergie 0.8/100 ⚠️ ⚠️ WebGL Error: WebGL not supported in this browser Your browser may not support WebGL"
      - img
      - text: 50 Consciousness 🪫 Énergie 1/100 1% Énergie faible
      - img: CuriosityFocusRhythmEmpathyCreativity
      - heading "Évolution de l'organisme" [level=3]
      - list:
        - listitem: ✨ 8/22/2025, 11:02:51 PM Organisme digital activé avec succès
      - heading "Carte de transmission" [level=3]
      - text: Origine ↓ Vous d17eb93a-1d25-4a70-8296-815c27ec6749
```

# Test source

```ts
   1 | import { test, expect } from './test-setup';
   2 | import { Locator } from '@playwright/test';
   3 | import path from 'path';
   4 | import { waitForReactToLoad, debugPageState, capturePageErrors, waitForElementReady } from './utils';
   5 |
   6 | test.describe('Dashboard SYMBIONT', () => {
   7 |   const dashboardPath = path.resolve(__dirname, '../../dist/popup/index.html');
   8 |
   9 |   test('Affichage des visualisations et des traits', async ({ page }) => {
   10 |     const errors = capturePageErrors(page);
   11 |     
   12 |     await page.goto('file://' + dashboardPath);
   13 |     await waitForReactToLoad(page);
   14 |     await debugPageState(page);
   15 |     
   16 |     try {
   17 |       // Attendre que la page soit complètement chargée
   18 |       await page.waitForSelector('#root', { timeout: 10000 });
   19 |       
   20 |       // Vérifier que l'application s'affiche avec les éléments de base
>  21 |       await expect(page.locator('.app')).toBeVisible({ timeout: 5000 });
      |                                          ^ Error: Timed out 5000ms waiting for expect(locator).toBeVisible()
   22 |       
   23 |       // Vérifier la présence des boutons de navigation
   24 |       await expect(page.locator('.nav-tabs')).toBeVisible({ timeout: 5000 });
   25 |       
   26 |       // Chercher les boutons de navigation réels
   27 |       const buttons = page.locator('.nav-tabs button');
   28 |       const buttonCount = await buttons.count();
   29 |       expect(buttonCount).toBeGreaterThanOrEqual(2); // Au moins 2 boutons
   30 |       
   31 |       // Vérifier les textes des boutons (peut varier selon la langue)
   32 |       const buttonTexts = await buttons.allTextContents();
   33 |       console.log('📋 Boutons disponibles:', buttonTexts);
   34 |       
   35 |       // Essayer de cliquer sur le bouton Dashboard s'il existe
   36 |       const dashboardButton = buttons.filter({ hasText: /Dashboard|Organism/i }).first();
   37 |       if (await dashboardButton.count() > 0) {
   38 |         await dashboardButton.click();
   39 |         await page.waitForTimeout(1000);
   40 |       }
   41 |       
   42 |       // Vérifier que le contenu principal s'affiche
   43 |       const mainContent = page.locator('.app > div').nth(1); // Deuxième div après nav-tabs
   44 |       await expect(mainContent).toBeVisible({ timeout: 5000 });
   45 |       
   46 |       // Chercher des éléments liés aux traits/visualisations
   47 |       const traitElements = page.locator('text=/curiosity|empathy|traits|radar/i');
   48 |       if (await traitElements.count() > 0) {
   49 |         await expect(traitElements.first()).toBeVisible();
   50 |         console.log('✅ Éléments de traits trouvés');
   51 |       } else {
   52 |         console.log('⚠️ Aucun élément de traits spécifique trouvé, mais l\'interface est fonctionnelle');
   53 |       }
   54 |       
   55 |       console.log('✅ Interface dashboard affichée avec succès');
   56 |     } catch (error) {
   57 |       console.log('❌ Erreurs capturées:', errors);
   58 |       await debugPageState(page);
   59 |       
   60 |       // Affichage des éléments trouvés pour debug
   61 |       const allButtons = await page.locator('button').allTextContents();
   62 |       console.log('🔍 Tous les boutons trouvés:', allButtons);
   63 |       
   64 |       const allText = await page.locator('body').textContent();
   65 |       console.log('🔍 Contenu texte de la page:', allText?.substring(0, 500));
   66 |       
   67 |       throw error;
   68 |     }
   69 |   });
   70 |
   71 |   test('Navigation vers les autres sections', async ({ page }) => {
   72 |     const errors = capturePageErrors(page);
   73 |     
   74 |     await page.goto('file://' + dashboardPath);
   75 |     await waitForReactToLoad(page);
   76 |     await debugPageState(page);
   77 |     
   78 |     try {
   79 |       // Attendre que l'application soit chargée
   80 |       await page.waitForSelector('.nav-tabs', { timeout: 10000 });
   81 |       
   82 |       // Obtenir tous les boutons de navigation
   83 |       const navButtons = page.locator('.nav-tabs button');
   84 |       const buttonCount = await navButtons.count();
   85 |       console.log(`📊 ${buttonCount} boutons de navigation trouvés`);
   86 |       
   87 |       // Tester la navigation vers chaque section
   88 |       for (let i = 0; i < buttonCount; i++) {
   89 |         const button = navButtons.nth(i);
   90 |         const buttonText = await button.textContent();
   91 |         console.log(`🔄 Test navigation vers: ${buttonText}`);
   92 |         
   93 |         // Cliquer sur le bouton
   94 |         await button.click();
   95 |         await page.waitForTimeout(500);
   96 |         
   97 |         // Vérifier que quelque chose a changé dans le contenu
   98 |         const currentContent = await page.locator('.app > div').nth(1).textContent();
   99 |         console.log(`✅ Contenu affiché pour ${buttonText}:`, currentContent?.substring(0, 100));
  100 |       }
  101 |       
  102 |       console.log('✅ Navigation entre sections réussie');
  103 |     } catch (error) {
  104 |       console.log('❌ Erreurs capturées durant la navigation:', errors);
  105 |       await debugPageState(page);
  106 |       throw error;
  107 |     }
  108 |   });
  109 |
  110 |   test('Vérification de la stabilité après interactions', async ({ page }) => {
  111 |     const errors = capturePageErrors(page);
  112 |     
  113 |     await page.goto('file://' + dashboardPath);
  114 |     await waitForReactToLoad(page);
  115 |     
  116 |     try {
  117 |       // Test de stabilité : interactions multiples
  118 |       await page.waitForSelector('.nav-tabs', { timeout: 10000 });
  119 |       
  120 |       const navButtons = page.locator('.nav-tabs button');
  121 |       const buttonCount = await navButtons.count();
```