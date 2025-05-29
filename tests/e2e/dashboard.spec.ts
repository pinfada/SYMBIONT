import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('Dashboard SYMBIONT', () => {
  const dashboardPath = path.resolve(__dirname, '../../dist/popup.html'); // ou dashboard.html

  test('Affichage des visualisations et des traits', async ({ page }) => {
    await page.goto('file://' + dashboardPath);
    await expect(page.getByTestId('dashboard-title')).toBeVisible();
    await expect(page.locator('canvas, svg')).toBeVisible(); // Graphiques
    await expect(page.locator('text=/curiosité|curiosity/i')).toBeVisible();
    await expect(page.locator('text=/empathie|empathy/i')).toBeVisible();
  });

  test('Navigation vers les autres sections', async ({ page }) => {
    await page.goto('file://' + dashboardPath);
    await page.getByRole('button', { name: /Réseau/i }).click();
    await expect(page.getByTestId('network-panel')).toBeVisible();
    await page.click('text=/Retour|Back/i');
    await expect(page.locator('text=/Dashboard|Tableau de bord/i')).toBeVisible();
  });
}); 