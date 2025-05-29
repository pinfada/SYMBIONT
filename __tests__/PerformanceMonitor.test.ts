import { PerformanceMonitor } from '../src/monitoring/PerformanceMonitor'

describe('PerformanceMonitor', () => {
  it('démarre, arrête et mesure la charge', () => {
    const pm = new PerformanceMonitor(0.5)
    pm.startFrame()
    pm.endFrame()
    expect(typeof pm.getCurrentLoad()).toBe('number')
    expect(typeof pm.isOverloaded()).toBe('boolean')
    expect(typeof pm.getMetrics()).toBe('object')
  })
}) 