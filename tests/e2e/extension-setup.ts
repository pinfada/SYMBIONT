// tests/e2e/extension-setup.ts
// Configuration avancée pour tests d'extension Chrome avec Playwright

import { BrowserContext, chromium, Page } from '@playwright/test';
import path from 'path';
import { logger } from '../../src/shared/utils/secureLogger';

/**
 * Types pour l'inspection d'état d'extension
 */
export interface ExtensionState {
  runtime: {
    id: string;
    version: string;
    lastError?: string;
  };
  storage: Record<string, any>;
  permissions: {
    permissions: string[];
    origins: string[];
  };
  manifest: any;
}

// ID d'extension fixe basé sur la clé du manifest selon bonnes pratiques Google
// Cet ID fixe facilite les tests et l'intégration avec des serveurs externes
export const SYMBIONT_EXTENSION_ID = 'pfbbacigcdmpkfhbkmmjnhpbimlbbhip';

export interface ExtensionTestContext {
  browser: any;
  context: BrowserContext;
  extensionId: string;
  page: Page;
  serviceWorkerPage: Page | null;
}

/**
 * Lance un contexte Chrome avec l'extension SYMBIONT chargée
 * Supporte le mode headless avec --headless=new pour compatibilité extension
 */
export async function setupExtensionContext(options: {
  headless?: boolean | 'new' | 'old';
  devtools?: boolean;
  slowMo?: number;
  viewport?: { width: number; height: number };
} = {}): Promise<ExtensionTestContext> {
  const extensionPath = path.resolve(__dirname, '../../dist');
  
  // Vérification que l'extension est construite
  try {
    const fs = require('fs');
    if (!fs.existsSync(path.join(extensionPath, 'manifest.json'))) {
      throw new Error(`Extension not built at ${extensionPath}. Run 'npm run build' first.`);
    }
  } catch (error) {
    logger.error('Extension setup failed:', error);
    throw error;
  }

  // Configuration Chrome optimisée pour les tests d'extension selon les bonnes pratiques Google
  // Playwright ne supporte que boolean pour headless, pas les strings
  const headlessMode = options.headless === false ? false : false; // Forcer headless=false pour extensions
  
  const browser = await chromium.launch({
    headless: headlessMode, // Extensions nécessitent headless=false
    devtools: options.devtools ?? false,
    slowMo: options.slowMo ?? 0,
    args: [
      `--load-extension=${extensionPath}`,
      `--disable-extensions-except=${extensionPath}`,
      '--disable-dev-shm-usage',
      '--disable-web-security',
      '--disable-features=VizDisplayCompositor',
      '--disable-background-timer-throttling',
      '--disable-backgrounding-occluded-windows',
      '--disable-renderer-backgrounding',
      '--no-sandbox',
      '--disable-setuid-sandbox',
      // Flags supplémentaires pour tests d'extension selon documentation Google
      '--allow-running-insecure-content',
      '--disable-component-extensions-with-background-pages',
      '--disable-default-apps',
      '--disable-extensions-file-access-check'
    ].filter(Boolean) // Supprime les valeurs falsy
  });

  // Créer un contexte avec permissions d'extension
  const context = await browser.newContext({
    permissions: ['storage-access', 'notifications'],
    viewport: options.viewport ?? { width: 1280, height: 800 },
    // Paramètres supplémentaires pour tests d'extension
    ignoreHTTPSErrors: true,
    bypassCSP: true
  });

  // Attendre que l'extension soit chargée
  const page = await context.newPage();
  
  // Attendre le Service Worker de l'extension
  let serviceWorkerPage: Page | null = null;
  try {
    // Attendre que le service worker soit disponible
    await page.waitForTimeout(2000);
    
    // Tenter d'accéder au service worker
    const targets = await context.pages();
    serviceWorkerPage = targets.find(p => p.url().includes('service_worker')) || null;
    
    if (!serviceWorkerPage) {
      // Déclencher le service worker en accédant à l'extension
      await page.goto(`chrome-extension://${SYMBIONT_EXTENSION_ID}/popup/index.html`);
      await page.waitForTimeout(1000);
    }
    
    logger.info('Extension context setup completed', {
      extensionId: SYMBIONT_EXTENSION_ID,
      serviceWorkerAvailable: !!serviceWorkerPage,
      headless: headlessMode,
      viewport: options.viewport ?? { width: 1280, height: 800 }
    });
    
  } catch (error) {
    logger.warn('Service worker setup partial:', error);
  }

  return {
    browser,
    context,
    extensionId: SYMBIONT_EXTENSION_ID,
    page,
    serviceWorkerPage
  };
}

