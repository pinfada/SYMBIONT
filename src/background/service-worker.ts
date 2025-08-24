// Service Worker principal pour SYMBIONT
import { SecurityMonitor } from '../shared/security/SecurityMonitor';
import { SecureMessageBus } from '../shared/messaging/SecureMessageBus';

class ServiceWorkerManager {
  private isInitialized = false;

  async initialize(): Promise<void> {
    if (this.isInitialized) return;
    
    // Vérifier que chrome API est disponible
    if (typeof chrome === 'undefined' || !chrome.runtime) {
      console.warn('Chrome APIs not available in this context');
      return;
    }
    
    // Initialiser le monitoring de sécurité
    SecurityMonitor.initialize();
    
    // Vérifier si l'extension est en mode verrouillage
    if (SecurityMonitor.isInLockdown()) {
      console.warn('Extension in security lockdown - limited functionality');
      return;
    }
    
    // Setup secure message handling
    SecureMessageBus.initializeSecureListeners();

    this.isInitialized = true;
  }

  // handleMessage now handled by SecureMessageBus

  dispose(): void {
    this.isInitialized = false;
  }
}

const swManager = new ServiceWorkerManager();
swManager.initialize(); 