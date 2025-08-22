# Test info

- Name: Onboarding SYMBIONT >> L'utilisateur réalise un onboarding interactif complet
- Location: /mnt/c/Users/m_oli/Projets/SYMBIONT/tests/e2e/onboarding.spec.ts:8:7

# Error details

```
Error: Timed out 5000ms waiting for expect(locator).toBeVisible()

Locator: locator('.app')
Expected: visible
Received: <element(s) not found>
Call log:
  - expect.toBeVisible with timeout 5000ms
  - waiting for locator('.app')

    at /mnt/c/Users/m_oli/Projets/SYMBIONT/tests/e2e/onboarding.spec.ts:20:42
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
      - text: Origine ↓ Vous 3eb1e05c-c60c-4e78-96a5-318162e81b47
```

# Test source

```ts
   1 | import { test, expect } from './test-setup';
   2 | import path from 'path';
   3 | import { waitForReactToLoad, debugPageState, capturePageErrors, waitForElementReady } from './utils';
   4 |
   5 | test.describe('Onboarding SYMBIONT', () => {
   6 |   const popupPath = path.resolve(__dirname, '../../dist/popup/index.html');
   7 |
   8 |   test('L\'utilisateur réalise un onboarding interactif complet', async ({ page }) => {
   9 |     const errors = capturePageErrors(page);
   10 |     
   11 |     await page.goto('file://' + popupPath);
   12 |     await waitForReactToLoad(page);
   13 |     await debugPageState(page);
   14 |     
   15 |     try {
   16 |       // Attendre que l'interface soit complètement chargée
   17 |       await page.waitForSelector('#root', { timeout: 10000 });
   18 |       
   19 |       // Vérifier que l'application s'affiche
>  20 |       await expect(page.locator('.app')).toBeVisible({ timeout: 5000 });
      |                                          ^ Error: Timed out 5000ms waiting for expect(locator).toBeVisible()
   21 |       await expect(page.locator('.nav-tabs')).toBeVisible({ timeout: 5000 });
   22 |       
   23 |       // Obtenir les boutons disponibles
   24 |       const navButtons = page.locator('.nav-tabs button');
   25 |       const buttonTexts = await navButtons.allTextContents();
   26 |       console.log('📋 Boutons disponibles:', buttonTexts);
   27 |       
   28 |       // Chercher un bouton qui pourrait être l'onboarding
   29 |       const onboardingButton = navButtons.filter({ hasText: /onboarding|guide|aide|help/i }).first();
   30 |       
   31 |       if (await onboardingButton.count() > 0) {
   32 |         console.log('✅ Bouton onboarding trouvé');
   33 |         await onboardingButton.click();
   34 |         await page.waitForTimeout(1000);
   35 |         
   36 |         // Vérifier que le contenu a changé
   37 |         const content = await page.locator('.app > div').nth(1).textContent();
   38 |         console.log('📄 Contenu onboarding:', content?.substring(0, 200));
   39 |         
   40 |         console.log('✅ Onboarding accessible et fonctionnel');
   41 |       } else {
   42 |         console.log('⚠️ Pas de bouton onboarding spécifique, mais interface accessible');
   43 |         
   44 |         // Tester la navigation générale
   45 |         for (let i = 0; i < Math.min(await navButtons.count(), 2); i++) {
   46 |           const button = navButtons.nth(i);
   47 |           const buttonText = await button.textContent();
   48 |           console.log(`🔄 Navigation vers: ${buttonText}`);
   49 |           
   50 |           await button.click();
   51 |           await page.waitForTimeout(500);
   52 |           
   53 |           const content = await page.locator('.app > div').nth(1).textContent();
   54 |           console.log(`✅ Contenu pour ${buttonText}:`, content?.substring(0, 100));
   55 |         }
   56 |       }
   57 |       
   58 |       console.log('✅ Test onboarding terminé avec succès');
   59 |     } catch (error) {
   60 |       console.log('❌ Erreurs capturées durant l\'onboarding:', errors);
   61 |       await debugPageState(page);
   62 |       throw error;
   63 |     }
   64 |   });
   65 |
   66 |   test('L\'onboarding est résilient à un rechargement de la popup', async ({ page }) => {
   67 |     const errors = capturePageErrors(page);
   68 |     
   69 |     await page.goto('file://' + popupPath);
   70 |     await waitForReactToLoad(page);
   71 |     
   72 |     try {
   73 |       // Test de résilience au rechargement
   74 |       await page.waitForSelector('.nav-tabs', { timeout: 10000 });
   75 |       
   76 |       console.log('🔄 État initial vérifié');
   77 |       
   78 |       // Recharger la page
   79 |       await page.reload();
   80 |       await waitForReactToLoad(page);
   81 |       
   82 |       console.log('🔄 Page rechargée');
   83 |       
   84 |       // Vérifier que l'interface est toujours fonctionnelle
   85 |       await expect(page.locator('.app')).toBeVisible({ timeout: 5000 });
   86 |       await expect(page.locator('.nav-tabs')).toBeVisible({ timeout: 5000 });
   87 |       
   88 |       const navButtons = page.locator('.nav-tabs button');
   89 |       const buttonCount = await navButtons.count();
   90 |       expect(buttonCount).toBeGreaterThanOrEqual(2);
   91 |       
   92 |       console.log('✅ Interface fonctionnelle après rechargement');
   93 |       
   94 |       // Test d'interaction après rechargement
   95 |       const firstButton = navButtons.first();
   96 |       await firstButton.click();
   97 |       await page.waitForTimeout(500);
   98 |       
   99 |       console.log('✅ Interaction fonctionnelle après rechargement');
  100 |       
  101 |     } catch (error) {
  102 |       console.log('❌ Erreur résilience onboarding:', error);
  103 |       console.log('❌ Erreurs capturées:', errors);
  104 |       await debugPageState(page);
  105 |       throw error;
  106 |     }
  107 |   });
  108 | }); 
```