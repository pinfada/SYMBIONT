import { test, expect } from './test-setup';
import path from 'path';
import { waitForReactToLoad, debugPageState } from './utils';

test.describe('Événements mystiques et rituels SYMBIONT', () => {
  const popupPath = path.resolve(__dirname, '../../dist/popup.html');

  test('Déclenchement d’un rituel secret', async ({ page }) => {
    await page.goto('file://' + popupPath);
    await waitForReactToLoad(page, '.mystical-panel');
    await debugPageState(page);
    try {
      await page.click('[data-testid="nav-mystical"]');
      await expect(page.getByTestId('mystical-title')).toBeVisible();
      await page.fill('[data-testid="secret-code-input"]', 'SYMBIOSIS');
      await page.click('[data-testid="trigger-btn"]');
      await expect(page.getByTestId('symbiosis-mode')).toBeVisible();
      console.log('✅ Rituel secret déclenché');
    } catch (error) {
      console.log('❌ Erreur rituel secret:', error);
      await debugPageState(page);
      throw error;
    }
  });

  test('Affichage d’un événement mystique', async ({ page }) => {
    await page.goto('file://' + popupPath);
    await waitForReactToLoad(page, '.mystical-panel');
    await debugPageState(page);
    try {
      await page.click('[data-testid="nav-mystical"]');
      await expect(page.getByTestId('mystical-title')).toBeVisible();
      await page.click('[data-testid="trigger-event-btn"]');
      await expect(page.getByTestId('mystical-event')).toBeVisible();
      console.log('✅ Événement mystique affiché');
    } catch (error) {
      console.log('❌ Erreur événement mystique:', error);
      await debugPageState(page);
      throw error;
    }
  });
}); 