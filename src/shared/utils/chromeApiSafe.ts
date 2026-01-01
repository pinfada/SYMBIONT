/**
 * Safe Chrome API wrapper for environments where Chrome APIs may not be available
 * This ensures the extension works in test environments and during development
 */

interface SafeStorage {
  local: {
    get: (keys: string[], callback: (result: any) => void) => void;
    set: (items: Record<string, any>, callback?: () => void) => void;
  };
}

interface SafeRuntime {
  getURL: (path: string) => string;
  sendMessage: (message: any, callback?: (response: any) => void) => void;
  onMessage: {
    addListener: (callback: (message: any, sender: any, sendResponse: (response?: any) => void) => void) => void;
  };
}

interface SafeTabs {
  get: (tabId: number, callback: (tab: any) => void) => void;
  onActivated: {
    addListener: (callback: (activeInfo: any) => void) => void;
  };
}

class ChromeApiSafe {
  private isAvailable: boolean;

  constructor() {
    this.isAvailable = typeof chrome !== 'undefined' &&
                       chrome.runtime !== undefined;
  }

  get storage(): SafeStorage {
    return {
      local: {
        get: (keys: string[], callback: (result: any) => void) => {
          if (this.isAvailable && chrome.storage && chrome.storage.local) {
            chrome.storage.local.get(keys, callback);
          } else {
            // Fallback to localStorage in development/test mode
            const result: any = {};
            keys.forEach(key => {
              const value = localStorage.getItem(`symbiont_${key}`);
              if (value) {
                try {
                  result[key] = JSON.parse(value);
                } catch {
                  result[key] = value;
                }
              }
            });
            setTimeout(() => callback?.(result), 0);
          }
        },
        set: (items: Record<string, any>, callback?: () => void) => {
          if (this.isAvailable && chrome.storage && chrome.storage.local) {
            if (callback) {
              chrome.storage.local.set(items, callback);
            } else {
              chrome.storage.local.set(items);
            }
          } else {
            // Fallback to localStorage in development/test mode
            Object.entries(items).forEach(([key, value]) => {
              localStorage.setItem(`symbiont_${key}`, JSON.stringify(value));
            });
            if (callback) {
              setTimeout(() => callback(), 0);
            }
          }
        }
      }
    };
  }

  get runtime(): SafeRuntime {
    return {
      getURL: (path: string) => {
        if (this.isAvailable && chrome.runtime && chrome.runtime.getURL) {
          return chrome.runtime.getURL(path);
        }
        // Fallback for development/test mode
        if (process.env.NODE_ENV === 'development') {
          // In development, return relative path
          return `/${path}`;
        }
        // In test mode, return the path as-is
        return path;
      },
      sendMessage: (message: any, callback?: (response: any) => void) => {
        if (this.isAvailable && chrome.runtime && chrome.runtime.sendMessage) {
          try {
            chrome.runtime.sendMessage(message, callback);
          } catch (error) {
            console.warn('Chrome runtime sendMessage failed:', error);
            if (callback) {
              callback(null);
            }
          }
        } else {
          console.warn('Chrome runtime not available - simulating response');
          // Simulate response in test/dev mode
          if (callback) {
            setTimeout(() => {
              // Return mock data based on message type
              const mockResponse = this.getMockResponse(message);
              callback(mockResponse);
            }, 10);
          }
        }
      },
      onMessage: {
        addListener: (callback: (message: any, sender: any, sendResponse: (response?: any) => void) => void) => {
          if (this.isAvailable && chrome.runtime && chrome.runtime.onMessage) {
            chrome.runtime.onMessage.addListener(callback);
          } else {
            console.warn('Chrome runtime.onMessage not available - listener not registered');
          }
        }
      }
    };
  }

  get tabs(): SafeTabs {
    return {
      get: (tabId: number, callback: (tab: any) => void) => {
        if (this.isAvailable && chrome.tabs && chrome.tabs.get) {
          chrome.tabs.get(tabId, callback);
        } else {
          // Mock tab data for development/test
          setTimeout(() => {
            callback({
              id: tabId,
              url: 'http://localhost:3000/',
              title: 'Development Tab',
              active: true
            });
          }, 0);
        }
      },
      onActivated: {
        addListener: (callback: (activeInfo: any) => void) => {
          if (this.isAvailable && chrome.tabs && chrome.tabs.onActivated) {
            chrome.tabs.onActivated.addListener(callback);
          } else {
            console.warn('Chrome tabs.onActivated not available - listener not registered');
          }
        }
      }
    };
  }

  /**
   * Check if Chrome APIs are available
   */
  isExtensionEnvironment(): boolean {
    return this.isAvailable;
  }

  /**
   * Get mock response for development/test mode
   */
  private getMockResponse(message: any): any {
    switch (message.type) {
      case 'GET_BEHAVIOR_PATTERNS':
        return [
          { pattern: 'navigation', frequency: 45 },
          { pattern: 'interaction', frequency: 30 },
          { pattern: 'scrolling', frequency: 25 }
        ];
      case 'GET_RECENT_ACTIVITY':
        return [
          { timestamp: Date.now() - 60000, action: 'page_view', url: 'test.com' },
          { timestamp: Date.now() - 30000, action: 'click', element: 'button' }
        ];
      default:
        return null;
    }
  }
}

// Export singleton instance
export const chromeApi = new ChromeApiSafe();

// Export for backward compatibility
export default chromeApi;