// storage/hybrid-storage-manager.ts
// Système de stockage hybride multi-niveaux (Phase 1)

import { swLocalStorage, swIndexedDB } from '../background/service-worker-adapter'

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

  async store(key: string, data: any, _options: any = {}): Promise<void> {
    // Évite de stocker les alertes de santé qui saturent le stockage
    if (key.includes('symbiont_health_alert_')) {
      console.log('[HybridStorageManager] Skipping health alert storage to prevent quota issues');
      return;
    }
    
    console.log('[HybridStorageManager] store - Mémoire', key, data)
    this.memoryCache.set(key, data)
    try {
      await new Promise((resolve, reject) => {
        this.persistentStorage.set({ [key]: data }, () => {
          if (chrome.runtime.lastError) {
            // Gestion spéciale du quota dépassé
            if (chrome.runtime.lastError.message?.includes('quota')) {
              console.warn('[HybridStorageManager] Chrome storage quota exceeded, cleaning old data');
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
      console.log('[HybridStorageManager] store - chrome.storage.local OK', key)
    } catch (e) {
      console.warn('[HybridStorageManager] store - chrome.storage.local failed, fallback IndexedDB', key, e)
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
        console.log('[HybridStorageManager] store - IndexedDB OK', key)
      } else {
        throw new Error('IndexedDB not ready')
      }
    } catch (e) {
      console.warn('[HybridStorageManager] store - IndexedDB failed, fallback localStorage', key, e)
      await this.emergencyLocalStorage.setItem(key, JSON.stringify(data))
      console.log('[HybridStorageManager] store - localStorage d\'urgence OK', key)
    }
  }

  async retrieve(key: string): Promise<any> {
    if (this.memoryCache.has(key)) {
      console.log('[HybridStorageManager] retrieve - Mémoire HIT', key)
      return this.memoryCache.get(key)
    }
    try {
      const result = await new Promise<any>((resolve, reject) => {
        this.persistentStorage.get([key], (res: any) => {
          if (chrome.runtime.lastError) reject(chrome.runtime.lastError)
          else resolve(res[key])
        })
      })
      if (result !== undefined) {
        this.memoryCache.set(key, result)
        console.log('[HybridStorageManager] retrieve - chrome.storage.local OK', key)
        return result
      }
    } catch (e) {
      console.warn('[HybridStorageManager] retrieve - chrome.storage.local failed', key, e)
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
          console.log('[HybridStorageManager] retrieve - IndexedDB OK', key)
          return val
        }
      }
    } catch (e) {
      console.warn('[HybridStorageManager] retrieve - IndexedDB failed', key, e)
    }
    try {
      const val = await this.emergencyLocalStorage.getItem(key)
      if (val) {
        console.log('[HybridStorageManager] retrieve - localStorage d\'urgence OK', key)
        return JSON.parse(val)
      }
    } catch (e) {
      console.warn('[HybridStorageManager] retrieve - localStorage d\'urgence failed', key, e)
    }
    return null
  }

  private setupMultiLayerStorage(): Promise<boolean> {
    return new Promise((resolve) => {
      let settled = false;
      const timeout = setTimeout(() => {
        if (!settled) {
          console.warn('[HybridStorageManager] IndexedDB init timeout (5s), fallback only');
          this.indexedDB = null;
          settled = true;
          resolve(false);
        }
      }, 5000);
      try {
        const req = swIndexedDB.open('symbiont-db', 1);
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
            console.log('[HybridStorageManager] IndexedDB ready');
            resolve(true);
          }
        };
        req.onerror = () => {
          this.indexedDB = null;
          if (!settled) {
            clearTimeout(timeout);
            settled = true;
            console.warn('[HybridStorageManager] IndexedDB failed to open');
            resolve(false);
          }
        };
      } catch (e) {
        this.indexedDB = null;
        if (!settled) {
          clearTimeout(timeout);
          settled = true;
          console.warn('[HybridStorageManager] IndexedDB exception', e);
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
        console.log(`[HybridStorageManager] Cleaned ${keysToRemove.length} old storage items`);
      }
    } catch (error) {
      console.error('[HybridStorageManager] Failed to clean old storage data:', error);
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
  private async syncKeyAcrossLayers(key: string, value: any) {
    this.memoryCache.set(key, value)
    try {
      await new Promise((resolve, reject) => {
        this.persistentStorage.set({ [key]: value }, () => {
          if (chrome.runtime.lastError) reject(chrome.runtime.lastError)
          else resolve(true)
        })
      })
    } catch {}
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
    } catch {}
    try {
      await this.emergencyLocalStorage.setItem(key, JSON.stringify(value))
    } catch {}
  }

  private setupDataReplication() {
    // Synchronisation automatique sur changement chrome.storage
    if (chrome.storage && chrome.storage.onChanged) {
      chrome.storage.onChanged.addListener((changes, areaName) => {
        if (areaName === 'local') {
          for (const key in changes) {
            const { newValue } = changes[key]
            this.syncKeyAcrossLayers(key, newValue)
            console.log('[HybridStorageManager] DataReplication - Synchronisation des couches', key)
          }
        }
      })
    }
  }

  private setupIntegrityMonitoring() {
    // Vérification périodique de l'intégrité des données (toutes les 60s)
    setInterval(async () => {
      for (const key of this.memoryCache.keys()) {
        try {
          const memVal = this.memoryCache.get(key)
          const chromeVal = await new Promise<any>((resolve) => {
            this.persistentStorage.get([key], (res: any) => resolve(res[key]))
          })
          await this.indexedDBReady
          let idbVal: any = undefined
          if (this.indexedDB) {
            idbVal = await new Promise((resolve) => {
              const tx = this.indexedDB!.transaction(['symbiont'], 'readonly')
              const store = tx.objectStore('symbiont')
              const req = store.get(key)
              req.onsuccess = () => resolve(req.result)
              req.onerror = () => resolve(undefined)
            })
          }
          const localValRaw = await this.emergencyLocalStorage.getItem(key)
          const localVal = localValRaw ? JSON.parse(localValRaw) : undefined
          // Vérification de cohérence simple (JSON.stringify)
          const values = [memVal, chromeVal, idbVal, localVal].filter(v => v !== undefined)
          const allEqual = values.every(v => JSON.stringify(v) === JSON.stringify(values[0]))
          if (!allEqual) {
            console.warn('[HybridStorageManager] IntegrityMonitoring - Divergence détectée pour', key)
            // Auto-réparation naïve : on prend la valeur majoritaire ou la plus récente (TODO: améliorer)
            const valueCounts: Record<string, number> = {}
            for (const v of values) {
              const s = JSON.stringify(v)
              valueCounts[s] = (valueCounts[s] || 0) + 1
            }
            const [mostCommon] = Object.entries(valueCounts).sort((a, b) => b[1] - a[1])[0]
            const repaired = JSON.parse(mostCommon)
            // Réécriture dans toutes les couches
            this.memoryCache.set(key, repaired)
            this.persistentStorage.set({ [key]: repaired })
            if (this.indexedDB) {
              const tx = this.indexedDB.transaction(['symbiont'], 'readwrite')
              const store = tx.objectStore('symbiont')
              store.put(repaired, key)
            }
            this.emergencyLocalStorage.setItem(key, JSON.stringify(repaired))
            console.log('[HybridStorageManager] IntegrityMonitoring - Auto-réparation appliquée pour', key)
          }
        } catch (e) {
          console.warn('[HybridStorageManager] IntegrityMonitoring - Erreur sur', key, e)
        }
      }
    }, 60000) // toutes les 60 secondes
  }
}

// TODO: Exporter/brancher sur le système de stockage principal 