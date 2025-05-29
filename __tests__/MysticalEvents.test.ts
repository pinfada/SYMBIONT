import { MysticalEvents } from '../src/social/mystical-events'

describe('MysticalEvents', () => {
  it('déclenche et propage un événement mystique', () => {
    const me = new MysticalEvents()
    expect(() => me.triggerMysticalEvent('evt1', { foo: 1 })).not.toThrow()
    expect(() => me.propagateToCommunity('evt1', { foo: 1 })).not.toThrow()
    expect(() => me.applySpecialEffect('effet')).not.toThrow()
  })
}) 