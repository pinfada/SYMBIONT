import { DNAInterpreter } from '../../../src/generative/DNAInterpreter';

describe('DNAInterpreter', () => {
  it('interprète un ADN de façon déterministe', () => {
    const dna = 'TESTDNA';
    const interpreter1 = new DNAInterpreter(dna);
    const interpreter2 = new DNAInterpreter(dna);
    expect(interpreter1.interpret()).toEqual(interpreter2.interpret());
  });
});
