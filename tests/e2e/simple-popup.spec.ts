import { test, expect } from '@playwright/test';
import { 
  setupExtensionContext, 
  teardownExtensionContext,
  ExtensionPopupHelper,
  waitForExtensionReady,
  SYMBIONT_EXTENSION_ID
} from './extension-setup';

test.describe('Simple Popup Test', () => {
  test('popup loads correctly', async () => {
    const testContext = await setupExtensionContext({ headless: false });
    
    try {
      // Enable console logging
      testContext.page.on('console', msg => console.log('Console:', msg.text()));
      testContext.page.on('pageerror', error => console.log('Error:', error.message));
      
      const popupHelper = new ExtensionPopupHelper(testContext.page, SYMBIONT_EXTENSION_ID);
      
      // Ouvrir le popup dans le contexte d'extension
      await popupHelper.openPopup();
      
      // Attendre que l'extension soit prête
      await waitForExtensionReady(testContext.page);
      
      // Check if HTML loads
      await expect(testContext.page.locator('html')).toHaveAttribute('lang', 'fr');
      
      // Check if title is correct  
      await expect(testContext.page).toHaveTitle(/SYMBIONT/);
      
      // Check if root div exists and has content
      await testContext.page.waitForSelector('#root', { timeout: 10000 });
      await expect(testContext.page.locator('#root')).toBeVisible();
      
      // Wait for React to load and render content
      await testContext.page.waitForFunction(() => {
        const root = document.getElementById('root');
        return root && root.children.length > 0;
      }, { timeout: 15000 });
      
      console.log('Page URL:', testContext.page.url());
      console.log('Page title:', await testContext.page.title());
      
      // Vérifier que l'extension est dans le bon contexte
      const extensionInfo = await testContext.page.evaluate(() => {
        return {
          extensionId: typeof chrome !== 'undefined' ? chrome.runtime?.id : 'chrome_not_available',
          url: window.location.href,
          isExtensionContext: window.location.protocol === 'chrome-extension:'
        };
      });
      
      console.log('Extension context info:', extensionInfo);
      expect(extensionInfo.isExtensionContext).toBe(true);
      
    } finally {
      await teardownExtensionContext(testContext);
    }
  });
});