# Test info

- Name: Événements mystiques et rituels SYMBIONT >> Déclenchement d’un rituel secret
- Location: /mnt/c/Users/m_oli/Projets/SYMBIONT/tests/e2e/mystical.spec.ts:7:7

# Error details

```
Error: page.click: Test timeout of 30000ms exceeded.
Call log:
  - waiting for locator('text=/Rituels|Rituals/i')

    at /mnt/c/Users/m_oli/Projets/SYMBIONT/tests/e2e/mystical.spec.ts:9:16
```

# Test source

```ts
   1 | import { test, expect } from '@playwright/test';
   2 | import path from 'path';
   3 |
   4 | test.describe('Événements mystiques et rituels SYMBIONT', () => {
   5 |   const popupPath = path.resolve(__dirname, '../../dist/popup.html');
   6 |
   7 |   test('Déclenchement d’un rituel secret', async ({ page }) => {
   8 |     await page.goto('file://' + popupPath);
>  9 |     await page.click('text=/Rituels|Rituals/i');
     |                ^ Error: page.click: Test timeout of 30000ms exceeded.
  10 |     await page.fill('input[name="secretCode"]', 'SYMBIOSIS');
  11 |     await page.click('text=/Déclencher|Trigger/i');
  12 |     await expect(page.locator('text=/Mode Symbiose|Symbiosis Mode/i')).toBeVisible();
  13 |   });
  14 |
  15 |   test('Affichage d’un événement mystique', async ({ page }) => {
  16 |     await page.goto('file://' + popupPath);
  17 |     await page.click('text=/Mystique|Mystical/i');
  18 |     await page.click('text=/Déclencher événement|Trigger event/i');
  19 |     await expect(page.locator('text=/Événement mystique|Mystical event/i')).toBeVisible();
  20 |   });
  21 | }); 
```