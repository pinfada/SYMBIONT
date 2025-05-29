import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('Résilience et monitoring SYMBIONT', () => {
  const popupPath = path.resolve(__dirname, '../../dist/popup.html');

  test('Affichage des logs de résilience', async ({ page }) => {
    await page.goto('file://' + popupPath);
    await page.click('text=/Monitoring|Logs/i');
    await expect(page.locator('text=/[ResilientMessageBus]|[HybridStorageManager]|[Perf]/i')).toBeVisible();
  });

  test('Backup communautaire en cas de panne', async ({ page }) => {
    await page.goto('file://' + popupPath);
    await page.click('text=/Réseau|Network/i');
    await page.click('text=/Backup communautaire|Community backup/i');
    await expect(page.locator('text=/Backup lancé|Backup started/i')).toBeVisible();
  });
}); 