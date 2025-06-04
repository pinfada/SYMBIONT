import { HybridStorageManager } from '../src/storage/hybrid-storage-manager'

describe('HybridStorageManager - Stress & Failover', () => {
  let storage: HybridStorageManager

  beforeEach(() => {
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