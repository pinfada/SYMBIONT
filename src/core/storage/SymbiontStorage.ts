import { OrganismState, OrganismMutation } from '../../shared/types/organism';

interface BehaviorData {
  url: string;
  visitCount: number;
  totalTime: number;
  scrollDepth: number;
  lastVisit: number;
  interactions: Array<{
    type: string;
    timestamp: number;
    data: unknown;
  }>;
}

// @ts-expect-error Interface réservée pour usage futur
interface _StorageSchema {
  version: number;
  organisms: OrganismState[];
  behaviors: BehaviorData[];
  mutations: OrganismMutation[];
  settings: unknown;
}

export class SymbiontStorage {
  private db: IDBDatabase | null = null;
  private readonly DB_NAME = 'symbiont-db';
  private readonly DB_VERSION = 3;

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
        
        // Store pour les organismes
        if (!db.objectStoreNames.contains('organisms')) {
          const organismStore = db.createObjectStore('organisms', { keyPath: 'id' });
          organismStore.createIndex('generation', 'generation', { unique: false });
          organismStore.createIndex('createdAt', 'createdAt', { unique: false });
        }
        
        // Store pour les comportements
        if (!db.objectStoreNames.contains('behaviors')) {
          const behaviorStore = db.createObjectStore('behaviors', { keyPath: 'url' });
          behaviorStore.createIndex('lastVisit', 'lastVisit', { unique: false });
          behaviorStore.createIndex('visitCount', 'visitCount', { unique: false });
        }
        
        // Store pour les mutations
        if (!db.objectStoreNames.contains('mutations')) {
          const mutationStore = db.createObjectStore('mutations', { keyPath: 'id', autoIncrement: true });
          mutationStore.createIndex('timestamp', 'timestamp', { unique: false });
          mutationStore.createIndex('type', 'type', { unique: false });
        }
        
