import { MutationEngine } from '../../../src/generative/MutationEngine';

describe('MutationEngine', () => {
  it('applique une mutation sans erreur', () => {
    const engine = new MutationEngine();
    const state = { id: 'a', generation: 1, health: 1, energy: 1, traits: { curiosity: 1 } };
    const mutation = { type: 'color_shift', magnitude: 0.5 };
    expect(() => engine.applyMutation(state, mutation)).not.toThrow();
  });
});
