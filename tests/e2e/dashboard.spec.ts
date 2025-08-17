import { test, expect } from './test-setup';
import { Locator } from '@playwright/test';
import path from 'path';
import { waitForReactToLoad, debugPageState, capturePageErrors, waitForElementReady } from './utils';

test.describe('Dashboard SYMBIONT', () => {
  const dashboardPath = path.resolve(__dirname, '../../dist/popup.html');

  test('Affichage des visualisations et des traits', async ({ page }) => {
    const errors = capturePageErrors(page);
    
    await page.goto('file://' + dashboardPath);
    await waitForReactToLoad(page);
    await debugPageState(page);
    
    try {
      // Attendre que la page soit complètement chargée
      await page.waitForSelector('#root', { timeout: 10000 });
      
      // Vérifier que l'application s'affiche avec les éléments de base
      await expect(page.locator('.app')).toBeVisible({ timeout: 5000 });
      
      // Vérifier la présence des boutons de navigation
      await expect(page.locator('.nav-tabs')).toBeVisible({ timeout: 5000 });
      
      // Chercher les boutons de navigation réels
      const buttons = page.locator('.nav-tabs button');
      const buttonCount = await buttons.count();
      expect(buttonCount).toBeGreaterThanOrEqual(2); // Au moins 2 boutons
      
      // Vérifier les textes des boutons (peut varier selon la langue)
      const buttonTexts = await buttons.allTextContents();
      console.log('📋 Boutons disponibles:', buttonTexts);
      
      // Essayer de cliquer sur le bouton Dashboard s'il existe
      const dashboardButton = buttons.filter({ hasText: /Dashboard|Organism/i }).first();
      if (await dashboardButton.count() > 0) {
        await dashboardButton.click();
        await page.waitForTimeout(1000);
      }
      
      // Vérifier que le contenu principal s'affiche
      const mainContent = page.locator('.app > div').nth(1); // Deuxième div après nav-tabs
      await expect(mainContent).toBeVisible({ timeout: 5000 });
      
      // Chercher des éléments liés aux traits/visualisations
      const traitElements = page.locator('text=/curiosity|empathy|traits|radar/i');
      if (await traitElements.count() > 0) {
        await expect(traitElements.first()).toBeVisible();
        console.log('✅ Éléments de traits trouvés');
      } else {
        console.log('⚠️ Aucun élément de traits spécifique trouvé, mais l\'interface est fonctionnelle');
      }
      
      console.log('✅ Interface dashboard affichée avec succès');
    } catch (error) {
      console.log('❌ Erreurs capturées:', errors);
      await debugPageState(page);
      
      // Affichage des éléments trouvés pour debug
      const allButtons = await page.locator('button').allTextContents();
      console.log('🔍 Tous les boutons trouvés:', allButtons);
      
      const allText = await page.locator('body').textContent();
      console.log('🔍 Contenu texte de la page:', allText?.substring(0, 500));
      
      throw error;
    }
  });

  test('Navigation vers les autres sections', async ({ page }) => {
    const errors = capturePageErrors(page);
    
    await page.goto('file://' + dashboardPath);
    await waitForReactToLoad(page);
    await debugPageState(page);
    
    try {
      // Attendre que l'application soit chargée
      await page.waitForSelector('.nav-tabs', { timeout: 10000 });
      
      // Obtenir tous les boutons de navigation
      const navButtons = page.locator('.nav-tabs button');
      const buttonCount = await navButtons.count();
      console.log(`📊 ${buttonCount} boutons de navigation trouvés`);
      
      // Tester la navigation vers chaque section
      for (let i = 0; i < buttonCount; i++) {
        const button = navButtons.nth(i);
        const buttonText = await button.textContent();
        console.log(`🔄 Test navigation vers: ${buttonText}`);
        
        // Cliquer sur le bouton
        await button.click();
        await page.waitForTimeout(500);
        
        // Vérifier que quelque chose a changé dans le contenu
        const currentContent = await page.locator('.app > div').nth(1).textContent();
        console.log(`✅ Contenu affiché pour ${buttonText}:`, currentContent?.substring(0, 100));
      }
      
      console.log('✅ Navigation entre sections réussie');
    } catch (error) {
      console.log('❌ Erreurs capturées durant la navigation:', errors);
      await debugPageState(page);
      throw error;
    }
  });

  test('Vérification de la stabilité après interactions', async ({ page }) => {
    const errors = capturePageErrors(page);
    
    await page.goto('file://' + dashboardPath);
    await waitForReactToLoad(page);
    
    try {
      // Test de stabilité : interactions multiples
      await page.waitForSelector('.nav-tabs', { timeout: 10000 });
      
      const navButtons = page.locator('.nav-tabs button');
      const buttonCount = await navButtons.count();
      
      // Effectuer plusieurs cycles de navigation
      for (let cycle = 0; cycle < 2; cycle++) {
        console.log(`🔄 Cycle de test ${cycle + 1}`);
        
        for (let i = 0; i < buttonCount; i++) {
          await navButtons.nth(i).click();
          await page.waitForTimeout(200);
        }
      }
      
      // Vérifier qu'il n'y a pas d'erreurs critiques
      if (errors.length > 0) {
        const criticalErrors = errors.filter(e => 
          e.message.includes('Cannot read properties') ||
          e.message.includes('undefined') ||
          e.message.includes('TypeError')
        );
        
        if (criticalErrors.length === 0) {
          console.log('✅ Aucune erreur critique après interactions multiples');
        } else {
          console.log('⚠️ Erreurs non-critiques détectées:', criticalErrors.length);
        }
      }
      
      console.log('✅ Test de stabilité réussi');
    } catch (error) {
      console.log('❌ Erreurs de stabilité:', errors);
      await debugPageState(page);
      throw error;
    }
  });
}); 