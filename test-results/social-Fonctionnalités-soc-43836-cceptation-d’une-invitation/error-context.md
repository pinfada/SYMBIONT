# Test info

- Name: Fonctionnalités sociales SYMBIONT >> Acceptation d’une invitation
- Location: /mnt/c/Users/m_oli/Projets/SYMBIONT/tests/e2e/social.spec.ts:17:7

# Error details

```
Error: page.click: Test timeout of 30000ms exceeded.
Call log:
  - waiting for locator('text=/Inviter|Invitation/i')

    at /mnt/c/Users/m_oli/Projets/SYMBIONT/tests/e2e/social.spec.ts:19:16
```

# Test source

```ts
   1 | import { test, expect } from '@playwright/test';
   2 | import path from 'path';
   3 |
   4 | test.describe('Fonctionnalités sociales SYMBIONT', () => {
   5 |   const popupPath = path.resolve(__dirname, '../../dist/popup.html');
   6 |
   7 |   test('Génération et partage d’une invitation', async ({ page }) => {
   8 |     await page.goto('file://' + popupPath);
   9 |     await page.click('text=/Inviter|Invitation/i');
  10 |     await page.click('text=/Générer|Generate/i');
  11 |     const code = await page.locator('input[readonly][value]').inputValue();
  12 |     expect(code).toMatch(/[a-z0-9-]{8,}/i);
  13 |     await page.click('text=/Copier|Copy/i');
  14 |     await expect(page.locator('text=/Invitation copiée|Invitation copied/i')).toBeVisible();
  15 |   });
  16 |
  17 |   test('Acceptation d’une invitation', async ({ page }) => {
  18 |     await page.goto('file://' + popupPath);
> 19 |     await page.click('text=/Inviter|Invitation/i');
     |                ^ Error: page.click: Test timeout of 30000ms exceeded.
  20 |     await page.fill('input[name="invitationCode"]', 'TESTCODE123');
  21 |     await page.click('text=/Accepter|Accept/i');
  22 |     await expect(page.locator('text=/Invitation acceptée|Invitation accepted/i')).toBeVisible();
  23 |   });
  24 | }); 
```