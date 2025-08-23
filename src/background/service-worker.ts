// Service Worker principal pour SYMBIONT

class ServiceWorkerManager {
  private isInitialized = false;

  async initialize(): Promise<void> {
    if (this.isInitialized) return;
    
    // Vérifier que chrome API est disponible
    if (typeof chrome === 'undefined' || !chrome.runtime) {
      console.warn('Chrome APIs not available in this context');
      return;
    }
    
    // Setup message handling
    chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
      this.handleMessage(request, sendResponse);
    });

    this.isInitialized = true;
  }

  private handleMessage(message: any, sendResponse: (response: any) => void): void {
    // Handle different message types
    if (message && typeof message === 'object' && 'type' in message) {
      switch (message.type) {
        case 'HEALTH_CHECK':
          sendResponse({ status: 'ok' });
          break;
        default:
          sendResponse({ error: 'Unknown message type' });
      }
    } else {
      sendResponse({ error: 'Invalid message format' });
    }
  }

  dispose(): void {
    this.isInitialized = false;
  }
}

const swManager = new ServiceWorkerManager();
swManager.initialize(); 