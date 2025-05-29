import { CollectiveIntelligence } from '../src/social/collective-intelligence'

describe('CollectiveIntelligence', () => {
  it('propose, vote et déclenche une mutation collective', () => {
    const onMutation = jest.fn()
    const ci = new CollectiveIntelligence(onMutation)
    const mutation = { id: 'mut1', data: 42 }
    ci.proposeMutation(mutation, 'peer1')
    ci.vote('mut1', 'peer2')
    expect(ci.aggregateVotes('mut1')).toBe(2)
    const triggered = ci.triggerCollectiveMutation('mut1', 2)
    expect(triggered).toBe(true)
    expect(onMutation).toHaveBeenCalledWith('mut1')
  })
}) 