        // Store pour les paramètres
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'key' });
        }
        
        // Store pour les invitations
        if (!db.objectStoreNames.contains('invitations')) {
          const invitationStore = db.createObjectStore('invitations', { keyPath: 'code' });
          invitationStore.createIndex('createdAt', 'createdAt', { unique: false });
          invitationStore.createIndex('status', 'status', { unique: false });
        }
      };
    });
  }

  async getOrganism(id?: string): Promise<OrganismState | null> {
    if (!this.db) throw new Error('Database not initialized');
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['organisms'], 'readonly');
      const store = transaction.objectStore('organisms');
      
      if (id) {
        const request = store.get(id);
        request.onsuccess = () => resolve(request.result || null);
        request.onerror = () => reject(request.error);
      } else {
        // Récupérer le premier organisme trouvé
        const request = store.openCursor();
        request.onsuccess = (event) => {
          const cursor = (event.target as IDBRequest).result;
          resolve(cursor ? cursor.value : null);
        };
        request.onerror = () => reject(request.error);
      }
    });
  }

  async saveOrganism(organism: OrganismState): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['organisms'], 'readwrite');
      const store = transaction.objectStore('organisms');
      const request = store.put(organism);
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getBehavior(url: string): Promise<BehaviorData | null> {
    if (!this.db) throw new Error('Database not initialized');
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['behaviors'], 'readonly');
      const store = transaction.objectStore('behaviors');
      const request = store.get(url);
      
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  async saveBehavior(behavior: BehaviorData): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['behaviors'], 'readwrite');
      const store = transaction.objectStore('behaviors');
      const request = store.put(behavior);
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async addMutation(mutation: OrganismMutation & { timestamp?: number }): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    
    const mutationWithTimestamp = {
      ...mutation,
      timestamp: mutation.timestamp || Date.now()
    };
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['mutations'], 'readwrite');
      const store = transaction.objectStore('mutations');
      const request = store.add(mutationWithTimestamp);
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getRecentMutations(limit: number = 10): Promise<OrganismMutation[]> {
    if (!this.db) throw new Error('Database not initialized');
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['mutations'], 'readonly');
      const store = transaction.objectStore('mutations');
      const index = store.index('timestamp');
      const request = index.openCursor(null, 'prev');
      
      const mutations: OrganismMutation[] = [];
      
      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor && mutations.length < limit) {
          mutations.push(cursor.value);
          cursor.continue();
        } else {
          resolve(mutations);
        }
      };
      
      request.onerror = () => reject(request.error);
    });
  }

  async getSetting<T>(key: string, defaultValue: T): Promise<T> {
    if (!this.db) throw new Error('Database not initialized');
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['settings'], 'readonly');
      const store = transaction.objectStore('settings');
      const request = store.get(key);
      
      request.onsuccess = () => {
        const result = request.result;
        resolve(result ? result.value : defaultValue);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async setSetting<T>(key: string, value: T): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['settings'], 'readwrite');
      const store = transaction.objectStore('settings');
      const request = store.put({ key, value });
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // --- INVITATIONS ---
  async addInvitation(invitation: any): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['invitations'], 'readwrite');
      const store = transaction.objectStore('invitations');
      const request = store.add({
        ...invitation,
        createdAt: invitation.createdAt || Date.now()
      });
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async updateInvitation(invitation: any): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['invitations'], 'readwrite');
      const store = transaction.objectStore('invitations');
      const request = store.put(invitation);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getInvitation(code: string): Promise<any | null> {
    if (!this.db) throw new Error('Database not initialized');
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['invitations'], 'readonly');
      const store = transaction.objectStore('invitations');
      const request = store.get(code);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  async getAllInvitations(): Promise<any[]> {
    if (!this.db) throw new Error('Database not initialized');
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['invitations'], 'readonly');
      const store = transaction.objectStore('invitations');
      const request = store.openCursor();
      const results: unknown[] = [];
      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          results.push(cursor.value);
          cursor.continue();
        } else {
          resolve(results);
        }
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Retourne la liste des comportements triés par nombre de visites (visitCount) puis date de dernière visite (lastVisit)
   */
  async getBehaviorPatterns(): Promise<BehaviorData[]> {
    if (!this.db) throw new Error('Database not initialized');
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['behaviors'], 'readonly');
      const store = transaction.objectStore('behaviors');
      const request = store.openCursor();
      const results: BehaviorData[] = [];
      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          results.push(cursor.value);
          cursor.continue();
        } else {
          // Tri par visitCount décroissant puis lastVisit décroissant
          results.sort((a, b) => {
            if (b.visitCount !== a.visitCount) return b.visitCount - a.visitCount;
            return b.lastVisit - a.lastVisit;
          });
          resolve(results);
        }
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Retourne les interactions récentes sur une période donnée (en ms, par défaut 24h)
   */
  async getRecentActivity(periodMs: number = 24 * 60 * 60 * 1000): Promise<any[]> {
    if (!this.db) throw new Error('Database not initialized');
    const since = Date.now() - periodMs;
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['behaviors'], 'readonly');
      const store = transaction.objectStore('behaviors');
      const request = store.openCursor();
      const recent: unknown[] = [];
      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          const behavior: BehaviorData = cursor.value;
          // On prend toutes les interactions récentes de ce comportement
          const filtered = (behavior.interactions || []).filter(i => i.timestamp >= since);
          for (const i of filtered) {
            recent.push({ ...i, url: behavior.url });
          }
          cursor.continue();
        } else {
          // Tri par timestamp décroissant
          recent.sort((a, b) => b.timestamp - a.timestamp);
          resolve(recent);
        }
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Nettoie les anciennes données pour optimiser l'espace
   */
  async cleanup(retentionDays: number = 30): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    
    const cutoffDate = Date.now() - (retentionDays * 24 * 60 * 60 * 1000);
    
    // Nettoyer les anciennes mutations
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['mutations'], 'readwrite');
      const store = transaction.objectStore('mutations');
      const index = store.index('timestamp');
      const range = IDBKeyRange.upperBound(cutoffDate);
      const request = index.openCursor(range);
      
      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        } else {
          resolve();
        }
      };
      
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Ferme la connexion à la base de données
   */
  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}