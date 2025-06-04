// Service Worker principal pour SYMBIONT

class ServiceWorkerManager {
  private isInitialized = false;

  async initialize(): Promise<void> {
    if (this.isInitialized) return;
    
    // Setup message handling
    chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
      this.handleMessage(request, sendResponse);
    });

    this.isInitialized = true;
  }

  private handleMessage(message: any, sendResponse: (response: any) => void): void {
    // Handle different message types
    switch (message.type) {
      case 'HEALTH_CHECK':
        sendResponse({ status: 'ok' });
        break;
      default:
        sendResponse({ error: 'Unknown message type' });
    }
  }

  dispose(): void {
    this.isInitialized = false;
  }
}

const swManager = new ServiceWorkerManager();
swManager.initialize(); 