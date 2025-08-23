// Test direct de l'extension avec setup minimal
import { test, expect } from '@playwright/test';
import { chromium, BrowserContext } from '@playwright/test';
import path from 'path';

test.describe('Extension Test Direct', () => {
  test('Extension se charge correctement', async () => {
    const extensionPath = path.resolve(__dirname, '../../dist');
    
    // Lancer Chrome avec l'extension
    const browser = await chromium.launch({
      headless: false,
      args: [
        `--load-extension=${extensionPath}`,
        `--disable-extensions-except=${extensionPath}`,
        '--disable-web-security',
        '--no-sandbox'
      ]
    });

    const context = await browser.newContext();
    const page = await context.newPage();

    try {
      // D'abord, détecter l'ID réel de l'extension
      await page.goto('chrome://extensions/');
      await page.waitForTimeout(2000);
      
      // Extraire l'ID de l'extension SYMBIONT
      const extensionInfo = await page.evaluate(() => {
        const extensions = [];
        // Chercher les éléments d'extension sur la page
        document.querySelectorAll('extensions-item').forEach(item => {
          const name = item.shadowRoot?.querySelector('#name')?.textContent;
          const id = item.getAttribute('id');
          extensions.push({ name, id });
        });
        return extensions;
      });
      
      console.log('Extensions détectées:', extensionInfo);
      
      const symbiontExt = extensionInfo.find(ext => 
        ext.name && ext.name.includes('SYMBIONT')
      );
      
      if (!symbiontExt) {
        throw new Error('Extension SYMBIONT non trouvée. Extensions disponibles: ' + 
          JSON.stringify(extensionInfo));
      }
      
      const extensionId = symbiontExt.id;
      console.log('Extension SYMBIONT trouvée avec ID:', extensionId);
      
      const popupUrl = `chrome-extension://${extensionId}/popup/index.html`;
      
      console.log('Tentative d\'accès au popup:', popupUrl);
      await page.goto(popupUrl);
      
      // Attendre que la page se charge
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(3000);
      
      // Vérifier le titre
      const title = await page.title();
      console.log('Titre de la page:', title);
      expect(title).toContain('SYMBIONT');
      
      // Vérifier l'existence du root div
      const rootExists = await page.locator('#root').count() > 0;
      console.log('Root div existe:', rootExists);
      expect(rootExists).toBe(true);
      
      // Vérifier si React s'est chargé
      const reactLoaded = await page.evaluate(() => {
        const root = document.getElementById('root');
        return {
          rootExists: !!root,
          hasContent: root ? root.children.length > 0 : false,
          innerHTML: root ? root.innerHTML.substring(0, 200) : 'NO_ROOT'
        };
      });
      
      console.log('État React:', reactLoaded);
      
      // Screenshot pour debug
      await page.screenshot({ path: 'test-results/extension-popup-debug.png' });
      
    } catch (error) {
      console.error('Erreur test:', error);
      // Screenshot d'erreur
      await page.screenshot({ path: 'test-results/extension-error-debug.png' });
      throw error;
    } finally {
      await browser.close();
    }
  });
});