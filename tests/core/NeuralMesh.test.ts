import { NeuralMesh } from '../../src/core/NeuralMesh';

describe('NeuralMesh', () => {
  let neuralMesh: NeuralMesh;

  beforeEach(() => {
    neuralMesh = new NeuralMesh();
  });

  test('should initialize successfully', async () => {
    await expect(neuralMesh.initialize()).resolves.not.toThrow();
  });

  test('should suspend successfully', async () => {
    await expect(neuralMesh.suspend()).resolves.not.toThrow();
  });

  test('should measure performance', async () => {
    const metrics = await neuralMesh.measurePerformance();
    
    expect(metrics).toHaveProperty('cpu');
    expect(metrics).toHaveProperty('memory');
    expect(metrics.cpu).toBeLessThan(1);
    expect(metrics.memory).toBeLessThan(5);
  });
}); 