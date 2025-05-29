import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('Intelligence adaptative et ML SYMBIONT', () => {
  const popupPath = path.resolve(__dirname, '../../dist/popup.html');

  test('Prédiction d’action et adaptation', async ({ page }) => {
    await page.goto('file://' + popupPath);
    await page.click('text=/Prédiction|Prediction/i');
    await expect(page.locator('text=/Prochaine action|Next action/i')).toBeVisible();
    await page.click('text=/Simuler|Simulate/i');
    await expect(page.locator('text=/Action prédite|Predicted action/i')).toBeVisible();
  });

  test('Visualisation des métriques ML', async ({ page }) => {
    await page.goto('file://' + popupPath);
    await page.click('text=/Monitoring|Logs/i');
    await expect(page.locator('text=/ML|Machine Learning|Prédiction/i')).toBeVisible();
  });
}); 