/**
 * Nettoie le contexte d'extension avec fermeture forcée d'IndexedDB
 */
export async function teardownExtensionContext(testContext: ExtensionTestContext): Promise<void> {
  try {
    // ÉTAPE 1: Forcer la fermeture de toutes les connexions IndexedDB avant de fermer les pages
    logger.info('Forcing IndexedDB connections to close...');

    if (testContext.page && !testContext.page.isClosed()) {
      try {
        // Injecter la méthode de nettoyage global et l'exécuter
        await testContext.page.evaluate(() => {
          // Dynamiquement importer SymbiontStorage pour cleanup
          return new Promise<void>((resolve) => {
            if (typeof indexedDB !== 'undefined') {
              // Force close ALL connections via BroadcastChannel
              const channel = new BroadcastChannel('symbiont-storage-coordination');
              channel.postMessage({
                type: 'FORCE_SHUTDOWN',
                requestId: Date.now().toString(),
                senderId: 'test-cleanup'
              });

              // Wait a bit for message to propagate
              setTimeout(() => {
                channel.close();

                // Then delete the database
                const deleteRequest = indexedDB.deleteDatabase('symbiont-db');

                deleteRequest.onsuccess = () => {
                  console.log('[Cleanup] IndexedDB deleted successfully');
                  resolve();
                };

                deleteRequest.onerror = () => {
                  console.warn('[Cleanup] IndexedDB deletion failed');
                  resolve(); // Continue anyway
                };

                deleteRequest.onblocked = () => {
                  console.warn('[Cleanup] IndexedDB deletion blocked');
                  setTimeout(() => resolve(), 2000); // Timeout after 2s
                };

                // Safety timeout
                setTimeout(() => resolve(), 5000);
              }, 500);
            } else {
              resolve();
            }
          });
        });

        // Wait a bit more to ensure cleanup completed
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        logger.warn('IndexedDB cleanup warning:', error);
        // Continue with teardown even if cleanup failed
      }
    }

    // ÉTAPE 2: Fermer les pages et contextes
    if (testContext.serviceWorkerPage && !testContext.serviceWorkerPage.isClosed()) {
      await testContext.serviceWorkerPage.close();
    }

    if (testContext.page && !testContext.page.isClosed()) {
      await testContext.page.close();
    }

    if (testContext.context) {
      await testContext.context.close();
    }

    if (testContext.browser) {
      await testContext.browser.close();
    }

    // ÉTAPE 3: Attendre un peu pour que tout se termine proprement
    await new Promise(resolve => setTimeout(resolve, 500));

    logger.info('Extension context cleaned up successfully');
  } catch (error) {
    logger.error('Extension context cleanup failed:', error);
  }
}

/**
 * Utilitaire pour accéder au Service Worker selon les recommandations Playwright
 */
export async function getExtensionServiceWorker(context: BrowserContext): Promise<Page | null> {
  try {
    // Méthode recommandée pour les Service Workers
    const serviceWorker = await context.waitForEvent('serviceworker', {
      predicate: (worker) => worker.url().includes(SYMBIONT_EXTENSION_ID),
      timeout: 10000
    });
    
    if (serviceWorker) {
      logger.info('Service Worker found:', serviceWorker.url());
      return serviceWorker as any; // Cast car l'API Playwright retourne Worker
    }
    
    return null;
  } catch (error) {
    logger.warn('Service Worker not found, trying alternative method:', error);
    
    // Méthode alternative si la première échoue
    try {
      await new Promise(resolve => setTimeout(resolve, 2000));
      const pages = await context.pages();
      const serviceWorkerPage = pages.find(page => 
        page.url().includes('chrome-extension') && 
        page.url().includes(SYMBIONT_EXTENSION_ID) &&
        page.url().includes('service_worker')
      );
      
      return serviceWorkerPage || null;
    } catch (fallbackError) {
      logger.error('Failed to get service worker with fallback:', fallbackError);
      return null;
    }
  }
}

/**
 * Attendre que l'extension soit complètement initialisée selon les bonnes pratiques
 */
