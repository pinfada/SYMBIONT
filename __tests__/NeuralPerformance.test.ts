import { NeuralMeshAsync } from '../src/core/NeuralMeshAsync';
import { NeuralMesh } from '../src/core/NeuralMesh';

describe('Neural Performance Tests', () => {
  let asyncMesh: NeuralMeshAsync;
  let syncMesh: NeuralMesh;
  
  beforeEach(() => {
    asyncMesh = new NeuralMeshAsync('test-network');
    syncMesh = new NeuralMesh();
  });

  afterEach(async () => {
    if (asyncMesh) {
      await asyncMesh.suspend();
    }
  });

  it('should initialize within reasonable time', async () => {
    const startTime = performance.now();
    await asyncMesh.initialize();
    const endTime = performance.now();
    
    const initTime = endTime - startTime;
    expect(initTime).toBeLessThan(1000); // Should init within 1 second
  });

  it('should track performance metrics', async () => {
    await asyncMesh.initialize();
    
    // Stimulate network
    asyncMesh.stimulate('sensory_input', 0.8);
    asyncMesh.stimulate('memory_input', 0.6);
    
    // Perform propagation
    await asyncMesh.propagate();
    
    const metrics = asyncMesh.getPerformanceMetrics();
    expect(metrics.operationCount).toBeGreaterThan(0);
    expect(metrics.lastPropagationTime).toBeGreaterThanOrEqual(0);
    expect(metrics.averageProcessingTime).toBeGreaterThanOrEqual(0);
  });

  it('should handle mutations efficiently', async () => {
    await asyncMesh.initialize();
    
    const startTime = performance.now();
    await asyncMesh.mutate(0.1);
    const endTime = performance.now();
    
    expect(endTime - startTime).toBeLessThan(100); // Should be fast
  });

  it('should report memory usage', async () => {
    await asyncMesh.initialize();
    
    const memoryUsage = await asyncMesh.getMemoryUsage();
    expect(memoryUsage).toBeGreaterThan(0);
    expect(memoryUsage).toBeLessThanOrEqual(1); // Normalized to 0-1
  });

  it('should report CPU usage', async () => {
    await asyncMesh.initialize();
    
    const cpuUsage = await asyncMesh.getCPUUsage();
    expect(cpuUsage).toBeGreaterThanOrEqual(0);
    expect(cpuUsage).toBeLessThanOrEqual(1); // Normalized to 0-1
  });

  it('should handle large networks', async () => {
    // Create a larger network
    for (let i = 0; i < 50; i++) {
      asyncMesh.addNode(`node_${i}`, i < 10 ? 'input' : i > 40 ? 'output' : 'hidden');
    }
    
    // Add connections
    for (let i = 0; i < 40; i++) {
      for (let j = 10; j < 50; j++) {
        if (Math.random() < 0.2) { // 20% connectivity
          asyncMesh.addConnection(`node_${i}`, `node_${j}`, Math.random() - 0.5);
        }
      }
    }
    
    await asyncMesh.initialize();
    
    const startTime = performance.now();
    await asyncMesh.propagate();
    const endTime = performance.now();
    
    // Should complete within reasonable time
    expect(endTime - startTime).toBeLessThan(300); // 300ms max
  });

  it('should maintain worker readiness status', async () => {
    await asyncMesh.initialize();
    
    const metrics = asyncMesh.getPerformanceMetrics();
    expect(typeof metrics.workerReady).toBe('boolean');
  });
}); 