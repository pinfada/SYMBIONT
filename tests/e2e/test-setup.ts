import { test as base, expect } from '@playwright/test';
import path from 'path';

const chromeMockPath = path.resolve(__dirname, './chrome-mock.js');

// Mock des APIs Chrome pour les tests E2E
const setupChromeMocks = async (page) => {
  await page.addInitScript(() => {
    // Mock chrome.runtime
    (window as any).chrome = {
      runtime: {
        sendMessage: (message, callback) => {
          console.log('Mock chrome.runtime.sendMessage:', message);
          if (callback) {
            setTimeout(() => {
              callback({ success: true, data: {} });
            }, 10);
          }
          return Promise.resolve({ success: true, data: {} });
        },
        onMessage: {
          addListener: (callback) => {
            console.log('Mock chrome.runtime.onMessage.addListener');
          },
          removeListener: (callback) => {
            console.log('Mock chrome.runtime.onMessage.removeListener');
          }
        },
        connect: () => {
          console.log('Mock chrome.runtime.connect');
          return {
            postMessage: (message) => {
              console.log('Mock port.postMessage:', message);
            },
            onMessage: {
              addListener: (callback) => {
                console.log('Mock port.onMessage.addListener');
              }
            },
            disconnect: () => {
              console.log('Mock port.disconnect');
            }
          };
        },
        id: 'test-extension-id'
      },
      storage: {
        local: {
          get: (keys, callback) => {
            console.log('Mock chrome.storage.local.get:', keys);
            const mockData = {
              userProfile: { id: 'test-user', name: 'Test User' },
              organizm: { traits: { curiosity: 0.8, empathy: 0.7 } },
              networkData: { peers: [] }
            };
            if (callback) callback(mockData);
            return Promise.resolve(mockData);
          },
          set: (data, callback) => {
            console.log('Mock chrome.storage.local.set:', data);
            if (callback) callback();
            return Promise.resolve();
          }
        }
      },
      tabs: {
        query: (queryInfo, callback) => {
          console.log('Mock chrome.tabs.query:', queryInfo);
          const mockTabs = [{ id: 1, url: 'http://localhost:42201' }];
          if (callback) callback(mockTabs);
          return Promise.resolve(mockTabs);
        }
      }
    };

    // Mock MessagePort et autres APIs web
    if (!window.MessageChannel) {
      (window as any).MessageChannel = class MockMessageChannel {
        port1 = {
          postMessage: (data) => console.log('Mock port1.postMessage:', data),
          onmessage: null,
          close: () => console.log('Mock port1.close')
        };
        port2 = {
          postMessage: (data) => console.log('Mock port2.postMessage:', data),
          onmessage: null,
          close: () => console.log('Mock port2.close')
        };
      };
    }

    // Mock console pour capturer les erreurs
    const originalError = console.error;
    console.error = (...args) => {
      originalError.apply(console, args);
      if (!(window as any).__playwright_errors) {
        (window as any).__playwright_errors = [];
      }
      (window as any).__playwright_errors.push({
        type: 'console.error',
        message: args.join(' '),
        timestamp: Date.now()
      });
    };
  });
};

// Extend test avec setup des mocks
export const test = base.extend({
  page: async ({ page }, use) => {
    await setupChromeMocks(page);
    await use(page);
  }
});

export { expect }; 