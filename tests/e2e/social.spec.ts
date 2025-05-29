import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('Fonctionnalités sociales SYMBIONT', () => {
  const popupPath = path.resolve(__dirname, '../../dist/popup.html');

  test('Génération et partage d’une invitation', async ({ page }) => {
    await page.goto('file://' + popupPath);
    await page.click('text=/Inviter|Invitation/i');
    await page.click('text=/Générer|Generate/i');
    const code = await page.locator('input[readonly][value]').inputValue();
    expect(code).toMatch(/[a-z0-9-]{8,}/i);
    await page.click('text=/Copier|Copy/i');
    await expect(page.locator('text=/Invitation copiée|Invitation copied/i')).toBeVisible();
  });

  test('Acceptation d’une invitation', async ({ page }) => {
    await page.goto('file://' + popupPath);
    await page.click('text=/Inviter|Invitation/i');
    await page.fill('input[name="invitationCode"]', 'TESTCODE123');
    await page.click('text=/Accepter|Accept/i');
    await expect(page.locator('text=/Invitation acceptée|Invitation accepted/i')).toBeVisible();
  });
}); 