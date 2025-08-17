import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('Simple Popup Test', () => {
  const popupPath = path.resolve(__dirname, '../../dist/popup.html');
  test('popup loads correctly', async ({ page }) => {
    // Enable console logging
    page.on('console', msg => console.log('Console:', msg.text()));
    page.on('pageerror', error => console.log('Error:', error.message));
    
    await page.goto('file://' + popupPath);
    
    // Check if HTML loads
    await expect(page.locator('html')).toHaveAttribute('lang', 'fr');
    
    // Check if title is correct  
    await expect(page).toHaveTitle(/SYMBIONT/);
    
    // Check if root div exists
    await expect(page.locator('#root')).toBeVisible({ timeout: 5000 });
    
    console.log('Page URL:', page.url());
    console.log('Page title:', await page.title());
  });
});