import { OrganismCore } from '../../../../src/core/OrganismCore';

describe('OrganismCore', () => {
  let core: OrganismCore;

  beforeEach(() => {
    core = new OrganismCore('TESTDNA', { curiosity: 0.8 });
  });

  it('s instancie et initialise les valeurs par défaut', () => {
    const traits = core.getTraits();
    expect(traits.curiosity).toBe(0.8);
    expect(traits.energy).toBe(0.5);
    expect(core.getState().energy).toBe(1.0);
    expect(core.getState().health).toBe(1.0);
  });

  it('stimule et propage, modifiant l energie', () => {
    const before = core.getState().energy;
    core.stimulate('perception', 1);
    core.propagate();
    const after = core.getState().energy;
    expect(after).not.toBe(before);
  });

  it('applique une mutation (DNA et mesh)', () => {
    const beforeDNA = core.getState().visualDNA;
    core.mutate(1);
    const afterDNA = core.getState().visualDNA;
    expect(afterDNA).not.toBe(beforeDNA);
  });

  it('getTraits et setTraits fonctionnent', () => {
    core.setTraits({ empathy: 0.9 });
    expect(core.getTraits().empathy).toBe(0.9);
  });

  it('getState retourne un état cohérent', () => {
    const state = core.getState();
    expect(state.traits).toBeDefined();
    expect(state.energy).toBeGreaterThanOrEqual(0);
    expect(state.health).toBeGreaterThanOrEqual(0);
    expect(state.visualDNA).toBe('TESTDNA');
  });

  it('toJSON exporte un objet complet', () => {
    const json = core.toJSON();
    expect(json.mesh).toBeDefined();
    expect(json.traits).toBeDefined();
    expect(json.energy).toBeDefined();
    expect(json.dna).toBe('TESTDNA');
  });

  it('getShaderParameters retourne des paramètres valides', () => {
    const params = core.getShaderParameters();
    expect(params).toHaveProperty('primaryColor');
    expect(params).toHaveProperty('complexity');
  });

  it('lève une erreur si on stimule une entrée invalide', () => {
    expect(() => core.stimulate('foo', 1)).toThrow();
  });
});
