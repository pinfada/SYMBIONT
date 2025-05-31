import { test, expect } from './test-setup';
import { Locator } from '@playwright/test';
import path from 'path';
import { waitForReactToLoad, debugPageState } from './utils';

test.describe('Dashboard SYMBIONT', () => {
  const dashboardPath = path.resolve(__dirname, '../../dist/popup.html');

  test('Affichage des visualisations et des traits', async ({ page }) => {
    await page.goto('http://localhost:8080/popup.html');
    await waitForReactToLoad(page, '.dashboard-panel');
    await debugPageState(page);
    try {
      await expect(page.getByTestId('dashboard-title')).toBeVisible({ timeout: 5000 });
      await expect(page.getByTestId('organism-dashboard-title')).toBeVisible({ timeout: 5000 });
      await expect(page.getByTestId('organism-canvas')).toBeVisible();

      await page.waitForFunction(() => {
        const radar = document.querySelector('[data-testid="traits-radar"]');
        if (!radar) return false;
        
        const computedStyle = window.getComputedStyle(radar);
        return computedStyle.display !== 'none' && 
               computedStyle.visibility !== 'hidden' && 
               computedStyle.opacity !== '0';
      }, { timeout: 10000 });

      await expect(page.getByTestId('traits-radar')).toBeVisible({ timeout: 2000 });
      await expect(page.getByText(/Curiosity/i)).toBeVisible();
      await expect(page.getByText(/Empathy/i)).toBeVisible();
      console.log('✅ Visualisations et traits affichés');
    } catch (error) {
      // Debug supplémentaire pour comprendre l'état CSS
      const radarInfo = await page.evaluate(() => {
        const radar = document.querySelector('[data-testid="traits-radar"]');
        if (!radar) return { exists: false };
        
        const style = window.getComputedStyle(radar);
        return {
          exists: true,
          display: style.display,
          visibility: style.visibility,
          opacity: style.opacity,
          parentVisible: radar.parentElement ? window.getComputedStyle(radar.parentElement).display : 'unknown'
        };
      });
      
      console.log('❌ État du radar:', radarInfo);
      console.log('❌ Erreur visualisation/traits:', error);
      await debugPageState(page);
      throw error;
    }
  });

  test('Navigation vers les autres sections', async ({ page }) => {
    await page.goto('http://localhost:8080/popup.html');
    await waitForReactToLoad(page, '.dashboard-panel');
    await debugPageState(page);
    let networkButton: Locator;
    try {
      networkButton = page.getByRole('button', { name: /Réseau|Network/i });
      await expect(networkButton).toBeVisible({ timeout: 2000 });
      console.log('✅ Bouton Réseau trouvé par rôle');
    } catch (error) {
      console.log('❌ Bouton Réseau non trouvé par rôle');
      networkButton = page.locator('button:has-text("Réseau"), button:has-text("Network")').first();
      await expect(networkButton).toBeVisible({ timeout: 2000 });
      console.log('✅ Bouton Réseau trouvé par texte');
    }
    await networkButton.click();
    await expect(page.getByTestId('network-panel')).toBeVisible({ timeout: 3000 });
    console.log('✅ Panel réseau affiché');
    // Retour au dashboard (optionnel)
    const backButton = page.locator('text=/Retour|Back|Dashboard/i').first();
    const backButtonExists = await backButton.isVisible().catch(() => false);
    if (backButtonExists) {
      await backButton.click();
      await expect(page.getByTestId('dashboard-title')).toBeVisible({ timeout: 3000 });
      console.log('✅ Retour au dashboard effectué');
    } else {
      console.log('⚠️  Bouton retour non trouvé, test navigation simple terminé');
    }
  });
}); 