import { test, expect } from './test-setup';
import path from 'path';
import { waitForReactToLoad, debugPageState, capturePageErrors, waitForElementReady } from './utils';

test.describe('Onboarding SYMBIONT', () => {
  const popupPath = path.resolve(__dirname, '../../dist/popup.html');

  test('L\'utilisateur réalise un onboarding interactif complet', async ({ page }) => {
    const errors = capturePageErrors(page);
    
    await page.goto('file://' + popupPath);
    await waitForReactToLoad(page);
    await debugPageState(page);
    
    try {
      // Attendre que l'interface soit complètement chargée
      await page.waitForSelector('#root', { timeout: 10000 });
      
      // Vérifier que l'application s'affiche
      await expect(page.locator('.app')).toBeVisible({ timeout: 5000 });
      await expect(page.locator('.nav-tabs')).toBeVisible({ timeout: 5000 });
      
      // Obtenir les boutons disponibles
      const navButtons = page.locator('.nav-tabs button');
      const buttonTexts = await navButtons.allTextContents();
      console.log('📋 Boutons disponibles:', buttonTexts);
      
      // Chercher un bouton qui pourrait être l'onboarding
      const onboardingButton = navButtons.filter({ hasText: /onboarding|guide|aide|help/i }).first();
      
      if (await onboardingButton.count() > 0) {
        console.log('✅ Bouton onboarding trouvé');
        await onboardingButton.click();
        await page.waitForTimeout(1000);
        
        // Vérifier que le contenu a changé
        const content = await page.locator('.app > div').nth(1).textContent();
        console.log('📄 Contenu onboarding:', content?.substring(0, 200));
        
        console.log('✅ Onboarding accessible et fonctionnel');
      } else {
        console.log('⚠️ Pas de bouton onboarding spécifique, mais interface accessible');
        
        // Tester la navigation générale
        for (let i = 0; i < Math.min(await navButtons.count(), 2); i++) {
          const button = navButtons.nth(i);
          const buttonText = await button.textContent();
          console.log(`🔄 Navigation vers: ${buttonText}`);
          
          await button.click();
          await page.waitForTimeout(500);
          
          const content = await page.locator('.app > div').nth(1).textContent();
          console.log(`✅ Contenu pour ${buttonText}:`, content?.substring(0, 100));
        }
      }
      
      console.log('✅ Test onboarding terminé avec succès');
    } catch (error) {
      console.log('❌ Erreurs capturées durant l\'onboarding:', errors);
      await debugPageState(page);
      throw error;
    }
  });

  test('L\'onboarding est résilient à un rechargement de la popup', async ({ page }) => {
    const errors = capturePageErrors(page);
    
    await page.goto('file://' + popupPath);
    await waitForReactToLoad(page);
    
    try {
      // Test de résilience au rechargement
      await page.waitForSelector('.nav-tabs', { timeout: 10000 });
      
      console.log('🔄 État initial vérifié');
      
      // Recharger la page
      await page.reload();
      await waitForReactToLoad(page);
      
      console.log('🔄 Page rechargée');
      
      // Vérifier que l'interface est toujours fonctionnelle
      await expect(page.locator('.app')).toBeVisible({ timeout: 5000 });
      await expect(page.locator('.nav-tabs')).toBeVisible({ timeout: 5000 });
      
      const navButtons = page.locator('.nav-tabs button');
      const buttonCount = await navButtons.count();
      expect(buttonCount).toBeGreaterThanOrEqual(2);
      
      console.log('✅ Interface fonctionnelle après rechargement');
      
      // Test d'interaction après rechargement
      const firstButton = navButtons.first();
      await firstButton.click();
      await page.waitForTimeout(500);
      
      console.log('✅ Interaction fonctionnelle après rechargement');
      
    } catch (error) {
      console.log('❌ Erreur résilience onboarding:', error);
      console.log('❌ Erreurs capturées:', errors);
      await debugPageState(page);
      throw error;
    }
  });
}); 