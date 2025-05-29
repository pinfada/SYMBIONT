import { NeuralMesh } from '../../../../src/neural/NeuralMesh';

describe('NeuralMesh', () => {
  it('crée un neurone et le connecte', () => {
    const mesh = new NeuralMesh();
    mesh.addNeuron('n1');
    mesh.addNeuron('n2');
    mesh.connect('n1', 'n2');
    expect(mesh.getConnections('n1')).toContain('n2');
  });
});
