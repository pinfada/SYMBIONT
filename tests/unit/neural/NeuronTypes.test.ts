import { NeuronTypes } from '../../../../src/neural/NeuronTypes';

describe('NeuronTypes', () => {
  it('définit un type de neurone', () => {
    const type = NeuronTypes.createType('sensor', { threshold: 0.5 });
    expect(type.name).toBe('sensor');
    expect(type.config.threshold).toBe(0.5);
  });
});
