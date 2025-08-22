import { test, expect } from './test-setup';
import path from 'path';
import { waitForReactToLoad, debugPageState } from './utils';

test.describe('Résilience et monitoring SYMBIONT', () => {
  const popupPath = path.resolve(__dirname, '../../dist/popup/index.html');

  test('Affichage des logs de résilience', async ({ page }) => {
    await page.goto('file://' + popupPath);
    await waitForReactToLoad(page, '.resilience-panel');
    await debugPageState(page);
    try {
      await page.click('text=/Monitoring|Logs/i');
      await expect(page.getByTestId('resilient-messagebus-log')).toBeVisible();
      await expect(page.getByTestId('hybrid-storage-log')).toBeVisible();
      await expect(page.getByTestId('perf-log')).toBeVisible();
      console.log('✅ Logs de résilience affichés');
    } catch (error) {
      console.log('❌ Erreur logs résilience:', error);
      await debugPageState(page);
      throw error;
    }
  });

  test('Backup communautaire en cas de panne', async ({ page }) => {
    await page.goto('file://' + popupPath);
    await waitForReactToLoad(page, '.resilience-panel');
    await debugPageState(page);
    try {
      await page.click('text=/Monitoring|Logs/i');
      await expect(page.locator('text=/Backup communautaire|Community backup/i')).toBeVisible();
      await page.click('text=/Backup communautaire|Community backup/i');
      await expect(page.locator('text=/Backup lancé|Backup started/i')).toBeVisible();
      console.log('✅ Backup communautaire lancé');
    } catch (error) {
      console.log('❌ Erreur backup communautaire:', error);
      await debugPageState(page);
      throw error;
    }
  });
}); 