import { ResilientMessageBus } from '../src/communication/resilient-message-bus'

describe('ResilientMessageBus', () => {
  it('gère la queue et envoie un message', async () => {
    // Mock du swLocalStorage
    const store: Record<string, any> = {}
    global.swLocalStorage = {
      getItem: async (k: string) => store[k] || null,
      setItem: async (k: string, v: string) => { store[k] = v }
    }
    // Mock chrome pour le service-worker-adapter
    global.chrome = {
      storage: {
        local: {
          set: (obj: any, cb?: () => void) => { Object.assign(store, obj); if (typeof cb === 'function') cb() },
          get: (keys: any, cb?: (result: any) => void) => {
            const result: any = {}
            const arr = Array.isArray(keys) ? keys : (keys ? [keys] : [])
            arr.forEach((k: string) => { if (store[k]) result[k] = store[k] })
            if (typeof cb === 'function') cb(result)
            else return Promise.resolve(result)
          }
        }
      },
      runtime: { lastError: undefined } as any
    } as any
    const bus = new ResilientMessageBus()
    await bus['messageQueue'].enqueue({ type: 'TEST', payload: 1 })
    const all = await bus['messageQueue'].getAll()
    expect(all.length).toBe(1)
    const msg = await bus['messageQueue'].dequeue()
    expect(msg).toBeDefined()
    if (msg) expect(msg.type).toBe('TEST')
  })
}) 