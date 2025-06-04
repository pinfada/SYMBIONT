// background/service-worker-adapter.ts
// Adaptation du background script SYMBIONT pour Service Worker

// 1. Remplacement de window.localStorage par chrome.storage
class ServiceWorkerStorage {
  private static instance: ServiceWorkerStorage;
  
  static getInstance(): ServiceWorkerStorage {
    if (!this.instance) {
      this.instance = new ServiceWorkerStorage();
    }
    return this.instance;
  }

  async setItem(key: string, value: string): Promise<void> {
    try {
      await chrome.storage.local.set({ [key]: value });
    } catch (error) {
      console.error('Storage error:', error);
      throw error;
    }
  }

  async getItem(key: string): Promise<string | null> {
    try {
      const result = await chrome.storage.local.get([key]);
      return result[key] || null;
    } catch (error) {
      console.error('Storage retrieval error:', error);
      return null;
    }
  }

  async removeItem(key: string): Promise<void> {
    try {
      await chrome.storage.local.remove([key]);
    } catch (error) {
      console.error('Storage removal error:', error);
    }
  }
}

// 2. Remplacement de BroadcastChannel par chrome.runtime messaging
class ServiceWorkerMessageChannel {
  private handlers: Map<string, Function[]> = new Map();
  private channelName: string;

  constructor(channelName: string) {
    this.channelName = channelName;
    this.setupMessageListener();
  }

  private setupMessageListener(): void {
    chrome.runtime.onMessage.addListener((request, _sender, _sendResponse) => {
      if (request.type === 'CRYPTO_OPERATION') {
        // Handle crypto operations
        return true;
      }
      if (request.channel === this.channelName) {
        this.handleMessage(request.data);
        return true; // Indicate we handled the message
      }
      return false; // Indicate we didn't handle the message
    });
  }

  postMessage(data: any): void {
    // Envoyer à tous les onglets
    chrome.tabs.query({}, (tabs) => {
      tabs.forEach(tab => {
        if (tab.id) {
          chrome.tabs.sendMessage(tab.id, {
            channel: this.channelName,
            data: data
          }).catch(() => {
            // Ignorer les erreurs pour les onglets non accessibles
          });
        }
      });
    });

    // Envoyer aux autres service workers via storage
    this.broadcastViaStorage(data);
  }

  private async broadcastViaStorage(data: any): Promise<void> {
    const storage = ServiceWorkerStorage.getInstance();
    const timestamp = Date.now();
    const messageKey = `broadcast_${this.channelName}_${timestamp}`;
    
    await storage.setItem(messageKey, JSON.stringify({
      data,
      timestamp,
      channel: this.channelName
    }));

    // Auto-nettoyage après 30 secondes
    setTimeout(async () => {
      await storage.removeItem(messageKey);
    }, 30000);
  }

  private handleMessage(data: any): void {
    const handlers = this.handlers.get('message') || [];
    handlers.forEach(handler => {
      try {
        handler({ data });
      } catch (error) {
        console.error('Message handler error:', error);
      }
    });
  }

  set onmessage(handler: (event: { data: any }) => void) {
    if (!this.handlers.has('message')) {
      this.handlers.set('message', []);
    }
    this.handlers.get('message')!.push(handler);
  }
}

// 3. Adaptation des APIs crypto pour Service Worker
class ServiceWorkerCrypto {
  private encryptionKey = "symbiont-key-demo";

  async encryptSensitiveData(data: any): Promise<string> {
    try {
      // Utiliser les Crypto APIs natives du Service Worker
      const encoder = new TextEncoder();
      const keyMaterial = encoder.encode(this.encryptionKey.padEnd(32, '0').slice(0, 32));
      
      const key = await crypto.subtle.importKey(
        'raw',
        keyMaterial,
        { name: 'AES-GCM' },
        false,
        ['encrypt']
      );

      const iv = crypto.getRandomValues(new Uint8Array(12));
      const encodedData = encoder.encode(JSON.stringify(data));
      
      const encryptedData = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        key,
        encodedData
      );

      const combined = new Uint8Array(iv.length + encryptedData.byteLength);
      combined.set(iv, 0);
      combined.set(new Uint8Array(encryptedData), iv.length);
      
      return btoa(String.fromCharCode(...combined));
    } catch (error) {
      console.error('Encryption failed, using fallback:', error);
      // Fallback simple pour les cas d'urgence
      const jsonString = JSON.stringify(data);
      return btoa(unescape(encodeURIComponent(jsonString)));
    }
  }

  async decryptSensitiveData(encryptedData: string): Promise<any> {
    try {
      const combined = Uint8Array.from(atob(encryptedData), c => c.charCodeAt(0));
      const iv = combined.slice(0, 12);
      const encrypted = combined.slice(12);

      const encoder = new TextEncoder();
      const keyMaterial = encoder.encode(this.encryptionKey.padEnd(32, '0').slice(0, 32));
      
      const key = await crypto.subtle.importKey(
        'raw',
        keyMaterial,
        { name: 'AES-GCM' },
        false,
        ['decrypt']
      );

      const decryptedData = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        key,
        encrypted
      );

      const decoder = new TextDecoder();
      return JSON.parse(decoder.decode(decryptedData));
    } catch (error) {
      console.error('Decryption failed, trying fallback:', error);
      // Fallback pour les données non chiffrées
      try {
        const jsonString = decodeURIComponent(escape(atob(encryptedData)));
        return JSON.parse(jsonString);
      } catch (fallbackError) {
        console.error('All decryption methods failed:', fallbackError);
        throw new Error('Unable to decrypt data');
      }
    }
  }
}

