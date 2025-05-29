import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('Événements mystiques et rituels SYMBIONT', () => {
  const popupPath = path.resolve(__dirname, '../../dist/popup.html');

  test('Déclenchement d’un rituel secret', async ({ page }) => {
    await page.goto('file://' + popupPath);
    await page.click('text=/Rituels|Rituals/i');
    await page.fill('input[name="secretCode"]', 'SYMBIOSIS');
    await page.click('text=/Déclencher|Trigger/i');
    await expect(page.locator('text=/Mode Symbiose|Symbiosis Mode/i')).toBeVisible();
  });

  test('Affichage d’un événement mystique', async ({ page }) => {
    await page.goto('file://' + popupPath);
    await page.click('text=/Mystique|Mystical/i');
    await page.click('text=/Déclencher événement|Trigger event/i');
    await expect(page.locator('text=/Événement mystique|Mystical event/i')).toBeVisible();
  });
}); 