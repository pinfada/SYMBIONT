import { defineConfig, devices } from '@playwright/test';

/**
 * Configuration Playwright spécialisée pour tests d'extensions Chrome
 */
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',

  use: {
    // Configuration de base pour les extensions Chrome
    baseURL: 'chrome-extension://pfbbacigcdmpkfhbkmmjnhpbimlbbhip',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    {
      name: 'chrome-extension',
      use: { 
        ...devices['Desktop Chrome'],
        // Configuration spécifique aux extensions
        launchOptions: {
          // Mode headless désactivé par défaut pour extensions
          headless: false,
          args: [
            '--disable-web-security',
            '--disable-dev-shm-usage',
            '--no-sandbox',
            '--disable-setuid-sandbox'
          ]
        }
      },
    },

    {
      name: 'chrome-extension-headless',
      use: { 
        ...devices['Desktop Chrome'],
        // Test du mode headless avec --headless=new
        launchOptions: {
          headless: 'new',
          args: [
            '--disable-web-security',
            '--disable-dev-shm-usage',
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-gpu',
            '--mute-audio'
          ]
        }
      },
    },
  ],

  // Pas de serveur web pour les tests d'extension
  // webServer: undefined,
});