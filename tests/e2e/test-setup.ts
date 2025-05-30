import { test as base } from '@playwright/test';
import path from 'path';

const chromeMockPath = path.resolve(__dirname, './chrome-mock.js');

export const test = base.extend({
  page: async ({ page }, use) => {
    await page.addInitScript({ path: chromeMockPath });
    await use(page);
  },
});
export { expect } from '@playwright/test'; 