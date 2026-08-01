import { HybridStorageManager } from '../src/storage/hybrid-storage-manager'

describe('HybridStorageManager - Stress & Failover', () => {
  let storage: HybridStorageManager
  let chromeStore: Record<string, any>

  beforeEach(() => {
    // Mock chrome.storage.local FONCTIONNEL (en mémoire). Le mock global de
    // setup.ts expose get/set/remove comme des jest.fn SANS implémentation :
    // les callbacks ne sont jamais invoqués, donc les Promises de store()/
    // retrieve() ne se résolvent jamais et la suite pend jusqu'au timeout
    // (~240s). On installe ici de vraies fonctions (pas jest.fn → survivent à
    // resetMocks) qui appellent bien leurs callbacks.
    chromeStore = {}
    const g = global as any
    g.chrome = g.chrome || {}
    g.chrome.runtime = g.chrome.runtime || {}
    g.chrome.runtime.lastError = undefined
    g.chrome.storage = {
      local: {
        get: (keys: any, cb: any) => {
          const result: Record<string, any> = {}
          if (keys === null || keys === undefined) {
            Object.assign(result, chromeStore)
          } else if (Array.isArray(keys)) {
            for (const k of keys) if (k in chromeStore) result[k] = chromeStore[k]
          } else if (typeof keys === 'string') {
            if (keys in chromeStore) result[keys] = chromeStore[keys]
          } else if (typeof keys === 'object') {
            for (const k of Object.keys(keys)) result[k] = (k in chromeStore) ? chromeStore[k] : keys[k]
          }
          cb(result)
        },
        set: (obj: Record<string, any>, cb?: any) => {
          Object.assign(chromeStore, obj)
          if (cb) cb()
        },
        remove: (keys: any, cb?: any) => {
          const arr = Array.isArray(keys) ? keys : [keys]
          for (const k of arr) delete chromeStore[k]
          if (cb) cb()
        },
        clear: (cb?: any) => {
          chromeStore = {}
          if (cb) cb()
        }
      }
    }

    storage = new HybridStorageManager()
  })

  it('stocke et récupère 1000 clés sans perte', async () => {
    const N = 1000
    for (let i = 0; i < N; i++) {
      await storage.store('key' + i, { v: i })
    }
    let ok = true
    for (let i = 0; i < N; i++) {
      const val = await storage.retrieve('key' + i)
      if (!val || val.v !== i) ok = false
    }
    expect(ok).toBe(true)
  })

  it('récupère la donnée après corruption mémoire (failover chrome.storage)', async () => {
    await storage.store('failover', { v: 42 })
    // Simule une corruption mémoire
    ;(storage as any).memoryCache.clear()
    const val = await storage.retrieve('failover')
    expect(val && val.v).toBe(42)
  })

  it('récupère la donnée après corruption chrome.storage (failover IndexedDB/localStorage)', async () => {
    await storage.store('failover2', { v: 99 })
    // Simule une corruption chrome.storage
    const orig = storage['persistentStorage']
    storage['persistentStorage'] = { get: (_: any, cb: any) => cb({}), set: (_: any, cb: any) => cb() } as any
    const val = await storage.retrieve('failover2')
    expect(val && val.v).toBe(99)
    storage['persistentStorage'] = orig
  })

  it('auto-répare une divergence entre couches', async () => {
    await storage.store('diverge', { v: 1 })
    // Simule une divergence : mémoire = 1, chrome.storage = 2, localStorage = 1
    storage['memoryCache'].set('diverge', { v: 1 })
    await storage['persistentStorage'].set({ diverge: { v: 2 } }, () => {})
    await storage['emergencyLocalStorage'].setItem('diverge', JSON.stringify({ v: 1 }))
    // Déclenche le monitoring d'intégrité manuellement
    await (storage as any).setupIntegrityMonitoring()
    // Après monitoring, la valeur majoritaire (1) doit être restaurée partout
    const val = await storage.retrieve('diverge')
    expect(val && val.v).toBe(1)
  })
}) 