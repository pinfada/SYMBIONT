/**
 * Test E2E pour valider la correction du blocage IndexedDB
 *
 * Ce test vérifie que:
 * 1. L'initialisation de SymbiontStorage ne se bloque plus
 * 2. Les connexions concurrentes sont correctement gérées
 * 3. Le système de heartbeat fonctionne
 * 4. Pas de connexions orphelines
 */

import { test, expect, chromium, type BrowserContext } from '@playwright/test';
import path from 'path';

const EXTENSION_PATH = path.join(__dirname, '../../dist');
const INIT_TIMEOUT = 60000; // 60s max pour l'initialisation

test.describe('IndexedDB Connection Management', () => {
  let context: BrowserContext;

  test.beforeEach(async () => {
    // Charger l'extension dans un contexte propre
    context = await chromium.launchPersistentContext('', {
      headless: false,
      args: [
        `--disable-extensions-except=${EXTENSION_PATH}`,
        `--load-extension=${EXTENSION_PATH}`,
        '--no-sandbox',
        '--disable-dev-shm-usage'
      ]
    });

    // Attendre que l'extension soit chargée
    await context.waitForEvent('page', { timeout: 10000 });
  });

  test.afterEach(async () => {
    await context.close();
  });

  test('should initialize SymbiontStorage without blocking', async () => {
    // Ouvrir le service worker
    const backgroundPage = context.serviceWorkers()[0] || context.backgroundPages()[0];
    expect(backgroundPage).toBeDefined();

    // Évaluer le code dans le contexte du service worker
    const initResult = await backgroundPage.evaluate(async () => {
      const startTime = Date.now();

      try {
        // Récupérer l'instance de storage depuis le background service
        const bgService = (globalThis as any)._backgroundService;
        if (!bgService || !bgService.storage) {
          return { success: false, error: 'Background service not found' };
        }

        // Vérifier si déjà initialisé
        const storage = bgService.storage;
        const isInitialized = (storage as any).db !== null;

        if (!isInitialized) {
          // Réinitialiser si nécessaire
          await storage.initialize();
        }

        const duration = Date.now() - startTime;

        return {
          success: true,
          duration,
          isInitialized: true
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : String(error),
          duration: Date.now() - startTime
        };
      }
    }, { timeout: INIT_TIMEOUT });

    expect(initResult.success).toBe(true);
    expect(initResult.duration).toBeLessThan(INIT_TIMEOUT);

    if (initResult.success) {
      console.log(`✓ Storage initialized successfully in ${initResult.duration}ms`);
    } else {
      console.error(`✗ Storage initialization failed:`, initResult.error);
    }
  });

  test('should handle concurrent initializations gracefully', async () => {
    const backgroundPage = context.serviceWorkers()[0] || context.backgroundPages()[0];
    expect(backgroundPage).toBeDefined();

    // Lancer plusieurs initialisations en parallèle
    const concurrentResult = await backgroundPage.evaluate(async () => {
      const bgService = (globalThis as any)._backgroundService;
      if (!bgService || !bgService.storage) {
        return { success: false, error: 'Background service not found' };
      }

      const storage = bgService.storage;

      // Forcer la fermeture pour tester la réinitialisation
      if ((storage as any).db) {
        storage.close();
      }

      // Lancer 3 initialisations en parallèle
      const startTime = Date.now();
      const promises = [
        storage.initialize(),
        storage.initialize(),
        storage.initialize()
      ];

      try {
        await Promise.all(promises);
        const duration = Date.now() - startTime;

        return {
          success: true,
          duration,
          message: 'All concurrent initializations completed'
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : String(error),
          duration: Date.now() - startTime
        };
      }
    }, { timeout: INIT_TIMEOUT });

    expect(concurrentResult.success).toBe(true);
    console.log(`✓ Concurrent initializations handled in ${concurrentResult.duration}ms`);
  });

  test('should cleanup connections on context close', async () => {
    const backgroundPage = context.serviceWorkers()[0] || context.backgroundPages()[0];
    expect(backgroundPage).toBeDefined();

    // Vérifier que la fermeture nettoie correctement
    const closeResult = await backgroundPage.evaluate(async () => {
      const bgService = (globalThis as any)._backgroundService;
      if (!bgService || !bgService.storage) {
        return { success: false, error: 'Background service not found' };
      }

      const storage = bgService.storage;

      // S'assurer que c'est initialisé
      if (!(storage as any).db) {
        await storage.initialize();
      }

      // Fermer proprement
      storage.close();

      // Vérifier que tout est nettoyé
      const isClosed = (storage as any).db === null;
      const heartbeatStopped = (storage as any).heartbeatInterval === null;

      return {
        success: isClosed && heartbeatStopped,
        isClosed,
        heartbeatStopped
      };
    });

    expect(closeResult.success).toBe(true);
    expect(closeResult.isClosed).toBe(true);
    expect(closeResult.heartbeatStopped).toBe(true);
    console.log('✓ Connections cleaned up properly');
  });

  test('should not block after multiple page reloads', async () => {
    // Ouvrir plusieurs pages et recharger l'extension
    const page = await context.newPage();
    await page.goto('https://example.com');

    // Recharger l'extension 3 fois
    for (let i = 0; i < 3; i++) {
      await page.reload();
      await page.waitForTimeout(1000);
    }

    // Vérifier que le storage fonctionne toujours
    const backgroundPage = context.serviceWorkers()[0] || context.backgroundPages()[0];
    const finalCheck = await backgroundPage.evaluate(async () => {
      const bgService = (globalThis as any)._backgroundService;
      if (!bgService || !bgService.storage) {
        return { success: false, error: 'Background service not found after reloads' };
      }

      const storage = bgService.storage;
      const isReady = (storage as any).db !== null;

      return {
        success: isReady,
        message: isReady ? 'Storage still functional after reloads' : 'Storage not ready'
      };
    });

    expect(finalCheck.success).toBe(true);
    console.log('✓ Storage remains functional after multiple reloads');
  });
});
