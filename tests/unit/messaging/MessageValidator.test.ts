import { validatePayload } from '../../../src/core/messaging/MessageBus';

describe('MessageValidator', () => {
  it('valide un ORGANISM_UPDATE correct', () => {
    const valid = validatePayload('ORGANISM_UPDATE', { id: 'a', generation: 1, health: 1, energy: 1, traits: {} });
    expect(valid).toBe(true);
  });
  it('rejette un ORGANISM_UPDATE incorrect', () => {
    const invalid = validatePayload('ORGANISM_UPDATE', { id: 1 });
    expect(invalid).toBe(false);
  });
});