export async function waitForExtensionReady(page: Page, timeout: number = 10000): Promise<boolean> {
  try {
    // Vérifier que chrome.runtime est disponible
    await page.waitForFunction(() => {
      return typeof chrome !== 'undefined' && 
             chrome.runtime && 
             chrome.runtime.id;
    }, { timeout });
    
    // Vérifier que SYMBIONT est initialisé (état visible par l'utilisateur)
    await page.waitForFunction(() => {
      // Prioriser les éléments UI visibles plutôt que l'état interne
      return window.symbiontReady === true || 
             document.querySelector('[data-symbiont-ready="true"]') !== null ||
             document.querySelector('.organism-dashboard') !== null ||
             document.querySelector('.symbiont-loader.complete') !== null;
    }, { timeout: timeout / 2 });
    
    logger.info('Extension fully initialized and UI ready');
    return true;
    
  } catch (error) {
    logger.warn('Extension initialization timeout:', error);
    return false;
  }
}

/**
 * Utilitaires pour interagir avec le popup d'extension selon les bonnes pratiques Chrome
 */
export class ExtensionPopupHelper {
  constructor(private page: Page, private extensionId: string) {}
  
  async openPopup(tabId?: number): Promise<void> {
    // Support pour paramètres URL selon recommandations Google
    let popupUrl = `chrome-extension://${this.extensionId}/popup/index.html`;
    if (tabId) {
      popupUrl += `?tab=${tabId}`;
    }
    
    await this.page.goto(popupUrl);
    await waitForExtensionReady(this.page);
  }
  
  async openPopupWithActiveTab(): Promise<void> {
    // Récupérer l'onglet actif et l'utiliser pour le popup
    const activeTab = await this.page.evaluate(() => {
      return new Promise((resolve) => {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          resolve(tabs[0]?.id || null);
        });
      });
    });
    
    if (activeTab) {
      await this.openPopup(activeTab as number);
    } else {
      await this.openPopup();
    }
  }
  
  async clickExtensionAction(): Promise<void> {
    // Simuler le clic sur l'icône d'extension (nécessite manipulation DOM)
    await this.page.evaluate(() => {
      // Déclencher l'événement d'ouverture du popup
      chrome.action?.onClicked?.dispatch?.();
    });
  }
  
  async getPopupDimensions(): Promise<{ width: number; height: number }> {
    return await this.page.evaluate(() => ({
      width: window.innerWidth,
      height: window.innerHeight
    }));
  }
  
  /**
   * Vérifie si le popup utilise un onglet spécifique via paramètres URL
   */
  async getCurrentTabFromPopup(): Promise<number | null> {
    return await this.page.evaluate(() => {
      const params = new URLSearchParams(window.location.search);
      return params.has('tab') ? parseInt(params.get('tab')!) : null;
    });
  }
}

/**
 * Utilitaires pour tester le stockage d'extension avec gestion d'erreurs améliorée
 */
export class ExtensionStorageHelper {
  constructor(private page: Page) {}
  
  async getStorageData(key: string): Promise<any> {
    return await this.page.evaluate((storageKey) => {
      return new Promise((resolve, reject) => {
        try {
          chrome.storage.local.get([storageKey], (result) => {
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message));
            } else {
              resolve(result[storageKey]);
            }
          });
        } catch (error) {
          reject(error);
        }
      });
    }, key);
  }
  
  async setStorageData(key: string, value: any): Promise<void> {
    await this.page.evaluate(([storageKey, storageValue]) => {
      return new Promise((resolve, reject) => {
        try {
          chrome.storage.local.set({ [storageKey]: storageValue }, () => {
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message));
            } else {
              resolve(void 0);
            }
          });
        } catch (error) {
          reject(error);
        }
      });
    }, [key, value]);
  }
  
  async clearStorage(): Promise<void> {
    await this.page.evaluate(() => {
      return new Promise((resolve, reject) => {
        try {
          chrome.storage.local.clear(() => {
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message));
            } else {
              resolve(void 0);
            }
          });
        } catch (error) {
          reject(error);
        }
      });
    });
  }
  
  /**
   * Récupère toutes les données de storage pour inspection
   */
  async getAllStorageData(): Promise<Record<string, any>> {
    return await this.page.evaluate(() => {
      return new Promise((resolve, reject) => {
        try {
          chrome.storage.local.get(null, (items) => {
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message));
            } else {
              resolve(items);
            }
          });
        } catch (error) {
          reject(error);
        }
      });
    });
  }
  
  /**
   * Vérifie l'utilisation de l'espace de stockage
   */
  async getStorageUsage(): Promise<{ bytesInUse: number }> {
    return await this.page.evaluate(() => {
      return new Promise((resolve, reject) => {
        try {
          chrome.storage.local.getBytesInUse(null, (bytesInUse) => {
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message));
            } else {
              resolve({ bytesInUse });
            }
          });
        } catch (error) {
          reject(error);
        }
      });
    });
  }
}

