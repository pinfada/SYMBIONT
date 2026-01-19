// storage/hybrid-storage-manager.ts
// Système de stockage hybride multi-niveaux (Phase 1)

import { logger } from '@/shared/utils/secureLogger';

// Fallback pour les APIs manquantes dans le service worker
const swLocalStorage = {
  getItem: (key: string) => {
    try {
      return typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null;
    } catch {
      return null;
    }
  },
  setItem: (key: string, value: string) => {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(key, value);
      }
    } catch {
      // Silently fail in service worker context
    }
  },
  removeItem: (key: string) => {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem(key);
      }
    } catch {
      // Silently fail in service worker context
    }
  },
  clear: () => {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.clear();
      }
    } catch {
      // Silently fail in service worker context
    }
  }
};

const swIndexedDB = typeof indexedDB !== 'undefined' ? indexedDB : null;

/**
 * HybridStorageManager
 * Système de stockage hybride multi-niveaux (mémoire, chrome.storage, IndexedDB, localStorage d'urgence)
 * Assure la cohérence, la réplication et l'auto-réparation des données critiques.
 *
 * Exemple d'utilisation :
 *   const storage = new HybridStorageManager();
 *   await storage.store('clé', { valeur: 42 });
 *   const data = await storage.retrieve('clé');
 */
export class HybridStorageManager {
  private memoryCache: Map<string, any> = new Map()
  private persistentStorage = chrome.storage?.local
  private indexedDB: IDBDatabase | null = null
  private emergencyLocalStorage = swLocalStorage
  private indexedDBReady: Promise<boolean>

  constructor() {
    this.indexedDBReady = this.setupMultiLayerStorage()
    this.setupDataReplication()
    this.setupIntegrityMonitoring()
  }

  async store(key: string, data: unknown): Promise<void> {
    // Évite de stocker les alertes de santé qui saturent le stockage
    if (key.includes('symbiont_health_alert_')) {
      logger.info('[HybridStorageManager] Skipping health alert storage to prevent quota issues');
      return;
    
    }
    
    logger.info('[HybridStorageManager] store - Mémoire', { key, data })
    this.memoryCache.set(key, data)
    try {
      await new Promise((resolve, reject) => {
        this.persistentStorage.set({ [key]: data }, () => {
          if (chrome.runtime.lastError) {
            // Gestion spéciale du quota dépassé
            if (chrome.runtime.lastError.message?.includes('quota')) {
              logger.warn('[HybridStorageManager] Chrome storage quota exceeded, cleaning old data');
              this.cleanOldStorageData().then(() => {
                // Retry après nettoyage
                this.persistentStorage.set({ [key]: data }, () => {
                  if (chrome.runtime.lastError) reject(chrome.runtime.lastError)
                  else resolve(true)
                })
              }).catch(reject);
            } else {
              reject(chrome.runtime.lastError)
            }
          } else {
            resolve(true)
          }
        })
      })
      logger.info('[HybridStorageManager] store - chrome.storage.local OK', key)
    } catch (_e) {
      logger.warn('[HybridStorageManager] store - chrome.storage.local failed, fallback IndexedDB', { key, error: String(_e) })
    }
    try {
      await this.indexedDBReady
      if (this.indexedDB) {
        await new Promise((resolve, reject) => {
          const tx = this.indexedDB!.transaction(['symbiont'], 'readwrite')
          const store = tx.objectStore('symbiont')
          const req = store.put(data, key)
          req.onsuccess = () => resolve(true)
          req.onerror = () => reject(req.error)
        })
        logger.info('[HybridStorageManager] store - IndexedDB OK', key)
      } else {
        throw new Error('IndexedDB not ready')
      }
    } catch (_e) {
      logger.warn('[HybridStorageManager] store - IndexedDB failed, fallback localStorage', { key, error: String(_e) })
      await this.emergencyLocalStorage.setItem(key, JSON.stringify(data))
      logger.info('[HybridStorageManager] store - localStorage d\'urgence OK', key)
    }
  }

