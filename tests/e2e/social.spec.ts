import { test, expect } from './test-setup';
import path from 'path';
import { waitForReactToLoad, debugPageState } from './utils';

test.describe('Fonctionnalites sociales SYMBIONT', () => {
  const popupPath = path.resolve(__dirname, '../../dist/popup/index.html');

  test('Generation et partage d\'une invitation', async ({ page }) => {
    await page.goto('file://' + popupPath);
    await waitForReactToLoad(page, '.social-panel');
    await debugPageState(page);
    try {
      await page.click('[data-testid="nav-social"]');
      await expect(page.getByTestId('social-title')).toBeVisible();
      await page.click('[data-testid="generate-btn"]');
      const code = await page.getByTestId('generated-code').inputValue();
      expect(code).toMatch(/[a-z0-9-]{8,}/i);
      console.log('✅ Invitation generee et partagee');
    } catch (error) {
      console.log('❌ Erreur invitation:', error);
      await debugPageState(page);
      throw error;
    }
  });

  test('Acceptation d\'une invitation', async ({ page }) => {
    await page.goto('file://' + popupPath);
    await waitForReactToLoad(page, '.social-panel');
    await debugPageState(page);
    try {
      await page.click('[data-testid="nav-social"]');
      await expect(page.getByTestId('social-title')).toBeVisible();
      await page.fill('[data-testid="invitation-code-input"]', 'TESTCODE123');
      await page.click('[data-testid="accept-btn"]');
      await expect(page.getByTestId('invitation-accepted')).toBeVisible();
      console.log('✅ Invitation acceptee');
    } catch (error) {
      console.log('❌ Erreur acceptation invitation:', error);
      await debugPageState(page);
      throw error;
    }
  });
}); 