// 4. IndexedDB adapter pour Service Worker
class ServiceWorkerIndexedDB {
  private db: IDBDatabase | null = null;
  private readonly DB_NAME = "symbiont-db";
  private readonly DB_VERSION = 2;

  async initialize(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Créer les object stores nécessaires
        if (!db.objectStoreNames.contains('organism')) {
          db.createObjectStore('organism', { keyPath: 'id' });
        }
        
        if (!db.objectStoreNames.contains('behaviors')) {
          const behaviorStore = db.createObjectStore('behaviors', { keyPath: 'url' });
          behaviorStore.createIndex('visitCount', 'visitCount', { unique: false });
          behaviorStore.createIndex('lastVisit', 'lastVisit', { unique: false });
        }
        
        if (!db.objectStoreNames.contains('mutations')) {
          const mutationStore = db.createObjectStore('mutations', { autoIncrement: true });
          mutationStore.createIndex('timestamp', 'timestamp', { unique: false });
          mutationStore.createIndex('type', 'type', { unique: false });
        }
        
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'key' });
        }
        
        if (!db.objectStoreNames.contains('invitations')) {
          db.createObjectStore('invitations', { keyPath: 'code' });
        }
      };
    });
  }

  // Méthodes de base pour organism, behaviors, etc.
  async getOrganism(): Promise<any> {
    if (!this.db) throw new Error('Database not initialized');
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['organism'], 'readonly');
      const store = transaction.objectStore('organism');
      const request = store.get('current');
      
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  async saveOrganism(organism: any): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['organism'], 'readwrite');
      const store = transaction.objectStore('organism');
      const request = store.put({ ...organism, id: 'current' });
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
}

// 5. Gestionnaire global pour remplacer les APIs manquantes
class ServiceWorkerGlobals {
  private static storage = ServiceWorkerStorage.getInstance();
  private static swCrypto = new ServiceWorkerCrypto();
  
  // Wrapper localStorage
  static get swLocalStorage() {
    return {
      getItem: (key: string) => this.storage.getItem(key),
      setItem: (key: string, value: string) => this.storage.setItem(key, value),
      removeItem: (key: string) => this.storage.removeItem(key)
    };
  }
  
  // Wrapper indexedDB (déjà disponible en Service Worker)
  static get swIndexedDB() {
    return globalThis.indexedDB;
  }
  
  // Wrapper BroadcastChannel
  static swBroadcastChannel = ServiceWorkerMessageChannel;
  
  // Crypto APIs améliorées
  static get swCryptoAPI() {
    return {
      ...globalThis.crypto,
      encryptSensitiveData: this.swCrypto.encryptSensitiveData.bind(this.swCrypto),
      decryptSensitiveData: this.swCrypto.decryptSensitiveData.bind(this.swCrypto)
    };
  }
}

// Utilisation recommandée : importer ces wrappers dans le code du service worker
export const swLocalStorage = ServiceWorkerGlobals.swLocalStorage;
export const swBroadcastChannel = ServiceWorkerGlobals.swBroadcastChannel;
export const swCryptoAPI = ServiceWorkerGlobals.swCryptoAPI;
export const swIndexedDB = ServiceWorkerGlobals.swIndexedDB;

// Export pour utilisation avancée
export {
  ServiceWorkerStorage,
  ServiceWorkerMessageChannel,
  ServiceWorkerCrypto,
  ServiceWorkerIndexedDB,
  ServiceWorkerGlobals
}; 