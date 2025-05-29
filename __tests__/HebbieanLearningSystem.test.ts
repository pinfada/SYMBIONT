import { HebbieanLearningSystem } from '../src/neural/HebbieanLearningSystem'

describe('HebbieanLearningSystem', () => {
  it('renforce, affaiblit et détecte des patterns', () => {
    const hebb = new HebbieanLearningSystem(0.1, 1)
    hebb.strengthenConnection('A', 'B', 1, 1)
    expect(hebb.getWeight('A', 'B')).toBeGreaterThan(0)
    hebb.weakenUnusedConnections()
    hebb.setActivation('A', 0.5)
    const patterns = hebb.detectEmergentPatterns()
    expect(Array.isArray(patterns)).toBe(true)
    expect(typeof hebb.toJSON()).toBe('object')
  })
}) 