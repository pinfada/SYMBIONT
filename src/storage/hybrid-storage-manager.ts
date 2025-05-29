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
    console.log('[HybridStorageManager] store - Mémoire', key, data)
    this.memoryCache.set(key, data)
    try {
      await new Promise((resolve, reject) => {
        this.persistentStorage.set({ [key]: data }, () => {
          if (chrome.runtime.lastError) reject(chrome.runtime.lastError)
          else resolve(true)
        })
      })
      console.log('[HybridStorageManager] store - chrome.storage.local OK', key)
    } catch (e) {
      console.warn('[HybridStorageManager] store - chrome.storage.local failed, fallback IndexedDB', key, e)
    }
    try {
      if (this.indexedDB) {
        const tx = this.indexedDB.transaction(['symbiont'], 'readwrite')
        const store = tx.objectStore('symbiont')
        store.put(data, key)
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