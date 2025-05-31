# Test info

- Name: Dashboard SYMBIONT >> Affichage des visualisations et des traits
- Location: /mnt/c/Users/m_oli/Projets/SYMBIONT/tests/e2e/dashboard.spec.ts:9:7

# Error details

```
Error: Timed out 2000ms waiting for expect(locator).toBeVisible()

Locator: getByTestId('traits-radar')
Expected: visible
Received: hidden
Call log:
  - expect.toBeVisible with timeout 2000ms
  - waiting for getByTestId('traits-radar')
    6 × locator resolved to <svg class="radar-chart" viewBox="0 0 200 200" data-testid="traits-radar">…</svg>
      - unexpected value "hidden"

    at /mnt/c/Users/m_oli/Projets/SYMBIONT/tests/e2e/dashboard.spec.ts:28:54
```

# Page snapshot

```yaml
- navigation:
  - img "SYMBIONT"
  - button "Organisme": 🧬
  - button "Statistiques": 📊
  - button "Paramètres": ⚙️
  - button "Réseau": 🌐
- main:
  - navigation:
    - button "Dashboard"
    - button "Réseau"
    - button "Onboarding"
    - button "Prédiction"
    - button "Rituels"
    - button "Monitoring"
    - button "Inviter"
  - heading "Dashboard|Tableau de bord" [level=2]
  - paragraph: Bienvenue sur le dashboard principal de Symbiont.
  - heading "État de l'organisme" [level=3]
  - list:
    - listitem:
      - text: "Connexions réseau :"
      - strong: "4"
    - listitem:
      - text: "Modules actifs :"
      - strong: Intelligence, Social, Monitoring
    - listitem: "Statut du réseau : Connecté"
  - heading "Accès rapide" [level=3]
  - button "Voir le réseau"
  - button "Statistiques"
  - button "Paramètres"
  - button "Prédiction"
  - button "Rituels"
  - button "Monitoring"
  - button "Inviter"
  - emphasis: Votre organisme évolue en symbiose avec le réseau.
  - heading "Tableau de bord de l'organisme" [level=2]
  - text: Génération 1 Signature ADN MOCKDNA... Mutations 0
  - img
  - text: 50Consciousness
  - img: Curiosity Focus Rhythm Empathy Creativity
  - heading "Évolution de l'organisme" [level=3]
  - list:
    - listitem: ✨ 5/24/2025, 6:17:52 PM L'organisme a été activé.
    - listitem: "🧬 5/25/2025, 6:17:52 PM Mutation visuelle : variation de couleur."
    - listitem: "🧬 5/27/2025, 6:17:52 PM Mutation cognitive rare : éveil de la conscience."
    - listitem: 🔗 5/28/2025, 6:17:52 PM Invitation transmise à un autre utilisateur.
    - listitem: "🧬 5/29/2025, 6:17:52 PM Mutation comportementale : curiosité accrue."
    - listitem: "🧬 5/30/2025, 6:17:52 PM Mutation visuelle : motif fractal généré."
  - heading "Carte de transmission" [level=3]
  - text: Origine ↓ Vous ABC123
```

# Test source

```ts
   1 | import { test, expect } from './test-setup';
   2 | import { Locator } from '@playwright/test';
   3 | import path from 'path';
   4 | import { waitForReactToLoad, debugPageState } from './utils';
   5 |
   6 | test.describe('Dashboard SYMBIONT', () => {
   7 |   const dashboardPath = path.resolve(__dirname, '../../dist/popup.html');
   8 |
   9 |   test('Affichage des visualisations et des traits', async ({ page }) => {
  10 |     await page.goto('http://localhost:8080/popup.html');
  11 |     await waitForReactToLoad(page, '.dashboard-panel');
  12 |     await debugPageState(page);
  13 |     try {
  14 |       await expect(page.getByTestId('dashboard-title')).toBeVisible({ timeout: 5000 });
  15 |       await expect(page.getByTestId('organism-dashboard-title')).toBeVisible({ timeout: 5000 });
  16 |       await expect(page.getByTestId('organism-canvas')).toBeVisible();
  17 |
  18 |       await page.waitForFunction(() => {
  19 |         const radar = document.querySelector('[data-testid="traits-radar"]');
  20 |         if (!radar) return false;
  21 |         
  22 |         const computedStyle = window.getComputedStyle(radar);
  23 |         return computedStyle.display !== 'none' && 
  24 |                computedStyle.visibility !== 'hidden' && 
  25 |                computedStyle.opacity !== '0';
  26 |       }, { timeout: 10000 });
  27 |
> 28 |       await expect(page.getByTestId('traits-radar')).toBeVisible({ timeout: 2000 });
     |                                                      ^ Error: Timed out 2000ms waiting for expect(locator).toBeVisible()
  29 |       await expect(page.getByText(/Curiosity/i)).toBeVisible();
  30 |       await expect(page.getByText(/Empathy/i)).toBeVisible();
  31 |       console.log('✅ Visualisations et traits affichés');
  32 |     } catch (error) {
  33 |       // Debug supplémentaire pour comprendre l'état CSS
  34 |       const radarInfo = await page.evaluate(() => {
  35 |         const radar = document.querySelector('[data-testid="traits-radar"]');
  36 |         if (!radar) return { exists: false };
  37 |         
  38 |         const style = window.getComputedStyle(radar);
  39 |         return {
  40 |           exists: true,
  41 |           display: style.display,
  42 |           visibility: style.visibility,
  43 |           opacity: style.opacity,
  44 |           parentVisible: radar.parentElement ? window.getComputedStyle(radar.parentElement).display : 'unknown'
  45 |         };
  46 |       });
  47 |       
  48 |       console.log('❌ État du radar:', radarInfo);
  49 |       console.log('❌ Erreur visualisation/traits:', error);
  50 |       await debugPageState(page);
  51 |       throw error;
  52 |     }
  53 |   });
  54 |
  55 |   test('Navigation vers les autres sections', async ({ page }) => {
  56 |     await page.goto('http://localhost:8080/popup.html');
  57 |     await waitForReactToLoad(page, '.dashboard-panel');
  58 |     await debugPageState(page);
  59 |     let networkButton: Locator;
  60 |     try {
  61 |       networkButton = page.getByRole('button', { name: /Réseau|Network/i });
  62 |       await expect(networkButton).toBeVisible({ timeout: 2000 });
  63 |       console.log('✅ Bouton Réseau trouvé par rôle');
  64 |     } catch (error) {
  65 |       console.log('❌ Bouton Réseau non trouvé par rôle');
  66 |       networkButton = page.locator('button:has-text("Réseau"), button:has-text("Network")').first();
  67 |       await expect(networkButton).toBeVisible({ timeout: 2000 });
  68 |       console.log('✅ Bouton Réseau trouvé par texte');
  69 |     }
  70 |     await networkButton.click();
  71 |     await expect(page.getByTestId('network-panel')).toBeVisible({ timeout: 3000 });
  72 |     console.log('✅ Panel réseau affiché');
  73 |     // Retour au dashboard (optionnel)
  74 |     const backButton = page.locator('text=/Retour|Back|Dashboard/i').first();
  75 |     const backButtonExists = await backButton.isVisible().catch(() => false);
  76 |     if (backButtonExists) {
  77 |       await backButton.click();
  78 |       await expect(page.getByTestId('dashboard-title')).toBeVisible({ timeout: 3000 });
  79 |       console.log('✅ Retour au dashboard effectué');
  80 |     } else {
  81 |       console.log('⚠️  Bouton retour non trouvé, test navigation simple terminé');
  82 |     }
  83 |   });
  84 | }); 
```