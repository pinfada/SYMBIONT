import { OrganismMemoryBank } from '../src/background/OrganismMemoryBank'
import { OrganismState } from '../src/shared/types/organism'

// Mock chrome.storage.local
const storage: Record<string, any> = {}
const chrome: any = {
  storage: {
    local: {
      set: (obj: any, cb: () => void) => {
        Object.assign(storage, obj)
        cb()
      },
      get: (keys: string[], cb: (result: any) => void) => {
        const result: any = {}
        keys.forEach(k => { if (storage[k]) result[k] = storage[k] })
        cb(result)
      }
    }
  },
  runtime: { lastError: null }
}
;(global as any).chrome = chrome

describe('OrganismMemoryBank', () => {
  const memory = new OrganismMemoryBank()
  const org: OrganismState = {
    id: 'test', generation: 1, dna: 'abc', traits: { curiosity: 0.5 }, birthTime: 123, lastMutation: null, mutations: [], socialConnections: [], memoryFragments: []
  }

  it('sauvegarde et charge un organisme (chiffré)', async () => {
    await memory.saveOrganismState('test', org)
    const history = await memory.loadOrganismHistory('test')
    expect(history.states[0]).toMatchObject(org)
  })
}) 