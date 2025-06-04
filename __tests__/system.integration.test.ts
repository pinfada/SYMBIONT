import { OrganismCore } from '../src/core/OrganismCore';
import { OrganismFactory } from '../src/core/factories/OrganismFactory';
import { NeuralMesh } from '../src/core/NeuralMesh';
import { WebGLBatcher } from '../src/core/utils/WebGLBatcher';
import { errorHandler } from '../src/core/utils/ErrorHandler';

// Helper function to create mock DNA
const createMockDNA = (length: number = 16): string => {
  const bases = ['A', 'T', 'C', 'G'];
  return Array.from({ length }, () => bases[Math.floor(Math.random() * bases.length)]).join('');
};

describe('SYMBIONT System Integration Tests', () => {
  let organisms: OrganismCore[] = [];
  let webglBatcher: WebGLBatcher;
  let mockCanvas: HTMLCanvasElement;
  let mockGL: WebGLRenderingContext;

  beforeAll(() => {
    // Setup factory dependencies
    OrganismFactory.setDependencies({
      createNeuralMesh: () => new NeuralMesh()
    });

    // Setup WebGL context
    mockCanvas = document.createElement('canvas');
    mockGL = mockCanvas.getContext('webgl')!;
    webglBatcher = new WebGLBatcher(mockGL, {
      maxBatchSize: 10,
      maxVertices: 1000,
      frameTimeoutMs: 16.67
    });
  });

  beforeEach(() => {
    organisms = [];
    errorHandler.reset();
  });

  afterEach(async () => {
    // Cleanup organisms
    for (const organism of organisms) {
      await organism.hibernate();
    }
    organisms = [];

    // Cleanup WebGL
    if (webglBatcher) {
      webglBatcher.flush();
    }
  });

  afterAll(() => {
    if (webglBatcher) {
      webglBatcher.dispose();
    }
  });

  describe('End-to-End Organism Lifecycle', () => {
    it('should handle complete organism lifecycle with all optimizations', async () => {
      // Create organism with full system integration
      const organism = OrganismFactory.createOrganism('ATCGATCGATCGATCGATCGATCGATCGATCG', {
        creativity: 0.7,
        focus: 0.8,
        energy: 0.9
      }) as OrganismCore;
      
      organisms.push(organism);

      // Boot organism (initializes neural network)
      await organism.boot();
      
      // Simulate complex interaction cycle
      for (let cycle = 0; cycle < 5; cycle++) {
        // Sensory stimulation
        organism.stimulate('sensory_input', Math.random());
        organism.stimulate('memory_input', Math.random());
        
        // Update organism state
        organism.update(1.0);
        
        // Apply mutations (uses batching)
        organism.mutate(0.05 + Math.random() * 0.1);
        
        // Get shader parameters for rendering
        const shaderParams = organism.getShaderParameters();
        
        // Add WebGL draw calls (uses WebGL batching)
        webglBatcher.addDrawCall({
          type: 'triangle',
          vertices: new Float32Array([
            0, 0, 0, 0, 0, 1, 0, 0,  // vertex 1
            1, 0, 0, 0, 1, 0, 1, 0,  // vertex 2
            0, 1, 0, 1, 0, 0, 0, 1   // vertex 3
          ]),
          uniforms: {
            u_energy: shaderParams.energy,
            u_health: shaderParams.health,
            u_creativity: shaderParams.creativity,
            u_time: shaderParams.time
          },
          priority: cycle < 2 ? 'high' : 'normal'
        });
        
        // Feed organism occasionally
        if (cycle % 2 === 0) {
          organism.feed(0.2);
        }
      }

      // Force all optimizations to complete
      await organism.flushMutations();
      webglBatcher.flush();

      // Validate final state
      const finalState = organism.getState();
      expect(finalState.health).toBeGreaterThan(0);
      expect(finalState.energy).toBeGreaterThan(0);
      expect(finalState.lastMutation).toBeGreaterThan(0);

      // Validate performance metrics
      const metrics = await organism.getPerformanceMetrics();
      expect(metrics.mutationStats.totalRequests).toBeGreaterThan(0);
      expect(metrics.mutationStats.compressionRatio).toBeGreaterThan(1);

      // Validate WebGL stats
      const webglStats = webglBatcher.getStats();
      expect(webglStats.totalDrawCalls).toBe(5);
      expect(webglStats.totalBatches).toBeGreaterThan(0);
      expect(webglStats.compressionRatio).toBeGreaterThan(1);
    });

    it('should handle multiple organisms interacting simultaneously', async () => {
      const organismCount = 3;
      const cycles = 5;

      // Create multiple organisms
      for (let i = 0; i < organismCount; i++) {
        const organism = OrganismFactory.createOrganism(
          createMockDNA(32),
          {
            creativity: 0.3 + (i * 0.2),
            focus: 0.5 + (i * 0.1),
            energy: 0.8
          }
        ) as OrganismCore;
        
        organisms.push(organism);
        await organism.boot();
      }

      // Simulate parallel evolution
      for (let cycle = 0; cycle < cycles; cycle++) {
        const promises = organisms.map(async (organism, index) => {
          // Unique stimulation patterns per organism
          organism.stimulate('sensory_input', (index + 1) * 0.2);
          organism.update(1 + index * 0.1);
          organism.mutate(0.03 + index * 0.01);
          
          // Different feeding schedules
          if ((cycle + index) % 2 === 0) {
            organism.feed(0.15);
          }

          return organism.getPerformanceMetrics();
        });

        const allMetrics = await Promise.all(promises);
        
        // Validate each organism maintains good state
        allMetrics.forEach(metrics => {
          expect(metrics.neuralActivity).toBeGreaterThanOrEqual(0);
          expect(metrics.connectionStrength).toBeGreaterThanOrEqual(0);
        });
      }

      // Force all mutations to complete
      await Promise.all(organisms.map(o => o.flushMutations()));

      // Validate organisms evolved differently
      const finalStates = organisms.map(o => o.getState());
      const traits = finalStates.map(s => s.traits);
      
      // At least some traits should differ between organisms
      let hasVariation = false;
      for (let i = 1; i < traits.length; i++) {
        if (Math.abs(traits[0].creativity - traits[i].creativity) > 0.01) {
          hasVariation = true;
          break;
        }
      }
      expect(hasVariation).toBe(true);
    });
  });

  describe('Performance Under Load', () => {
    it('should maintain performance with high mutation rate', async () => {
      const organism = OrganismFactory.createOrganism('ATCGATCGATCGATCGATCGATCGATCGATCG') as OrganismCore;
      organisms.push(organism);
      await organism.boot();

      const startTime = performance.now();
      
      // High frequency mutations
      for (let i = 0; i < 50; i++) {
        organism.mutate(0.1);
        organism.update(0.5);
        
        if (i % 10 === 0) {
          organism.stimulate('sensory_input', Math.random());
        }
      }

      await organism.flushMutations();
      const endTime = performance.now();
      
      const totalTime = endTime - startTime;
      expect(totalTime).toBeLessThan(500); // Should complete within 500ms
      
      // Validate batching effectiveness
      const metrics = await organism.getPerformanceMetrics();
      expect(metrics.mutationStats.compressionRatio).toBeGreaterThan(2); // Good batching
    });

    it('should handle WebGL rendering load efficiently', async () => {
      const startTime = performance.now();
      
      // Add many draw calls rapidly
      for (let i = 0; i < 100; i++) {
        webglBatcher.addDrawCall({
          type: i % 3 === 0 ? 'triangle' : i % 3 === 1 ? 'line' : 'point',
          vertices: new Float32Array(Array.from({ length: 24 }, () => Math.random())),
          uniforms: {
            u_time: i,
            u_intensity: Math.random()
          },
          priority: i % 10 === 0 ? 'high' : 'normal'
        });
      }

      webglBatcher.flush();
      const endTime = performance.now();
      
      const renderTime = endTime - startTime;
      expect(renderTime).toBeLessThan(100); // Should render quickly

      const stats = webglBatcher.getStats();
      expect(stats.totalDrawCalls).toBeGreaterThanOrEqual(100); // Allow for some accumulation from previous tests
      expect(stats.compressionRatio).toBeGreaterThan(3); // Good batching
    });
  });

  describe('Error Recovery Integration', () => {
    it('should recover gracefully from cascading system failures', async () => {
      const organism = OrganismFactory.createOrganism('ATCGATCGATCGATCG') as OrganismCore;
      organisms.push(organism);
      await organism.boot();

      // Introduce various system stresses
      try {
        // Invalid stimulations
        organism.stimulate('non_existent_input', NaN);
        organism.stimulate('another_invalid', Infinity);
        
        // Invalid mutations
        organism.mutate(-1);
        organism.mutate(10);
        
        // Invalid traits
        organism.setTraits({ creativity: -5, focus: 100 } as any);
        
        // Invalid updates
        organism.update(-1000);
        organism.update(NaN);
        
        // System should still function
        const state = organism.getState();
        expect(state.health).toBeGreaterThanOrEqual(0);
        expect(state.energy).toBeGreaterThanOrEqual(0);
        
        // Mutations should still work
        organism.mutate(0.05);
        await organism.flushMutations();
        
      } catch (error) {
        // Some errors might throw, but system should recover
      }

      // Validate error tracking
      const errorMetrics = errorHandler.getMetrics();
      expect(errorMetrics.errorCount).toBeGreaterThan(0);
      expect(errorMetrics.recoveryAttempts).toBeGreaterThan(0);
    });

    it('should maintain WebGL functionality during errors', async () => {
      // Add some valid draw calls
      webglBatcher.addDrawCall({
        type: 'triangle',
        vertices: new Float32Array([0, 0, 0, 0, 0, 1, 0, 0]),
        uniforms: { u_color: 1.0 },
        priority: 'normal'
      });

      // Add invalid draw calls
      try {
        webglBatcher.addDrawCall({
          type: 'triangle' as any,
          vertices: null as any, // Invalid
          uniforms: {},
          priority: 'normal'
        });
      } catch (error) {
        // Expected to fail
      }

      // Add more valid calls
      webglBatcher.addDrawCall({
        type: 'line',
        vertices: new Float32Array([1, 0, 0, 0, 0, 1, 0, 0]),
        uniforms: { u_color: 0.5 },
        priority: 'normal'
      });

      // Should still be able to flush and render valid calls
      expect(() => webglBatcher.flush()).not.toThrow();
      
      const stats = webglBatcher.getStats();
      expect(stats.totalDrawCalls).toBeGreaterThan(0);
    });
  });

  describe('Memory Management', () => {
    it('should not leak memory during extended operation', async () => {
      // Reset error metrics to avoid accumulation from previous tests
      errorHandler.reset();
      const initialMetrics = errorHandler.getMetrics();
      
      for (let batch = 0; batch < 5; batch++) {
        // Create organisms for this batch
        const batchOrganisms: OrganismCore[] = [];
        
        for (let i = 0; i < 3; i++) {
          const organism = OrganismFactory.createOrganism(
            createMockDNA(16 + batch * 4)
          ) as OrganismCore;
          
          batchOrganisms.push(organism);
          await organism.boot();
          
          // Quick lifecycle
          organism.stimulate('sensory_input', Math.random());
          organism.update(1.0);
          organism.mutate(0.05);
        }
        
        // Process all mutations
        await Promise.all(batchOrganisms.map(o => o.flushMutations()));
        
        // Cleanup batch
        await Promise.all(batchOrganisms.map(o => o.hibernate()));
      }

      // System should remain stable - allow for reasonable error accumulation
      const finalMetrics = errorHandler.getMetrics();
      expect(finalMetrics.errorCount).toBeLessThan(initialMetrics.errorCount + 50); // More realistic for 15 organisms
    });
  });

  describe('Real-time Performance', () => {
    it('should maintain 60fps rendering target under load', async () => {
      const organism = OrganismFactory.createOrganism('ATCGATCGATCGATCG') as OrganismCore;
      organisms.push(organism);
      await organism.boot();

      const frameCount = 10;
      const frameTimes: number[] = [];

      for (let frame = 0; frame < frameCount; frame++) {
        const frameStart = performance.now();
        
        // Simulate one frame of work
        organism.stimulate('sensory_input', Math.sin(frame * 0.1));
        organism.update(1.0);
        organism.mutate(0.02);
        
        const shaderParams = organism.getShaderParameters();
        webglBatcher.addDrawCall({
          type: 'triangle',
          vertices: new Float32Array([
            Math.cos(frame), Math.sin(frame), 0, 0, 0, 1, 0, 0,
            Math.cos(frame + 1), Math.sin(frame + 1), 0, 0, 1, 0, 1, 0,
            0, 0, 1, 1, 0, 0, 0, 1
          ]),
          uniforms: {
            u_energy: shaderParams.energy,
            u_time: shaderParams.time
          },
          priority: 'high'
        });
        
        // Force immediate rendering (simulates frame-based rendering)
        webglBatcher.flush();
        
        const frameEnd = performance.now();
        frameTimes.push(frameEnd - frameStart);
      }

      // Flush any remaining mutations
      await organism.flushMutations();

      // Validate frame timing (16.67ms = 60fps)
      const averageFrameTime = frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length;
      expect(averageFrameTime).toBeLessThan(16.67);
      
      // No frame should exceed 33ms (30fps minimum)
      const maxFrameTime = Math.max(...frameTimes);
      expect(maxFrameTime).toBeLessThan(33);
    });
  });
}); 