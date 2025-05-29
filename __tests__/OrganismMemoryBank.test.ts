import { OrganismMemoryBank } from '../src/background/OrganismMemoryBank'
import { OrganismState } from '../src/shared/types/organism'
import { SecurityManager } from '../src/background/SecurityManager'

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
  const security = new SecurityManager()
  const memory = new OrganismMemoryBank(security)
  const org: OrganismState = {
    id: 'test', generation: 1, dna: 'abc', traits: { curiosity: 0.5, focus: 0.7, rhythm: 0.6, empathy: 0.8, creativity: 0.9 }, birthTime: 123, lastMutation: null, mutations: [], socialConnections: [], memoryFragments: []
  }

  it('sauvegarde et charge un organisme (chiffré)', async () => {
    await memory.saveOrganismState('test', org)
    const history = await memory.loadOrganismHistory('test')
    expect(history.states[0]).toMatchObject(org)
  })
}) 