/**
 * Utilitaires pour l'inspection d'état d'extension selon bonnes pratiques Google
 * Évite l'accès direct à l'état interne, privilégie l'état visible par l'utilisateur
 */
export class ExtensionStateInspector {
  constructor(private page: Page, private extensionId: string) {}

  /**
   * Récupère l'état complet de l'extension pour debugging
   */
  async getFullExtensionState(): Promise<ExtensionState> {
    return await this.page.evaluate((extId) => {
      return new Promise((resolve, reject) => {
        try {
          // État runtime
          const runtimeState = {
            id: chrome.runtime.id,
            version: chrome.runtime.getManifest().version,
            lastError: chrome.runtime.lastError?.message
          };

          // Récupérer le storage
          chrome.storage.local.get(null, (storage) => {
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message));
              return;
            }

            // Récupérer les permissions
            chrome.permissions.getAll((permissions) => {
              if (chrome.runtime.lastError) {
                reject(new Error(chrome.runtime.lastError.message));
                return;
              }

              resolve({
                runtime: runtimeState,
                storage,
                permissions,
                manifest: chrome.runtime.getManifest()
              });
            });
          });
        } catch (error) {
          reject(error);
        }
      });
    }, this.extensionId);
  }

  /**
   * Vérifie l'état UI visible par l'utilisateur (recommandé pour tests)
   */
  async getVisibleUIState(): Promise<{
    isLoading: boolean;
    hasErrors: boolean;
    componentsReady: string[];
    userVisibleData: any;
  }> {
    return await this.page.evaluate(() => {
      const loadingElements = document.querySelectorAll('.loading, .spinner');
      const errorElements = document.querySelectorAll('.error, .alert-error');
      const readyComponents = [];

      // Vérifier les composants SYMBIONT visibles
      if (document.querySelector('.organism-dashboard')) readyComponents.push('dashboard');
      if (document.querySelector('.webgl-viewer')) readyComponents.push('webgl-viewer');
      if (document.querySelector('.energy-gauge')) readyComponents.push('energy-gauge');
      if (document.querySelector('.social-features')) readyComponents.push('social-features');

      // Données visibles par l'utilisateur
      const userVisibleData = {
        organismName: document.querySelector('.organism-name')?.textContent,
        energyLevel: document.querySelector('.energy-value')?.textContent,
        traitValues: Array.from(document.querySelectorAll('.trait-value')).map(el => ({
          name: el.getAttribute('data-trait'),
          value: el.textContent
        }))
      };

      return {
        isLoading: loadingElements.length > 0,
        hasErrors: errorElements.length > 0,
        componentsReady: readyComponents,
        userVisibleData
      };
    });
  }

  /**
   * Exécute du code dans le contexte de l'extension (pour inspection avancée)
   */
  async executeInExtensionContext<T>(code: string): Promise<T> {
    return await this.page.evaluate(code);
  }

  /**
   * Inspecte les Service Workers selon la méthode Puppeteer recommandée
   */
  async inspectServiceWorker(context: BrowserContext): Promise<any> {
    try {
      const serviceWorker = await getExtensionServiceWorker(context);
      if (!serviceWorker) {
        throw new Error('Service Worker not found');
      }

      return await serviceWorker.evaluate(() => {
        return {
          isServiceWorker: typeof importScripts !== 'undefined',
          globalScope: Object.keys(globalThis).filter(key => key.startsWith('symbiont') || key.startsWith('webgl')),
          chromeAPIs: {
            hasRuntime: typeof chrome?.runtime !== 'undefined',
            hasStorage: typeof chrome?.storage !== 'undefined',
            hasAlarms: typeof chrome?.alarms !== 'undefined',
            hasOffscreen: typeof chrome?.offscreen !== 'undefined'
          }
        };
      });
    } catch (error) {
      logger.error('Service Worker inspection failed:', error);
      throw error;
    }
  }
}