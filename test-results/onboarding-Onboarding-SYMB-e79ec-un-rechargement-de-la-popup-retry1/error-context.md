# Test info

- Name: Onboarding SYMBIONT >> L’onboarding est résilient à un rechargement de la popup
- Location: /mnt/c/Users/m_oli/Projets/SYMBIONT/tests/e2e/onboarding.spec.ts:33:7

# Error details

```
Error: page.click: Test timeout of 30000ms exceeded.
Call log:
  - waiting for locator('text=/Commencer|Start|Démarrer/i')

    at /mnt/c/Users/m_oli/Projets/SYMBIONT/tests/e2e/onboarding.spec.ts:35:16
```

# Test source

```ts
   1 | import { test, expect } from '@playwright/test';
   2 | import path from 'path';
   3 |
   4 | test.describe('Onboarding SYMBIONT', () => {
   5 |   const popupPath = path.resolve(__dirname, '../../dist/popup.html');
   6 |
   7 |   test('L’utilisateur réalise un onboarding complet et accède au dashboard', async ({ page }) => {
   8 |     await page.goto('file://' + popupPath);
   9 |
  10 |     // Vérification du titre d’accueil
  11 |     await expect(page.locator('text=/SYMBIONT/i')).toBeVisible();
  12 |
  13 |     // Démarrage de l’onboarding
  14 |     await page.click('text=/Commencer|Start|Démarrer/i');
  15 |     await expect(page.locator('text=/Bienvenue dans SYMBIONT|Welcome to SYMBIONT/i')).toBeVisible();
  16 |
  17 |     // Navigation étape par étape (exemples génériques à adapter selon le contenu réel)
  18 |     await page.click('text=/Suivant|Next/i');
  19 |     await expect(page.locator('text=/Personnalisation|Profil|Profile/i')).toBeVisible();
  20 |     await page.fill('input[name="username"]', 'TestUserPro');
  21 |     await page.click('text=/Suivant|Next/i');
  22 |
  23 |     // Validation d’une étape clé (ex : consentement)
  24 |     await expect(page.locator('text=/Consentement|Consent/i')).toBeVisible();
  25 |     await page.click('input[type="checkbox"]');
  26 |     await page.click('text=/Valider|Validate|Accepter|Accept/i');
  27 |
  28 |     // Arrivée sur le dashboard
  29 |     await expect(page.locator('text=/Dashboard|Tableau de bord/i')).toBeVisible();
  30 |     await expect(page.locator('text=/TestUserPro/i')).toBeVisible();
  31 |   });
  32 |
  33 |   test('L’onboarding est résilient à un rechargement de la popup', async ({ page }) => {
  34 |     await page.goto('file://' + popupPath);
> 35 |     await page.click('text=/Commencer|Start|Démarrer/i');
     |                ^ Error: page.click: Test timeout of 30000ms exceeded.
  36 |     await page.click('text=/Suivant|Next/i');
  37 |     // Simule un rechargement
  38 |     await page.reload();
  39 |     // Vérifie que l’onboarding reprend à la bonne étape ou affiche un message adapté
  40 |     await expect(page.locator('text=/Personnalisation|Profil|Profile/i')).toBeVisible();
  41 |   });
  42 | }); 
```