  async retrieve(key: string): Promise<unknown> {
    if (this.memoryCache.has(key)) {
      logger.info('[HybridStorageManager] retrieve - Mémoire HIT', key)
      return this.memoryCache.get(key)
    }
    try {
      const result = await new Promise<unknown>((resolve, reject) => {
        this.persistentStorage.get([key], (res: any) => {
          if (chrome.runtime.lastError) reject(chrome.runtime.lastError)
          else resolve(res[key])
        })
      })
      if (result !== undefined) {
        this.memoryCache.set(key, result)
        logger.info('[HybridStorageManager] retrieve - chrome.storage.local OK', key)
        return result
      }
    } catch (_e) {
      logger.warn('[HybridStorageManager] retrieve - chrome.storage.local failed', { key, error: String(_e) })
    }
    try {
      await this.indexedDBReady
      if (this.indexedDB) {
        const val = await new Promise((resolve, reject) => {
          const tx = this.indexedDB!.transaction(['symbiont'], 'readonly')
          const store = tx.objectStore('symbiont')
          const req = store.get(key)
          req.onsuccess = () => resolve(req.result)
          req.onerror = () => reject(req.error)
        })
        if (val !== undefined) {
          this.memoryCache.set(key, val)
          logger.info('[HybridStorageManager] retrieve - IndexedDB OK', key)
          return val
        }
      }
    } catch (_e) {
      logger.warn('[HybridStorageManager] retrieve - IndexedDB failed', { key, error: String(_e) })
    }
    try {
      const val = await this.emergencyLocalStorage.getItem(key)
      if (val) {
        logger.info('[HybridStorageManager] retrieve - localStorage d\'urgence OK', key)
        return JSON.parse(val)
      }
    } catch (_e) {
      logger.warn('[HybridStorageManager] retrieve - localStorage d\'urgence failed', { key, error: String(_e) })
    }
    return null
  }

  private setupMultiLayerStorage(): Promise<boolean> {
    return new Promise((resolve) => {
      let settled = false;
      const timeout = setTimeout(() => {
        if (!settled) {
          logger.warn('[HybridStorageManager] IndexedDB init timeout (5s), fallback only');
          this.indexedDB = null;
          settled = true;
          resolve(false);
        }
      }, 5000);
      try {
        const req = swIndexedDB?.open('symbiont-db', 1);
        if (!req) {
          throw new Error('IndexedDB not available');
        }
        req.onupgradeneeded = (event) => {
          const db = (event.target as IDBOpenDBRequest).result;
          if (!db.objectStoreNames.contains('symbiont')) {
            db.createObjectStore('symbiont');
          }
        };
        req.onsuccess = () => {
          this.indexedDB = req.result;
          if (!settled) {
            clearTimeout(timeout);
            settled = true;
            logger.info('[HybridStorageManager] IndexedDB ready');
            resolve(true);
          }
        };
        req.onerror = () => {
          this.indexedDB = null;
          if (!settled) {
            clearTimeout(timeout);
            settled = true;
            logger.warn('[HybridStorageManager] IndexedDB failed to open');
            resolve(false);
          }
        };
      } catch (_e) {
        this.indexedDB = null;
        if (!settled) {
          clearTimeout(timeout);
          settled = true;
          logger.warn('[HybridStorageManager] IndexedDB exception', _e);
          resolve(false);
        }
      }
    });
  }

  private async cleanOldStorageData(): Promise<void> {
    try {
      // Nettoie les anciennes alertes de santé et autres données temporaires
      const allKeys = await new Promise<string[]>((resolve, reject) => {
        this.persistentStorage.get(null, (items) => {
          if (chrome.runtime.lastError) reject(chrome.runtime.lastError)
          else resolve(Object.keys(items))
        
    })
      });
      
      const keysToRemove = allKeys.filter(key => 
        key.includes('symbiont_health_alert_') ||
        key.includes('broadcast_') ||
        key.includes('_temp_')
      );
      
      if (keysToRemove.length > 0) {
        await new Promise<void>((resolve, reject) => {
          this.persistentStorage.remove(keysToRemove, () => {
            if (chrome.runtime.lastError) reject(chrome.runtime.lastError)
            else resolve()
          })
        });
        logger.info(`[HybridStorageManager] Cleaned ${keysToRemove.length} old storage items`);
      }
    } catch (error) {
      logger.error('[HybridStorageManager] Failed to clean old storage data:', error);
    }
  }

