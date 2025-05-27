import { NeuralMesh } from '../../../../src/core/neural/NeuralMesh';

describe('NeuralMesh', () => {
  let mesh: NeuralMesh;

  beforeEach(() => {
    mesh = new NeuralMesh();
    mesh.addNode('in1', 'input');
    mesh.addNode('h1', 'hidden');
    mesh.addNode('out1', 'output');
    mesh.addConnection('in1', 'h1', 0.8);
    mesh.addConnection('h1', 'out1', 1.2);
  });

  it('crée des nœuds et des connexions', () => {
    expect(() => mesh.addNode('in2', 'input')).not.toThrow();
    expect(() => mesh.addConnection('in1', 'in2')).not.toThrow();
  });

  it('lève une erreur sur ajout de nœud existant', () => {
    expect(() => mesh.addNode('in1', 'input')).toThrow();
  });

  it('lève une erreur sur connexion vers nœud inexistant', () => {
    expect(() => mesh.addConnection('in1', 'foo')).toThrow();
  });

  it('stimule un nœud d’entrée et propage l’activation', () => {
    mesh.stimulate('in1', 1);
    mesh.propagate();
    const h1 = mesh.getActivation('h1');
    const out1 = mesh.getActivation('out1');
    expect(h1).toBeGreaterThan(0);
    expect(out1).toBeGreaterThan(0);
  });

  it('lève une erreur si on stimule un nœud non input', () => {
    expect(() => mesh.stimulate('h1', 1)).toThrow();
  });

  it('adapte les poids par plasticité', () => {
    mesh.stimulate('in1', 1);
    mesh.propagate();
    const before = mesh.toJSON().connections.map(c => c.weight);
    mesh.adapt(0.1);
    const after = mesh.toJSON().connections.map(c => c.weight);
    expect(after[0]).not.toBe(before[0]);
  });

  it('applique une mutation aléatoire', () => {
    const before = mesh.toJSON().connections.map(c => c.weight);
    mesh.mutate(1); // force mutation sur tous
    const after = mesh.toJSON().connections.map(c => c.weight);
    expect(after[0]).not.toBe(before[0]);
  });

  it('réinitialise toutes les activations', () => {
    mesh.stimulate('in1', 1);
    mesh.propagate();
    mesh.reset();
    expect(mesh.getActivation('in1')).toBe(0);
    expect(mesh.getActivation('h1')).toBe(0);
    expect(mesh.getActivation('out1')).toBe(0);
  });

  it('exporte un JSON cohérent', () => {
    const json = mesh.toJSON();
    expect(json.nodes.length).toBeGreaterThan(0);
    expect(json.connections.length).toBeGreaterThan(0);
  });

  it('lève une erreur sur getActivation d’un nœud inexistant', () => {
    expect(() => mesh.getActivation('foo')).toThrow();
  });
}); 