import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('Onboarding SYMBIONT', () => {
  const popupPath = path.resolve(__dirname, '../../dist/popup.html');

  test('L’utilisateur réalise un onboarding complet et accède au dashboard', async ({ page }) => {
    await page.goto('file://' + popupPath);

    // Vérification du titre d’accueil
    await expect(page.locator('text=/SYMBIONT/i')).toBeVisible();

    // Démarrage de l’onboarding
    await page.click('text=/Commencer|Start|Démarrer/i');
    await expect(page.locator('text=/Bienvenue dans SYMBIONT|Welcome to SYMBIONT/i')).toBeVisible();

    // Navigation étape par étape (exemples génériques à adapter selon le contenu réel)
    await page.click('text=/Suivant|Next/i');
    await expect(page.locator('text=/Personnalisation|Profil|Profile/i')).toBeVisible();
    await page.fill('input[name="username"]', 'TestUserPro');
    await page.click('text=/Suivant|Next/i');

    // Validation d’une étape clé (ex : consentement)
    await expect(page.locator('text=/Consentement|Consent/i')).toBeVisible();
    await page.click('input[type="checkbox"]');
    await page.click('text=/Valider|Validate|Accepter|Accept/i');

    // Arrivée sur le dashboard
    await expect(page.locator('text=/Dashboard|Tableau de bord/i')).toBeVisible();
    await expect(page.locator('text=/TestUserPro/i')).toBeVisible();
  });

  test('L’onboarding est résilient à un rechargement de la popup', async ({ page }) => {
    await page.goto('file://' + popupPath);
    await page.click('text=/Commencer|Start|Démarrer/i');
    await page.click('text=/Suivant|Next/i');
    // Simule un rechargement
    await page.reload();
    // Vérifie que l’onboarding reprend à la bonne étape ou affiche un message adapté
    await expect(page.locator('text=/Personnalisation|Profil|Profile/i')).toBeVisible();
  });
}); 