import { ActionPredictor } from '../../../src/behavioral/ActionPredictor';

describe('ActionPredictor', () => {
  it('prédit une action simple', () => {
    const predictor = new ActionPredictor();
    const action = predictor.predict({ context: 'test' });
    expect(action).toBeDefined();
  });
});
