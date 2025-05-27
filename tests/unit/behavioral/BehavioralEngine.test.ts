// tests/engine.test.ts
describe('OrganismEngine', () => {
    let engine: OrganismEngine;
    let canvas: HTMLCanvasElement;
    
    beforeEach(() => {
      canvas = document.createElement('canvas');
      canvas.width = 640;
      canvas.height = 480;
      engine = new OrganismEngine(canvas, 'TEST_DNA_STRING');
    });
    
    test('initializes WebGL context', () => {
      expect(engine.isInitialized()).toBe(true);
    });
    
    test('maintains 60fps under normal load', async () => {
      const frames = 120;
      const startTime = performance.now();
      
      for (let i = 0; i < frames; i++) {
        engine.render({ instances: 10, complexity: 0.5 });
        await new Promise(resolve => requestAnimationFrame(resolve));
      }
      
      const elapsed = performance.now() - startTime;
      const fps = (frames / elapsed) * 1000;
      
      expect(fps).toBeGreaterThan(58);
      expect(fps).toBeLessThan(62);
    });
    
    test('handles 1000 mutations per minute', async () => {
      const mutations = 1000;
      const startTime = performance.now();
      
      for (let i = 0; i < mutations; i++) {
        engine.mutate({
          type: 'color_shift',
          magnitude: Math.random(),
          duration: 100
        });
      }
      
      const elapsed = performance.now() - startTime;
      expect(elapsed).toBeLessThan(60000); // Moins d'une minute
      
      const metrics = engine.getPerformanceMetrics();
      expect(metrics.fps).toBeGreaterThan(30);
    });
    
    test('DNA interpretation is deterministic', () => {
      const dna = 'UNIQUE_DNA_STRING';
      const interpreter1 = new DNAInterpreter(dna);
      const interpreter2 = new DNAInterpreter(dna);
      
      const params1 = interpreter1.interpret();
      const params2 = interpreter2.interpret();
      
      expect(params1.primaryColor).toEqual(params2.primaryColor);
      expect(params1.complexity).toBe(params2.complexity);
    });
});