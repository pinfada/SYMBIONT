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
    data: any;
  }>;
}

interface StorageSchema {
  organism: OrganismState;
  behaviors: Map<string, BehaviorData>;
  mutations: OrganismMutation[];
  settings: Record<string, any>;
}

export class SymbiontStorage {
  private db: IDBDatabase | null = null;
  private readonly DB_NAME = 'symbiont-db';
  private readonly DB_VERSION = 2;
  private _org: any = null;

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
        
        // Organism state store
        if (!db.objectStoreNames.contains('organism')) {
          db.createObjectStore('organism', { keyPath: 'id' });
        }
        
        // Behavior patterns store
        if (!db.objectStoreNames.contains('behaviors')) {
          const behaviorStore = db.createObjectStore('behaviors', { keyPath: 'url' });
          behaviorStore.createIndex('visitCount', 'visitCount', { unique: false });
          behaviorStore.createIndex('lastVisit', 'lastVisit', { unique: false });
        }
        
        // Mutations history store
        if (!db.objectStoreNames.contains('mutations')) {
          const mutationStore = db.createObjectStore('mutations', { autoIncrement: true });
          mutationStore.createIndex('timestamp', 'timestamp', { unique: false });
          mutationStore.createIndex('type', 'type', { unique: false });
        }
        
        // Settings store
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'key' });
        }
        
        // Invitations store
        if (!db.objectStoreNames.contains('invitations')) {
          db.createObjectStore('invitations', { keyPath: 'code' });
        }
      };
    });
  }

  async getOrganism(): Promise<OrganismState | null> {
    if (!this.db) throw new Error('Database not initialized');
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['organism'], 'readonly');
      const store = transaction.objectStore('organism');
      const request = store.get('current');
      
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  async saveOrganism(organism: OrganismState): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['organism'], 'readwrite');
      const store = transaction.objectStore('organism');
      const request = store.put({ ...organism, id: 'current' });
      
      request.onsuccess = () => {
        this._org = organism;
        resolve();
      };
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

  async addMutation(mutation: OrganismMutation): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['mutations'], 'readwrite');
      const store = transaction.objectStore('mutations');
      const request = store.add(mutation);
      
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
      const request = store.add(invitation);
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
      const results: any[] = [];
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
      const recent: any[] = [];
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
}