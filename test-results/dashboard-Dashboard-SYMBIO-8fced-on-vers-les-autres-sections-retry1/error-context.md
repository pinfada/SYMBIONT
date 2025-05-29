# Test info

- Name: Dashboard SYMBIONT >> Navigation vers les autres sections
- Location: /mnt/c/Users/m_oli/Projets/SYMBIONT/tests/e2e/dashboard.spec.ts:15:7

# Error details

```
Error: locator.click: Test timeout of 30000ms exceeded.
Call log:
  - waiting for getByRole('button', { name: /Réseau/i })

    at /mnt/c/Users/m_oli/Projets/SYMBIONT/tests/e2e/dashboard.spec.ts:17:57
```

# Test source

```ts
   1 | import { test, expect } from '@playwright/test';
   2 | import path from 'path';
   3 |
   4 | test.describe('Dashboard SYMBIONT', () => {
   5 |   const dashboardPath = path.resolve(__dirname, '../../dist/popup.html'); // ou dashboard.html
   6 |
   7 |   test('Affichage des visualisations et des traits', async ({ page }) => {
   8 |     await page.goto('file://' + dashboardPath);
   9 |     await expect(page.getByTestId('dashboard-title')).toBeVisible();
  10 |     await expect(page.locator('canvas, svg')).toBeVisible(); // Graphiques
  11 |     await expect(page.locator('text=/curiosité|curiosity/i')).toBeVisible();
  12 |     await expect(page.locator('text=/empathie|empathy/i')).toBeVisible();
  13 |   });
  14 |
  15 |   test('Navigation vers les autres sections', async ({ page }) => {
  16 |     await page.goto('file://' + dashboardPath);
> 17 |     await page.getByRole('button', { name: /Réseau/i }).click();
     |                                                         ^ Error: locator.click: Test timeout of 30000ms exceeded.
  18 |     await expect(page.getByTestId('network-panel')).toBeVisible();
  19 |     await page.click('text=/Retour|Back/i');
  20 |     await expect(page.locator('text=/Dashboard|Tableau de bord/i')).toBeVisible();
  21 |   });
  22 | }); 
```