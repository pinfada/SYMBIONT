import { test, expect } from './test-setup';
import path from 'path';
import { waitForReactToLoad, debugPageState } from './utils';

test.describe('Intelligence adaptative et ML SYMBIONT', () => {
  const popupPath = path.resolve(__dirname, '../../dist/popup.html');

  test('Prédiction d’action et adaptation', async ({ page }) => {
    await page.goto('http://localhost:8080/popup.html');
    await waitForReactToLoad(page, '.prediction-panel');
    await debugPageState(page);
    try {
      await page.click('[data-testid="nav-prediction"]');
      await expect(page.getByTestId('prediction-title')).toBeVisible();
      await page.click('[data-testid="next-action-btn"]');
      await expect(page.getByTestId('next-action')).toBeVisible();
      await page.click('[data-testid="simulate-btn"]');
      await expect(page.getByTestId('predicted-action')).toBeVisible();
      console.log('✅ Prédiction et adaptation OK');
    } catch (error) {
      console.log('❌ Erreur prédiction/adaptation:', error);
      await debugPageState(page);
      throw error;
    }
  });

  test('Visualisation des métriques ML', async ({ page }) => {
    await page.goto('http://localhost:8080/popup.html');
    await waitForReactToLoad(page, '.prediction-panel');
    await debugPageState(page);
    try {
      await page.click('[data-testid="nav-prediction"]');
      await expect(page.getByTestId('ml-metrics-graph')).toBeVisible();
      await expect(page.getByTestId('ml-metrics-log')).toBeVisible();
      console.log('✅ Visualisation ML OK');
    } catch (error) {
      console.log('❌ Erreur visualisation ML:', error);
      await debugPageState(page);
      throw error;
    }
  });
}); 