import { SensoryNetwork } from '../../../../src/core/SensoryNetwork';

describe('SensoryNetwork', () => {
  let network: SensoryNetwork;

  beforeEach(() => {
    network = new SensoryNetwork();
    network.addSensor('vision1', 'vision', 0, 100, 0);
    network.addSensor('touch1', 'touch', -1, 1, 0.05);
  });

  it('ajoute des capteurs sans erreur', () => {
    expect(() => network.addSensor('aud1', 'audition')).not.toThrow();
  });

  it('lève une erreur sur ajout de capteur existant', () => {
    expect(() => network.addSensor('vision1', 'vision')).toThrow();
  });

  it('simule une perception normalisée', () => {
    const v = network.sense('vision1', 50);
    expect(v).toBeCloseTo(0.5, 1);
    expect(network.getInputs()['vision1']).toBeCloseTo(0.5, 1);
  });

  it('applique un bruit gaussien', () => {
    // On vérifie que la valeur varie autour de la normalisation attendue
    const values = Array.from({ length: 20 }, () => network.sense('touch1', 0));
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    expect(mean).toBeGreaterThan(0.4);
    expect(mean).toBeLessThan(0.6);
  });

  it('adapte dynamiquement la sensibilité', () => {
    network.adapt('vision1', 0, 200);
    const v = network.sense('vision1', 100);
    expect(v).toBeCloseTo(0.5, 1);
  });

  it('lève une erreur sur capteur inexistant', () => {
    expect(() => network.sense('foo', 1)).toThrow();
    expect(() => network.adapt('foo', 0, 1)).toThrow();
  });

  it('exporte un JSON cohérent', () => {
    const json = network.toJSON();
    expect(Array.isArray(json)).toBe(true);
    expect(json.length).toBeGreaterThan(0);
    expect(json[0]).toHaveProperty('id');
  });
}); 