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
  private readonly OPERATION_TIMEOUT = 10000; // 10 seconds timeout for operations
  private readonly MAX_STORAGE_SIZE_MB = 50; // Maximum storage size in MB
  private quotaWarningIssued = false;

  /**
   * Wraps a promise with a timeout to prevent indefinite hanging
   */
  private withTimeout<T>(promise: Promise<T>, timeoutMs: number = this.OPERATION_TIMEOUT): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error(`Operation timed out after ${timeoutMs}ms`)), timeoutMs)
      )
    ]);
  }

  async initialize(): Promise<void> {
    // Vérifier que IndexedDB est disponible
    if (typeof indexedDB === 'undefined') {
      throw new Error('IndexedDB is not available in this environment');
    }

    console.log('[SymbiontStorage] Starting initialization...', {
      dbName: this.DB_NAME,
      dbVersion: this.DB_VERSION
    });

    // Fermer toute connexion existante avant de réessayer
    const currentDb = this.db;
    if (currentDb) {
      console.log('[SymbiontStorage] Closing existing database connection');
      try {
        currentDb.close();
      } catch (error) {
        console.warn('[SymbiontStorage] Error closing existing connection:', error);
      }
      this.db = null;
    }

    // Check storage quota before initialization (avec timeout pour éviter les blocages)
    try {
      const quotaCheckPromise = this.checkStorageQuota();
      await Promise.race([
        quotaCheckPromise,
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Storage quota check timeout')), 3000)
        )
      ]);
    } catch (quotaError) {
      console.warn('[SymbiontStorage] Failed to check storage quota (continuing anyway):', quotaError);
      // Continue with initialization, but log the warning
    }

    // Tentative d'initialisation avec retry en cas de blocage
    const maxRetries = 3;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`[SymbiontStorage] Initialization attempt ${attempt}/${maxRetries}`);
        await this.attemptInitialize(attempt === maxRetries);
        console.log('[SymbiontStorage] Initialization completed successfully');
        return; // Succès, on sort
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        console.error(`[SymbiontStorage] Initialization attempt ${attempt} failed:`, lastError);

        // Si c'est un timeout ou un blocage, attendre plus longtemps avant de réessayer
        if (attempt < maxRetries && (
          lastError.message.includes('blocked') || 
          lastError.message.includes('timeout')
        )) {
          // Attendre plus longtemps pour les blocages - donne le temps aux autres connexions de se fermer
          const waitTime = lastError.message.includes('blocked') 
            ? attempt * 2000  // 2s, 4s, 6s pour les blocages
            : attempt * 1000; // 1s, 2s, 3s pour les timeouts
          console.log(`[SymbiontStorage] Waiting ${waitTime}ms before retry (blocked: ${lastError.message.includes('blocked')})...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
          
          // Fermer toute connexion existante avant de réessayer
          const existingDb = this.db;
          if (existingDb) {
            try {
              existingDb.close();
            } catch (closeError) {
              console.warn('[SymbiontStorage] Error closing connection before retry:', closeError);
            }
            this.db = null;
          }

          // Pour les blocages, essayer aussi de forcer la fermeture en supprimant la base si c'est la dernière tentative
          if (lastError.message.includes('blocked') && attempt === maxRetries - 1) {
            console.warn('[SymbiontStorage] Attempting to force close blocked database...');
            try {
              await this.forceCloseDatabase();
            } catch (forceCloseError) {
              console.warn('[SymbiontStorage] Could not force close database:', forceCloseError);
            }
          }
        } else {
          // Pour les autres erreurs ou dernière tentative, on arrête
          break;
        }
      }
    }

    // Toutes les tentatives ont échoué
    console.error('[SymbiontStorage] All initialization attempts failed');
    const failedDb = this.db;
    if (failedDb) {
      try {
        failedDb.close();
      } catch (closeError) {
        console.error('[SymbiontStorage] Error closing database after failed init:', closeError);
      }
      this.db = null;
    }
    throw lastError || new Error('IndexedDB initialization failed after all retries');
  }

  private attemptInitialize(isLastAttempt: boolean): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      let timeoutId: ReturnType<typeof setTimeout> | null = null;
      let isResolved = false;
      let blockedTimeoutId: ReturnType<typeof setTimeout> | null = null;

      const cleanup = () => {
        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }
        if (blockedTimeoutId) {
          clearTimeout(blockedTimeoutId);
          blockedTimeoutId = null;
        }
      };

      const safeResolve = () => {
        if (!isResolved) {
          isResolved = true;
          cleanup();
          resolve();
        }
      };

      const safeReject = (error: Error) => {
        if (!isResolved) {
          isResolved = true;
          cleanup();
          reject(error);
        }
      };

      // Timeout de sécurité - plus long si c'est la dernière tentative
      const timeoutDuration = isLastAttempt ? 20000 : 10000;
      timeoutId = setTimeout(() => {
        console.error(`[SymbiontStorage] IndexedDB open request timeout (no response after ${timeoutDuration}ms)`);
        safeReject(new Error(`IndexedDB open request timeout - no response from browser after ${timeoutDuration}ms`));
      }, timeoutDuration);

      console.log('[SymbiontStorage] Opening IndexedDB...');
      const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);

      request.onerror = () => {
        const error = request.error;
        console.error('[SymbiontStorage] IndexedDB open failed:', {
          name: error?.name,
          message: error?.message,
          code: (error as any)?.code
        });
        safeReject(error || new Error('Unknown IndexedDB error'));
      };

      request.onsuccess = () => {
        console.log('[SymbiontStorage] IndexedDB opened successfully');
        try {
          this.db = request.result;

          if (!this.db) {
            safeReject(new Error('IndexedDB opened but result is null'));
            return;
          }

          // Setup error handlers for the database
          this.db.onerror = (event) => {
            console.error('[SymbiontStorage] Database error:', event);
          };

          this.db.onversionchange = () => {
            console.warn('[SymbiontStorage] Database version changed, closing connection');
            this.db?.close();
            this.db = null;
          };

          console.log('[SymbiontStorage] Database initialized successfully', {
            objectStores: Array.from(this.db.objectStoreNames)
          });
          safeResolve();
        } catch (error) {
          console.error('[SymbiontStorage] Error setting up database:', error);
          safeReject(error instanceof Error ? error : new Error('Unknown error during database setup'));
        }
      };

      request.onupgradeneeded = (event) => {
        console.log('[SymbiontStorage] Database upgrade needed');
        try {
          const db = (event.target as IDBOpenDBRequest).result;

          if (!db) {
            console.error('[SymbiontStorage] Database upgrade: result is null');
            return;
          }

          // Store pour les organismes
          if (!db.objectStoreNames.contains('organisms')) {
            console.log('[SymbiontStorage] Creating organisms store');
            const organismStore = db.createObjectStore('organisms', { keyPath: 'id' });
            organismStore.createIndex('generation', 'generation', { unique: false });
            organismStore.createIndex('createdAt', 'createdAt', { unique: false });
          }

          // Store pour les comportements
          if (!db.objectStoreNames.contains('behaviors')) {
            console.log('[SymbiontStorage] Creating behaviors store');
            const behaviorStore = db.createObjectStore('behaviors', { keyPath: 'url' });
            behaviorStore.createIndex('lastVisit', 'lastVisit', { unique: false });
            behaviorStore.createIndex('visitCount', 'visitCount', { unique: false });
          }

          // Store pour les mutations
          if (!db.objectStoreNames.contains('mutations')) {
            console.log('[SymbiontStorage] Creating mutations store');
            const mutationStore = db.createObjectStore('mutations', { keyPath: 'id', autoIncrement: true });
            mutationStore.createIndex('timestamp', 'timestamp', { unique: false });
            mutationStore.createIndex('type', 'type', { unique: false });
          }

          // Store pour les paramètres
          if (!db.objectStoreNames.contains('settings')) {
            console.log('[SymbiontStorage] Creating settings store');
            db.createObjectStore('settings', { keyPath: 'key' });
          }

          // Store pour les invitations
          if (!db.objectStoreNames.contains('invitations')) {
            console.log('[SymbiontStorage] Creating invitations store');
            const invitationStore = db.createObjectStore('invitations', { keyPath: 'code' });
            invitationStore.createIndex('createdAt', 'createdAt', { unique: false });
            invitationStore.createIndex('status', 'status', { unique: false });
          }

          console.log('[SymbiontStorage] Database upgrade completed');
        } catch (error) {
          console.error('[SymbiontStorage] Error during database upgrade:', error);
          safeReject(error instanceof Error ? error : new Error('Unknown error during database upgrade'));
        }
      };

      request.onblocked = () => {
        console.warn('[SymbiontStorage] IndexedDB open blocked - another connection is open');
        console.warn('[SymbiontStorage] Waiting for other connection to close...');
        // Si onblocked est déclenché, on attend beaucoup plus longtemps
        // car une autre connexion doit se fermer (peut prendre du temps)
        if (blockedTimeoutId) {
          clearTimeout(blockedTimeoutId);
        }
        // Augmenter significativement le timeout si onblocked est détecté
        // On donne plus de temps car onblocked signifie qu'on attend qu'une autre connexion se ferme
        if (timeoutId) {
          clearTimeout(timeoutId);
          // Timeout beaucoup plus long pour onblocked - jusqu'à 30 secondes
          const extendedTimeout = isLastAttempt ? 30000 : 20000;
          timeoutId = setTimeout(() => {
            console.error(`[SymbiontStorage] IndexedDB still blocked after ${extendedTimeout}ms wait`);
            console.error('[SymbiontStorage] This usually means another tab/context has the database open');
            safeReject(new Error(`IndexedDB blocked - another connection preventing access after ${extendedTimeout}ms`));
          }, extendedTimeout);
        }
      };
    });
  }

  async getOrganism(id?: string): Promise<OrganismState | null> {
    if (!this.db) throw new Error('Database not initialized');

    const getPromise = new Promise<OrganismState | null>((resolve, reject) => {
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

    return this.withTimeout(getPromise);
  }

  async saveOrganism(organism: OrganismState): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const savePromise = new Promise<void>((resolve, reject) => {
      const transaction = this.db!.transaction(['organisms'], 'readwrite');
      const store = transaction.objectStore('organisms');
      const request = store.put(organism);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });

    return this.withTimeout(savePromise);
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
          recent.sort((a, b) => (b as any).timestamp - (a as any).timestamp);
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
   * Vérifie le quota de stockage et alerte si nécessaire
   */
  private async checkStorageQuota(): Promise<void> {
    if (!navigator.storage || !navigator.storage.estimate) {
      console.warn('Storage API not available, skipping quota check');
      return;
    }

    try {
      const estimate = await navigator.storage.estimate();
      const usageInMB = (estimate.usage || 0) / (1024 * 1024);
      const quotaInMB = (estimate.quota || 0) / (1024 * 1024);
      const usagePercent = quotaInMB > 0 ? (usageInMB / quotaInMB) * 100 : 0;

      console.info('Storage quota:', {
        usageInMB: usageInMB.toFixed(2),
        quotaInMB: quotaInMB.toFixed(2),
        usagePercent: usagePercent.toFixed(2) + '%'
      });

      // Warn if usage is above 80%
      if (usagePercent > 80 && !this.quotaWarningIssued) {
        this.quotaWarningIssued = true;
        console.warn('STORAGE WARNING: Usage above 80%, consider cleanup');

        // Trigger automatic cleanup if above 90%
        if (usagePercent > 90) {
          console.warn('STORAGE CRITICAL: Usage above 90%, triggering automatic cleanup');
          await this.cleanup(15); // Keep only last 15 days
        }
      }

      // Check if we're approaching browser limits
      if (usageInMB > this.MAX_STORAGE_SIZE_MB * 0.9) {
        console.error('STORAGE CRITICAL: Approaching maximum storage size limit');
        // Aggressive cleanup
        await this.cleanup(7); // Keep only last 7 days
      }
    } catch (error) {
      console.error('Failed to check storage quota:', error);
    }
  }

  /**
   * Obtient les statistiques de stockage
   */
  async getStorageStats(): Promise<{
    usageInMB: number;
    quotaInMB: number;
    usagePercent: number;
    needsCleanup: boolean;
  }> {
    if (!navigator.storage || !navigator.storage.estimate) {
      return {
        usageInMB: 0,
        quotaInMB: 0,
        usagePercent: 0,
        needsCleanup: false
      };
    }

    try {
      const estimate = await navigator.storage.estimate();
      const usageInMB = (estimate.usage || 0) / (1024 * 1024);
      const quotaInMB = (estimate.quota || 0) / (1024 * 1024);
      const usagePercent = quotaInMB > 0 ? (usageInMB / quotaInMB) * 100 : 0;

      return {
        usageInMB,
        quotaInMB,
        usagePercent,
        needsCleanup: usagePercent > 80
      };
    } catch (error) {
      console.error('Failed to get storage stats:', error);
      return {
        usageInMB: 0,
        quotaInMB: 0,
        usagePercent: 0,
        needsCleanup: false
      };
    }
  }

  /**
   * Ferme la connexion à la base de données
   */
  close(): void {
    const dbToClose = this.db;
    if (dbToClose) {
      dbToClose.close();
      this.db = null;
    }
  }

  /**
   * Tente de forcer la fermeture de la base de données en supprimant et recréant
   * Utilisé en dernier recours quand la base est bloquée par une autre connexion
   */
  private async forceCloseDatabase(): Promise<void> {
    console.warn('[SymbiontStorage] Attempting to force close database by deleting and recreating...');
    
    // Fermer notre propre connexion d'abord
    const dbToClose = this.db;
    if (dbToClose) {
      try {
        dbToClose.close();
      } catch (error) {
        console.warn('[SymbiontStorage] Error closing our connection:', error);
      }
      this.db = null;
    }

    // Attendre un peu pour que les autres connexions se ferment
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Essayer de supprimer la base de données
    return new Promise<void>((resolve) => {
      const deleteRequest = indexedDB.deleteDatabase(this.DB_NAME);
      
      deleteRequest.onsuccess = () => {
        console.log('[SymbiontStorage] Database deleted successfully, will be recreated on next open');
        resolve();
      };
      
      deleteRequest.onerror = () => {
        const error = deleteRequest.error;
        console.warn('[SymbiontStorage] Could not delete database:', error);
        // Ne pas rejeter - on continue quand même
        resolve();
      };
      
      deleteRequest.onblocked = () => {
        console.warn('[SymbiontStorage] Database delete blocked - another connection still open');
        // Attendre un peu plus et réessayer
        setTimeout(() => {
          // Timeout après 5 secondes
          setTimeout(() => {
            console.warn('[SymbiontStorage] Database delete still blocked, giving up');
            resolve(); // On résout quand même pour continuer
          }, 5000);
        }, 1000);
      };
    });
  }
}