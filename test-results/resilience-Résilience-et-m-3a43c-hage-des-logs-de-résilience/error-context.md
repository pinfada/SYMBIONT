# Test info

- Name: Résilience et monitoring SYMBIONT >> Affichage des logs de résilience
- Location: /mnt/c/Users/m_oli/Projets/SYMBIONT/tests/e2e/resilience.spec.ts:7:7

# Error details

```
Error: page.click: Test timeout of 30000ms exceeded.
Call log:
  - waiting for locator('text=/Monitoring|Logs/i')

    at /mnt/c/Users/m_oli/Projets/SYMBIONT/tests/e2e/resilience.spec.ts:9:16
```

# Test source

```ts
   1 | import { test, expect } from '@playwright/test';
   2 | import path from 'path';
   3 |
   4 | test.describe('Résilience et monitoring SYMBIONT', () => {
   5 |   const popupPath = path.resolve(__dirname, '../../dist/popup.html');
   6 |
   7 |   test('Affichage des logs de résilience', async ({ page }) => {
   8 |     await page.goto('file://' + popupPath);
>  9 |     await page.click('text=/Monitoring|Logs/i');
     |                ^ Error: page.click: Test timeout of 30000ms exceeded.
  10 |     await expect(page.locator('text=/[ResilientMessageBus]|[HybridStorageManager]|[Perf]/i')).toBeVisible();
  11 |   });
  12 |
  13 |   test('Backup communautaire en cas de panne', async ({ page }) => {
  14 |     await page.goto('file://' + popupPath);
  15 |     await page.click('text=/Réseau|Network/i');
  16 |     await page.click('text=/Backup communautaire|Community backup/i');
  17 |     await expect(page.locator('text=/Backup lancé|Backup started/i')).toBeVisible();
  18 |   });
  19 | }); 
```