  public isIndexedDBReady(): boolean {
    return !!this.indexedDB;
  }

  public async syncData() {
    // TODO: synchroniser les données entre les couches si besoin
  }

  /**
   * Synchronise une clé et sa valeur sur toutes les couches de stockage.
   * Utilisé lors de la réplication ou de l'auto-réparation.
   */
  private async syncKeyAcrossLayers(key: string, value: unknown) {
    this.memoryCache.set(key, value)
    try {
      await new Promise((resolve, reject) => {
        this.persistentStorage.set({ [key]: value }, () => {
          if (chrome.runtime.lastError) reject(chrome.runtime.lastError)
          else resolve(true)
        })
      })
    } catch (error) {
      console.warn('Storage operation failed:', error);
    }
    try {
      await this.indexedDBReady
      if (this.indexedDB) {
        await new Promise((resolve, reject) => {
          const tx = this.indexedDB!.transaction(['symbiont'], 'readwrite')
          const store = tx.objectStore('symbiont')
          const req = store.put(value, key)
          req.onsuccess = () => resolve(true)
          req.onerror = () => reject(req.error)
        })
      }
    } catch (error) {
      console.warn('Storage operation failed:', error);
    }
    try {
      await this.emergencyLocalStorage.setItem(key, JSON.stringify(value))
    } catch (error) {
      console.warn('Storage operation failed:', error);
    }
  }

  private setupDataReplication() {
    // DÉSACTIVÉ: La réplication automatique causait des boucles d'écriture infinies
    // qui saturaient IndexedDB et la RAM (3GB+).
    //
    // L'ancienne implémentation écoutait chrome.storage.onChanged et
    // synchronisait chaque changement sur toutes les couches, créant
    // une cascade d'écritures qui bloquait le système avec l'erreur:
    // "IndexedDB open request timeout - no response from browser after 60000ms"
    //
    // Pour une réplication coordonnée, utiliser ResilientStorageManager à la place
    // qui gère la cohérence avec backpressure et coalescing.
    logger.info('[HybridStorageManager] DataReplication disabled to prevent infinite write loops');
  }

  private setupIntegrityMonitoring() {
    // Vérification périodique de l'intégrité des données
    // MODIFIÉ: Intervalle augmenté de 60s à 5 minutes et limité aux clés critiques
    // pour éviter la saturation qui causait le timeout IndexedDB
    const CRITICAL_KEY_PATTERNS = ['organism_state', 'neural_mesh', 'consciousness_state'];
    const CHECK_INTERVAL = 300000; // 5 minutes au lieu de 60 secondes

    setInterval(async () => {
      // Ne vérifier que les clés critiques pour éviter la surcharge
      const criticalKeys = Array.from(this.memoryCache.keys())
        .filter(key => CRITICAL_KEY_PATTERNS.some(pattern => key.includes(pattern)))
        .slice(0, 3); // Max 3 clés par cycle

      for (const key of criticalKeys) {
        try {
          const memVal = this.memoryCache.get(key)
          const chromeVal = await new Promise<unknown>((resolve) => {
            this.persistentStorage.get([key], (res: any) => resolve(res[key]))
          })

          // Comparaison simplifiée: seulement mémoire vs chrome.storage
          // IndexedDB et localStorage sont des fallbacks, pas des sources de vérité
          if (memVal !== undefined && chromeVal !== undefined) {
            const memString = JSON.stringify(memVal)
            const chromeString = JSON.stringify(chromeVal)

            if (memString !== chromeString) {
              logger.warn('[HybridStorageManager] IntegrityMonitoring - Divergence détectée pour', key)
              // Préférer la valeur mémoire (plus récente)
              this.persistentStorage.set({ [key]: memVal })
              logger.info('[HybridStorageManager] IntegrityMonitoring - Synchronisation appliquée pour', key)
            }
          }
        } catch (_e) {
          logger.warn('[HybridStorageManager] IntegrityMonitoring - Erreur sur', { key, error: String(_e) })
        }

        // Pause entre les vérifications pour éviter la saturation
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }, CHECK_INTERVAL)
  }
}

// TODO: Exporter/brancher sur le système de stockage principal 