import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 60_000,
  retries: 2,

  // Global setup & teardown pour nettoyage IndexedDB et processus zombies
  globalSetup: require.resolve('./tests/e2e/global-setup'),
  globalTeardown: require.resolve('./tests/e2e/global-teardown'),

  // Configuration des projets cross-browser
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: {
        ...devices['Desktop Firefox'],
        launchOptions: {
          firefoxUserPrefs: {
            // Les runners CI n'ont pas de GPU : Firefox headless y désactive
            // WebGL et le smoke test de rendu échouait systématiquement
            // (« WebGL indisponible sur firefox »). Forcer le rendu logiciel
            // (WebRender software) garde WebGL fonctionnel sans GPU ; sans
            // effet notable sur un poste avec GPU.
            'webgl.force-enabled': true,
            'gfx.webrender.software': true,
          },
        },
      },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    // Tests sur mobile
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'mobile-safari',
      use: { ...devices['iPhone 12'] },
    },
  ],

  use: {
    baseURL: 'http://localhost:8080',
    headless: true,
    viewport: { width: 1280, height: 800 },
    ignoreHTTPSErrors: true,
    video: 'off',
    screenshot: 'only-on-failure',
  },

  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report' }],
    ['junit', { outputFile: 'test-results/junit.xml' }]
  ],

  webServer: {
    command: 'npx serve -l 8080 dist',
    port: 8080,
    reuseExistingServer: true,
    timeout: 20000,
  },
}); 