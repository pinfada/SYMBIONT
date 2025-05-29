# Test info

- Name: Intelligence adaptative et ML SYMBIONT >> Prédiction d’action et adaptation
- Location: /mnt/c/Users/m_oli/Projets/SYMBIONT/tests/e2e/intelligence.spec.ts:7:7

# Error details

```
Error: page.click: Test timeout of 30000ms exceeded.
Call log:
  - waiting for locator('text=/Prédiction|Prediction/i')

    at /mnt/c/Users/m_oli/Projets/SYMBIONT/tests/e2e/intelligence.spec.ts:9:16
```

# Test source

```ts
   1 | import { test, expect } from '@playwright/test';
   2 | import path from 'path';
   3 |
   4 | test.describe('Intelligence adaptative et ML SYMBIONT', () => {
   5 |   const popupPath = path.resolve(__dirname, '../../dist/popup.html');
   6 |
   7 |   test('Prédiction d’action et adaptation', async ({ page }) => {
   8 |     await page.goto('file://' + popupPath);
>  9 |     await page.click('text=/Prédiction|Prediction/i');
     |                ^ Error: page.click: Test timeout of 30000ms exceeded.
  10 |     await expect(page.locator('text=/Prochaine action|Next action/i')).toBeVisible();
  11 |     await page.click('text=/Simuler|Simulate/i');
  12 |     await expect(page.locator('text=/Action prédite|Predicted action/i')).toBeVisible();
  13 |   });
  14 |
  15 |   test('Visualisation des métriques ML', async ({ page }) => {
  16 |     await page.goto('file://' + popupPath);
  17 |     await page.click('text=/Monitoring|Logs/i');
  18 |     await expect(page.locator('text=/ML|Machine Learning|Prédiction/i')).toBeVisible();
  19 |   });
  20 | }); 
```