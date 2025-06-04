import { NeuralMeshAsync } from '../src/core/NeuralMeshAsync';
import { WebGLBatcher } from '../src/core/utils/WebGLBatcher';
import { OrganismCore } from '../src/core/OrganismCore';
import { NeuralMesh } from '../src/core/NeuralMesh';

describe('Browser Compatibility Tests', () => {
  describe('WebGL Compatibility', () => {
    let canvas: HTMLCanvasElement;

    beforeEach(() => {
      canvas = document.createElement('canvas');
    });

    it('should support WebGL 1.0 context', () => {
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      
      expect(gl).toBeTruthy();
      
      if (gl && (gl as any).TRIANGLES !== undefined) {
        const webgl = gl as WebGLRenderingContext;
        // Test basic WebGL 1.0 functionality
        expect(webgl.TRIANGLES).toBeDefined();
        expect(webgl.ARRAY_BUFFER).toBeDefined();
        expect(webgl.ELEMENT_ARRAY_BUFFER).toBeDefined();
        
        // Test buffer creation
        const buffer = webgl.createBuffer();
        expect(buffer).toBeTruthy();
        
        if (buffer) {
          webgl.deleteBuffer(buffer);
        }
      }
    });

    it('should gracefully handle WebGL 2.0 features', () => {
      const gl = canvas.getContext('webgl2') as WebGL2RenderingContext;
      
      if (gl) {
        // WebGL 2.0 is available
        expect(gl.createVertexArray).toBeDefined();
        expect(gl.deleteVertexArray).toBeDefined();
        expect(gl.bindVertexArray).toBeDefined();
        
        // Test VAO functionality
        const vao = gl.createVertexArray();
        expect(vao).toBeTruthy();
        
        if (vao) {
          gl.bindVertexArray(vao);
          gl.bindVertexArray(null);
          gl.deleteVertexArray(vao);
        }
      } else {
        // WebGL 2.0 fallback to 1.0
        const gl1 = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        expect(gl1).toBeTruthy();
      }
    });

    it('should create WebGLBatcher with appropriate context', () => {
      const gl = canvas.getContext('webgl') as WebGLRenderingContext;
      expect(gl).toBeTruthy();
      
      if (gl) {
        const batcher = new WebGLBatcher(gl, {
          maxBatchSize: 5,
          maxVertices: 100
        });
        
        expect(batcher).toBeDefined();
        
        // Test basic functionality
        const drawCallId = batcher.addDrawCall({
          type: 'triangle',
          vertices: new Float32Array([0, 0, 0, 0, 0, 1, 0, 0]),
          uniforms: { u_color: 1.0 },
          priority: 'normal'
        });
        
        expect(drawCallId).toBeDefined();
        
        batcher.flush();
        batcher.dispose();
      }
    });

    it('should handle WebGL context loss gracefully', () => {
      const gl = canvas.getContext('webgl') as WebGLRenderingContext;
      expect(gl).toBeTruthy();
      
      if (gl) {
        const batcher = new WebGLBatcher(gl);
        
        // Simulate context loss
        const loseContextExt = gl.getExtension('WEBGL_lose_context');
        if (loseContextExt) {
          // Add draw call before context loss
          batcher.addDrawCall({
            type: 'triangle',
            vertices: new Float32Array([0, 0, 0, 0, 0, 1, 0, 0]),
            uniforms: { u_color: 1.0 },
            priority: 'normal'
          });
          
          // Lose context
          loseContextExt.loseContext();
          
          // Should not crash when flushing
          expect(() => batcher.flush()).not.toThrow();
          
          // Restore context
          loseContextExt.restoreContext();
        }
        
        batcher.dispose();
      }
    });

    it('should detect WebGL capabilities and extensions', () => {
      const gl = canvas.getContext('webgl') as WebGLRenderingContext;
      expect(gl).toBeTruthy();
      
      if (gl) {
        // Test basic WebGL functionality
        expect(gl.getParameter).toBeDefined();
        expect(gl.createShader).toBeDefined();
        expect(gl.createProgram).toBeDefined();
        
        // Test WebGL extensions availability (these may or may not be available)
        const anisoExt = gl.getExtension('EXT_texture_filter_anisotropic');
        const floatExt = gl.getExtension('OES_texture_float');
        const depthExt = gl.getExtension('WEBGL_depth_texture');
        
        // These might or might not be available, just test that the calls don't crash
        expect(anisoExt === null || typeof anisoExt === 'object').toBe(true);
        expect(floatExt === null || typeof floatExt === 'object').toBe(true);
        expect(depthExt === null || typeof depthExt === 'object').toBe(true);
        
        // Test basic rendering capabilities
        const renderer = gl.getParameter(gl.RENDERER);
        const vendor = gl.getParameter(gl.VENDOR);
        
        expect(typeof renderer).toBe('string');
        expect(typeof vendor).toBe('string');
        
        // Test buffer creation
        const buffer = gl.createBuffer();
        expect(buffer).toBeTruthy();
        
        if (buffer) {
          gl.deleteBuffer(buffer);
        }
      }
    });
  });

  describe('Web Workers Compatibility', () => {
    it('should detect Worker support', () => {
      const hasWorkerSupport = typeof Worker !== 'undefined';
      expect(typeof hasWorkerSupport).toBe('boolean');
      
      if (hasWorkerSupport) {
        // Worker is available
        expect(Worker).toBeDefined();
        expect(typeof Worker).toBe('function');
      }
    });

    it('should handle NeuralMeshAsync with Worker fallback', async () => {
      const neuralMesh = new NeuralMeshAsync({
        useWorker: true,
        fallbackToMainThread: true
      });
      
      expect(neuralMesh).toBeDefined();
      
      await neuralMesh.initialize();
      
      // Test basic functionality regardless of worker support
      neuralMesh.addNode('input1', 'input', 0.5);
      neuralMesh.addNode('output1', 'output', 0);
      neuralMesh.addConnection('input1', 'output1', 0.8);
      
      neuralMesh.stimulate('input1', 1.0);
      neuralMesh.propagate();
      
      const activation = neuralMesh.getActivation('output1');
      expect(typeof activation).toBe('number');
      
      await neuralMesh.suspend();
    });

    it('should handle Worker creation errors gracefully', async () => {
      // Mock Worker to simulate creation failure
      const originalWorker = global.Worker;
      global.Worker = jest.fn(() => {
        throw new Error('Worker creation failed');
      });
      
      try {
        const neuralMesh = new NeuralMeshAsync({
          useWorker: true,
          fallbackToMainThread: true
        });
        
        await neuralMesh.initialize();
        
        // Should fallback to main thread
        neuralMesh.addNode('test', 'input');
        neuralMesh.stimulate('test', 0.5);
        
        expect(() => neuralMesh.propagate()).not.toThrow();
        
        await neuralMesh.suspend();
      } finally {
        global.Worker = originalWorker;
      }
    });

    it('should handle Worker message errors', async () => {
      // Mock Worker with error-prone message handling
      const mockWorker = {
        postMessage: jest.fn((message) => {
          // Simulate message error for specific operations
          if (message.type === 'propagate') {
            setTimeout(() => {
              if (mockWorker.onerror) {
                mockWorker.onerror(new ErrorEvent('error', {
                  message: 'Worker propagation failed',
                  filename: 'worker.js',
                  lineno: 1
                }));
              }
            }, 10);
          }
        }),
        terminate: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        onmessage: null,
        onerror: null
      };

      global.Worker = jest.fn(() => mockWorker as any);
      
      try {
        const neuralMesh = new NeuralMeshAsync({
          useWorker: true,
          fallbackToMainThread: true
        });
        
        await neuralMesh.initialize();
        
        // This should trigger the error scenario
        neuralMesh.propagate();
        
        // Wait for error to be processed
        await new Promise(resolve => setTimeout(resolve, 50));
        
        // System should remain functional
        expect(() => neuralMesh.addNode('test', 'input')).not.toThrow();
        
        await neuralMesh.suspend();
      } finally {
        global.Worker = (global as any).originalWorker || (() => {});
      }
    });
  });

  describe('Performance API Compatibility', () => {
    it('should handle performance.now() availability', () => {
      if (typeof performance !== 'undefined' && performance.now) {
        const startTime = performance.now();
        expect(typeof startTime).toBe('number');
        expect(startTime).toBeGreaterThan(0);
        
        const endTime = performance.now();
        expect(endTime).toBeGreaterThanOrEqual(startTime);
      } else {
        // Fallback to Date.now()
        const startTime = Date.now();
        expect(typeof startTime).toBe('number');
        expect(startTime).toBeGreaterThan(0);
      }
    });

    it('should handle requestAnimationFrame availability', () => {
      if (typeof requestAnimationFrame !== 'undefined') {
        let called = false;
        const id = requestAnimationFrame(() => {
          called = true;
        });
        
        expect(typeof id).toBe('number');
        
        if (typeof cancelAnimationFrame !== 'undefined') {
          cancelAnimationFrame(id);
        }
      } else {
        // Fallback to setTimeout
        let called = false;
        const id = setTimeout(() => {
          called = true;
        }, 16);
        
        expect(typeof id).toBe('number');
        clearTimeout(id);
      }
    });
  });

  describe('Memory Management Compatibility', () => {
    it('should handle large object creation without memory errors', () => {
      const largeArrays: Float32Array[] = [];
      
      try {
        // Create moderately large arrays (not too large for test environment)
        for (let i = 0; i < 10; i++) {
          const array = new Float32Array(1000); // 4KB each
          array.fill(Math.random());
          largeArrays.push(array);
        }
        
        expect(largeArrays.length).toBe(10);
        
        // Verify data integrity
        largeArrays.forEach(array => {
          expect(array.length).toBe(1000);
          expect(array[0]).toBeGreaterThanOrEqual(0);
          expect(array[0]).toBeLessThanOrEqual(1);
        });
        
      } finally {
        // Cleanup
        largeArrays.length = 0;
      }
    });

    it('should handle garbage collection hints if available', () => {
      // Some browsers provide gc() for testing
      if (typeof (global as any).gc === 'function') {
        expect(() => (global as any).gc()).not.toThrow();
      }
      
      // Create and dispose objects to test GC behavior
      const objects = [];
      for (let i = 0; i < 100; i++) {
        objects.push({
          data: new Array(100).fill(Math.random()),
          id: i
        });
      }
      
      expect(objects.length).toBe(100);
      
      // Clear references
      objects.length = 0;
      
      // Force GC if available
      if (typeof (global as any).gc === 'function') {
        (global as any).gc();
      }
    });
  });

  describe('Cross-Browser OrganismCore Compatibility', () => {
    it('should function correctly across different environments', async () => {
      const organism = new OrganismCore('ATCGATCGATCGATCG', {
        creativity: 0.5,
        focus: 0.7
      }, () => new NeuralMesh());
      
      await organism.boot();
      
      // Test core functionality
      organism.stimulate('sensory_input', 0.8);
      organism.update(1.0);
      organism.mutate(0.05);
      
      const state = organism.getState();
      expect(state.health).toBeGreaterThanOrEqual(0);
      expect(state.energy).toBeGreaterThanOrEqual(0);
      
      const traits = organism.getTraits();
      expect(traits.creativity).toBeCloseTo(0.5, 1);
      expect(traits.focus).toBeCloseTo(0.7, 1);
      
      // Test performance metrics
      const metrics = await organism.getPerformanceMetrics();
      expect(metrics).toBeDefined();
      expect(typeof metrics.cpu).toBe('number');
      expect(typeof metrics.memory).toBe('number');
      
      await organism.hibernate();
    });

    it('should handle async operations consistently', async () => {
      const organism = new OrganismCore('ATCGATCGATCGATCG');
      
      // Test multiple async operations
      const promises = [
        organism.boot(),
        organism.getPerformanceMetrics(),
        organism.flushMutations()
      ];
      
      await Promise.all(promises);
      
      // All should complete without errors
      expect(organism.getState()).toBeDefined();
      
      await organism.hibernate();
    });
  });

  describe('Browser Feature Detection', () => {
    it('should detect available APIs and features', () => {
      // Canvas support
      const hasCanvas = typeof HTMLCanvasElement !== 'undefined';
      expect(typeof hasCanvas).toBe('boolean');
      
      // WebGL support
      if (hasCanvas) {
        const canvas = document.createElement('canvas');
        const hasWebGL = !!(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
        expect(typeof hasWebGL).toBe('boolean');
      }
      
      // Worker support
      const hasWorkers = typeof Worker !== 'undefined';
      expect(typeof hasWorkers).toBe('boolean');
      
      // Typed Array support
      const hasTypedArrays = typeof Float32Array !== 'undefined';
      expect(hasTypedArrays).toBe(true);
      
      // Promise support
      const hasPromises = typeof Promise !== 'undefined';
      expect(hasPromises).toBe(true);
      
      // Map/Set support
      const hasMapSet = typeof Map !== 'undefined' && typeof Set !== 'undefined';
      expect(hasMapSet).toBe(true);
    });
  });
}); 