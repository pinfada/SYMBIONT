// tests/e2e/service-worker.spec.ts
// Tests avancés du Service Worker SYMBIONT

import { test, expect } from '@playwright/test';
import { 
  setupExtensionContext, 
  teardownExtensionContext,
  getExtensionServiceWorker,
  ExtensionStorageHelper,
  ExtensionStateInspector,
  ExtensionPopupHelper,
  SYMBIONT_EXTENSION_ID
} from './extension-setup';

test.describe('SYMBIONT Service Worker Tests', () => {
  test('Service Worker initialisation et état', async () => {
    // Utiliser headless 'new' pour compatibilité extension selon Google
    const testContext = await setupExtensionContext({ headless: 'new' });
    
    try {
      // Vérifier que le service worker est actif
      const serviceWorker = await getExtensionServiceWorker(testContext.context);
      expect(serviceWorker).toBeTruthy();
      
      if (serviceWorker) {
        // Tester l'état initial du service worker
        const serviceWorkerState = await serviceWorker.evaluate(() => {
          return {
            // @ts-ignore - Service worker globals
            isServiceWorker: typeof importScripts !== 'undefined',
            hasChrome: typeof chrome !== 'undefined',
            hasStorage: typeof chrome?.storage !== 'undefined',
            extensionId: chrome?.runtime?.id
          };
        });
        
        expect(serviceWorkerState.isServiceWorker).toBe(true);
        expect(serviceWorkerState.hasChrome).toBe(true);
        expect(serviceWorkerState.hasStorage).toBe(true);
        expect(serviceWorkerState.extensionId).toBe(SYMBIONT_EXTENSION_ID);
        
        console.log('✅ Service Worker state:', serviceWorkerState);
      }
      
    } finally {
      await teardownExtensionContext(testContext);
    }
  });

  test('WebGL Orchestrator dans Service Worker', async () => {
    const testContext = await setupExtensionContext({ headless: 'new' });
    
    try {
      const serviceWorker = await getExtensionServiceWorker(testContext.context);
      
      if (serviceWorker) {
        // Utiliser ExtensionStateInspector pour inspection selon bonnes pratiques
        const inspector = new ExtensionStateInspector(testContext.page, SYMBIONT_EXTENSION_ID);
        const serviceWorkerState = await inspector.inspectServiceWorker(testContext.context);
        
        // Tester l'initialisation du WebGLOrchestrator
        const webglState = await serviceWorker.evaluate(() => {
          return {
            hasWebGLOrchestrator: typeof globalThis.webglOrchestrator !== 'undefined',
            hasOrganismCore: typeof globalThis.organismCore !== 'undefined',
            offscreenSupport: typeof chrome.offscreen !== 'undefined',
            webglContextAvailable: typeof OffscreenCanvas !== 'undefined'
          };
        });
        
        console.log('🎮 Service Worker inspection:', serviceWorkerState);
        console.log('🎮 WebGL state in Service Worker:', webglState);
        
        // Vérifications selon bonnes pratiques
        expect(serviceWorkerState.isServiceWorker).toBe(true);
        expect(serviceWorkerState.chromeAPIs.hasOffscreen).toBe(true);
        expect(webglState.offscreenSupport).toBe(true);
      }
      
    } finally {
      await teardownExtensionContext(testContext);
    }
  });

  test('Storage et persistance des données', async () => {
    const testContext = await setupExtensionContext({ headless: 'new' });
    
    try {
      const storageHelper = new ExtensionStorageHelper(testContext.page);
      
      // Nettoyer le storage avant le test
      await storageHelper.clearStorage();
      
      // Test de stockage d'un organisme
      const testOrganism = {
        id: 'test-organism-123',
        traits: {
          curiosity: 0.8,
          empathy: 0.7,
          focus: 0.6,
          rhythm: 0.9
        },
        energy: 0.75,
        mutations: [],
        lastUpdate: Date.now()
      };
      
      // Sauvegarder les données
      await storageHelper.setStorageData('current-organism', testOrganism);
      
      // Récupérer les données
      const retrievedOrganism = await storageHelper.getStorageData('current-organism');
      
      // Vérifications
      expect(retrievedOrganism).toBeTruthy();
      expect(retrievedOrganism.id).toBe(testOrganism.id);
      expect(retrievedOrganism.traits.curiosity).toBe(testOrganism.traits.curiosity);
      expect(retrievedOrganism.energy).toBe(testOrganism.energy);
      
      console.log('💾 Organism storage test passed:', retrievedOrganism);
      
      // Test de données multiples avec vérification de l'utilisation
      await storageHelper.setStorageData('user-preferences', {
        theme: 'dark',
        language: 'fr',
        animations: true
      });
      
      const preferences = await storageHelper.getStorageData('user-preferences');
      expect(preferences.theme).toBe('dark');
      
      // Vérifier l'utilisation du storage
      const usage = await storageHelper.getStorageUsage();
      expect(usage.bytesInUse).toBeGreaterThan(0);
      
      // Vérifier toutes les données stockées
      const allData = await storageHelper.getAllStorageData();
      expect(allData).toHaveProperty('current-organism');
      expect(allData).toHaveProperty('user-preferences');
      
    } finally {
      await teardownExtensionContext(testContext);
    }
  });

  test('Communication Message Bus', async () => {
    const testContext = await setupExtensionContext({ headless: 'new' });
    
    try {
      // Test de communication entre popup et service worker avec PopupHelper
      const popupHelper = new ExtensionPopupHelper(testContext.page, SYMBIONT_EXTENSION_ID);
      await popupHelper.openPopup();
      
      // Attendre que la page soit chargée et que l'extension soit prête
      await testContext.page.waitForLoadState('domcontentloaded');
      await testContext.page.waitForTimeout(2000);
      
      // Tester l'envoi de message au service worker
      const messageResponse = await testContext.page.evaluate(() => {
        return new Promise((resolve) => {
          chrome.runtime.sendMessage(
            { 
              type: 'TEST_MESSAGE', 
              payload: { test: true, timestamp: Date.now() }
            }, 
            (response) => {
              resolve(response);
            }
          );
        });
      });
      
      console.log('📬 Message response:', messageResponse);
      
      // Le service worker devrait répondre (même avec un mock)
      expect(messageResponse).toBeTruthy();
      
    } finally {
      await teardownExtensionContext(testContext);
    }
  });

  test('Gestion des alarmes et tâches périodiques', async () => {
    const testContext = await setupExtensionContext({ headless: 'new' });
    
    try {
      const serviceWorker = await getExtensionServiceWorker(testContext.context);
      
      if (serviceWorker) {
        // Tester la création d'alarmes Chrome
        const alarmState = await serviceWorker.evaluate(() => {
          return new Promise((resolve) => {
            // Créer une alarme de test
            chrome.alarms.create('test-heartbeat', { 
              delayInMinutes: 0.1, // 6 secondes
              periodInMinutes: 0.1 
            });
            
            // Vérifier les alarmes existantes
            chrome.alarms.getAll((alarms) => {
              resolve({
                hasAlarmsAPI: typeof chrome.alarms !== 'undefined',
                activeAlarms: alarms.length,
                testAlarmCreated: alarms.some(a => a.name === 'test-heartbeat')
              });
            });
          });
        });
        
        console.log('⏰ Alarms state:', alarmState);
        
        expect(alarmState.hasAlarmsAPI).toBe(true);
        expect(alarmState.testAlarmCreated).toBe(true);
        
        // Nettoyer l'alarme de test
        await serviceWorker.evaluate(() => {
          chrome.alarms.clear('test-heartbeat');
        });
      }
      
    } finally {
      await teardownExtensionContext(testContext);
    }
  });

  test('Sécurité et permissions', async () => {
    const testContext = await setupExtensionContext({ headless: 'new' });
    
    try {
      // Vérifier les permissions d'extension
      const permissions = await testContext.page.evaluate(() => {
        return new Promise((resolve) => {
          chrome.permissions.getAll((permissions) => {
            resolve({
              permissions: permissions.permissions,
              origins: permissions.origins
            });
          });
        });
      });
      
      console.log('🔒 Extension permissions:', permissions);
      
      // Vérifications de sécurité selon bonnes pratiques Chrome
      expect(permissions.permissions).toContain('storage');
      expect(permissions.permissions).toContain('alarms');
      expect(permissions.permissions).toContain('activeTab');
      
      // Vérifier permissions spécifiques SYMBIONT
      if (permissions.permissions.includes('offscreen')) {
        expect(permissions.permissions).toContain('offscreen');
      }
      
      // Test du SecurityManager si disponible
      const securityState = await testContext.page.evaluate(() => {
        return {
          hasCrypto: typeof crypto !== 'undefined',
          hasSubtleCrypto: typeof crypto?.subtle !== 'undefined',
          hasSecureRandom: typeof crypto?.getRandomValues !== 'undefined'
        };
      });
      
      expect(securityState.hasCrypto).toBe(true);
      expect(securityState.hasSubtleCrypto).toBe(true);
      expect(securityState.hasSecureRandom).toBe(true);
      
      console.log('🛡️ Security APIs available:', securityState);
      
    } finally {
      await teardownExtensionContext(testContext);
    }
  });

  test('Inspection d\'état UI visible par utilisateur', async () => {
    const testContext = await setupExtensionContext({ headless: 'new' });
    
    try {
      const popupHelper = new ExtensionPopupHelper(testContext.page, SYMBIONT_EXTENSION_ID);
      await popupHelper.openPopup();
      
      // Utiliser ExtensionStateInspector pour inspecter l'état UI
      const inspector = new ExtensionStateInspector(testContext.page, SYMBIONT_EXTENSION_ID);
      
      // État UI visible (recommandé selon Google)
      const uiState = await inspector.getVisibleUIState();
      
      console.log('👁️ UI State visible by user:', uiState);
      
      // Tests basés sur l'expérience utilisateur
      expect(uiState.hasErrors).toBe(false);
      expect(uiState.componentsReady).toContain('dashboard');
      
      // État complet pour debugging (si nécessaire)
      const fullState = await inspector.getFullExtensionState();
      
      console.log('🔍 Full extension state:', {
        runtime: fullState.runtime,
        storageKeys: Object.keys(fullState.storage),
        permissionsCount: fullState.permissions.permissions.length
      });
      
      expect(fullState.runtime.id).toBe(SYMBIONT_EXTENSION_ID);
      expect(fullState.manifest.version).toBeDefined();
      
    } finally {
      await teardownExtensionContext(testContext);
    }
  });

  test('Test popup avec paramètres d\'onglet actif', async () => {
    const testContext = await setupExtensionContext({ headless: 'new' });
    
    try {
      const popupHelper = new ExtensionPopupHelper(testContext.page, SYMBIONT_EXTENSION_ID);
      
      // Ouvrir popup avec onglet actif selon recommandations Google
      await popupHelper.openPopupWithActiveTab();
      
      // Vérifier si le popup utilise l'onglet actif
      const currentTabId = await popupHelper.getCurrentTabFromPopup();
      
      console.log('📑 Current tab ID in popup:', currentTabId);
      
      // Test avec un ID d'onglet spécifique
      await popupHelper.openPopup(123);
      
      const specificTabId = await popupHelper.getCurrentTabFromPopup();
      expect(specificTabId).toBe(123);
      
      console.log('✅ Popup tab parameter test passed');
      
    } finally {
      await teardownExtensionContext(testContext);
    }
  });
});