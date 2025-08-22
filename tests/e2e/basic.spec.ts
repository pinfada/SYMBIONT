import { test, expect } from '@playwright/test';
import path from 'path';

test('La page d\'accueil de l\'extension est accessible', async ({ page }) => {
  const popupPath = path.resolve(__dirname, '../../dist/popup/index.html');
  await page.goto('file://' + popupPath);
  await expect(page).toHaveTitle(/symbiont/i);
}); 