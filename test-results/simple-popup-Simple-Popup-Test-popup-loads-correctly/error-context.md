# Test info

- Name: Simple Popup Test >> popup loads correctly
- Location: /mnt/c/Users/m_oli/Projets/SYMBIONT/tests/e2e/simple-popup.spec.ts:6:7

# Error details

```
Error: Timed out 5000ms waiting for expect(locator).toBeVisible()

Locator: locator('#root')
Expected: visible
Received: hidden
Call log:
  - expect.toBeVisible with timeout 5000ms
  - waiting for locator('#root')
    9 × locator resolved to <div id="root"></div>
      - unexpected value "hidden"

    at /mnt/c/Users/m_oli/Projets/SYMBIONT/tests/e2e/simple-popup.spec.ts:20:41
```

# Test source

```ts
   1 | import { test, expect } from '@playwright/test';
   2 | import path from 'path';
   3 |
   4 | test.describe('Simple Popup Test', () => {
   5 |   const popupPath = path.resolve(__dirname, '../../dist/popup.html');
   6 |   test('popup loads correctly', async ({ page }) => {
   7 |     // Enable console logging
   8 |     page.on('console', msg => console.log('Console:', msg.text()));
   9 |     page.on('pageerror', error => console.log('Error:', error.message));
  10 |     
  11 |     await page.goto('file://' + popupPath);
  12 |     
  13 |     // Check if HTML loads
  14 |     await expect(page.locator('html')).toHaveAttribute('lang', 'fr');
  15 |     
  16 |     // Check if title is correct  
  17 |     await expect(page).toHaveTitle(/SYMBIONT/);
  18 |     
  19 |     // Check if root div exists
> 20 |     await expect(page.locator('#root')).toBeVisible({ timeout: 5000 });
     |                                         ^ Error: Timed out 5000ms waiting for expect(locator).toBeVisible()
  21 |     
  22 |     console.log('Page URL:', page.url());
  23 |     console.log('Page title:', await page.title());
  24 |   });
  25 | });
```