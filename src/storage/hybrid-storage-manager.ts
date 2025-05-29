// storage/hybrid-storage-manager.ts
// Système de stockage hybride multi-niveaux (Phase 1)

import { swLocalStorage, swIndexedDB } from '../background/service-worker-adapter'

export class HybridStorageManager {
  private memoryCache: Map<string, any> = new Map()
  private persistentStorage = chrome.storage?.local
  private indexedDB: IDBDatabase | null = null
  private emergencyLocalStorage = swLocalStorage

  constructor() {
    this.setupMultiLayerStorage()
    this.setupDataReplication()
    this.setupIntegrityMonitoring()
  }

  async store(key: string, data: any, options: any = {}): Promise<void> {
    // Niveau 1: Mémoire
    this.memoryCache.set(key, data)
    // Niveau 2: chrome.storage.local
    try {
      await new Promise((resolve, reject) => {
        this.persistentStorage.set({ [key]: data }, () => {
          if (chrome.runtime.lastError) reject(chrome.runtime.lastError)
          else resolve(true)
        })
      })
    } catch (e) {
      console.warn('chrome.storage.local failed, fallback IndexedDB')
    }
    // Niveau 3: IndexedDB
    try {
      if (this.indexedDB) {
        const tx = this.indexedDB.transaction(['symbiont'], 'readwrite')
        const store = tx.objectStore('symbiont')
        store.put(data, key)
      } else {
        throw new Error('IndexedDB not ready')
      }
    } catch (e) {
      // Niveau 4: localStorage d'urgence
      await this.emergencyLocalStorage.setItem(key, JSON.stringify(data))
    }
  }

  async retrieve(key: string): Promise<any> {
    // Mémoire
    if (this.memoryCache.has(key)) return this.memoryCache.get(key)
    // chrome.storage.local
    try {
      const result = await new Promise<any>((resolve, reject) => {
        this.persistentStorage.get([key], (res: any) => {
          if (chrome.runtime.lastError) reject(chrome.runtime.lastError)
          else resolve(res[key])
        })
      })
      if (result !== undefined) {
        this.memoryCache.set(key, result)
        return result
      }
    } catch (e) {
      // ignore
    }
    // IndexedDB
    try {
      if (this.indexedDB) {
        return await new Promise((resolve, reject) => {
          const tx = this.indexedDB!.transaction(['symbiont'], 'readonly')
          const store = tx.objectStore('symbiont')
          const req = store.get(key)
          req.onsuccess = () => resolve(req.result)
          req.onerror = () => reject(req.error)
        })
      }
    } catch (e) {
      // ignore
    }
    // localStorage d'urgence
    try {
      const val = await this.emergencyLocalStorage.getItem(key)
      if (val) return JSON.parse(val)
    } catch (e) {}
    return null
  }

  private setupMultiLayerStorage() {
    // Init IndexedDB
    const req = swIndexedDB.open('symbiont-db', 1)
    req.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result
      if (!db.objectStoreNames.contains('symbiont')) {
        db.createObjectStore('symbiont')
      }
    }
    req.onsuccess = () => {
      this.indexedDB = req.result
    }
    req.onerror = () => {
      this.indexedDB = null
    }
  }
  private setupDataReplication() {}
  private setupIntegrityMonitoring() {}
}

// TODO: Exporter/brancher sur le système de stockage principal 