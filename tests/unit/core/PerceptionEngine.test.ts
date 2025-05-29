import { PerceptionEngine, Feature, Filter } from '../../../src/core/PerceptionEngine';

describe('PerceptionEngine', () => {
  let engine: PerceptionEngine;

  beforeEach(() => {
    engine = new PerceptionEngine();
  });

  it('traite des entrées sans filtre', () => {
    const features: Feature = engine.process({ a: 1, b: 2 });
    expect(features).toEqual({ a: 1, b: 2 });
    expect(engine.getFeatures()).toEqual({ a: 1, b: 2 });
  });

  it('ajoute et applique un filtre de moyenne', () => {
    const meanFilter: Filter = (inputs: Feature) => {
      const sum = Object.values(inputs).reduce((a, b) => Number(a) + Number(b), 0 as number);
      const avg = sum / Object.keys(inputs).length;
      return Object.fromEntries(Object.keys(inputs).map(k => [k, avg]));
    };
    engine.addFilter(meanFilter);
    const features = engine.process({ x: 2, y: 4 });
    expect(features.x).toBeCloseTo(3);
    expect(features.y).toBeCloseTo(3);
  });

  it('ajoute et applique un filtre de seuillage', () => {
    const thresholdFilter: Filter = (inputs: Feature) => {
      return Object.fromEntries(Object.entries(inputs).map(([k, v]) => [k, (v as number) > 0.5 ? 1 : 0]));
    };
    engine.addFilter(thresholdFilter);
    const features = engine.process({ a: 0.3, b: 0.7 });
    expect(features.a).toBe(0);
    expect(features.b).toBe(1);
  });

  it('chaîne plusieurs filtres', () => {
    engine.addFilter((inputs: Feature) => ({ ...inputs, z: 1 }));
    engine.addFilter((inputs: Feature) => {
      const out = { ...inputs };
      out.z = (out.z as number) * 2;
      return out;
    });
    const features = engine.process({ x: 0 });
    expect(features.z).toBe(2);
  });

  it('reset réinitialise les features', () => {
    engine.process({ a: 1 });
    engine.reset();
    expect(engine.getFeatures()).toEqual({});
  });

  it('toJSON exporte un objet cohérent', () => {
    engine.process({ a: 1 });
    const json = engine.toJSON();
    expect(json.filters).toBeGreaterThanOrEqual(0);
    expect(json.lastFeatures).toBeDefined();
  });

  it('gère le cas d\'entrée vide', () => {
    const features = engine.process({});
    expect(features).toEqual({});
  });
}); 