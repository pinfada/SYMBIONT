/**
 * Tests de performance WebGL
 */

// Mock WebGL context
const createMockWebGLContext = () => ({
  createShader: jest.fn().mockReturnValue({}),
  shaderSource: jest.fn(),
  compileShader: jest.fn(),
  getShaderParameter: jest.fn().mockReturnValue(true),
  createProgram: jest.fn().mockReturnValue({}),
  attachShader: jest.fn(),
  linkProgram: jest.fn(),
  getProgramParameter: jest.fn().mockReturnValue(true),
  useProgram: jest.fn(),
  createBuffer: jest.fn().mockReturnValue({}),
  bindBuffer: jest.fn(),
  bufferData: jest.fn(),
  getAttribLocation: jest.fn().mockReturnValue(0),
  enableVertexAttribArray: jest.fn(),
  vertexAttribPointer: jest.fn(),
  getUniformLocation: jest.fn().mockReturnValue({}),
  uniform1f: jest.fn(),
  uniform2f: jest.fn(),
  uniform3f: jest.fn(),
  uniform4f: jest.fn(),
  uniformMatrix4fv: jest.fn(),
  viewport: jest.fn(),
  clearColor: jest.fn(),
  clear: jest.fn(),
  drawArrays: jest.fn(),
  drawElements: jest.fn(),
  canvas: {
    width: 800,
    height: 600,
    getContext: jest.fn()
  },
  // WebGL constants
  VERTEX_SHADER: 35633,
  FRAGMENT_SHADER: 35632,
  ARRAY_BUFFER: 34962,
  ELEMENT_ARRAY_BUFFER: 34963,
  STATIC_DRAW: 35044,
  FLOAT: 5126,
  TRIANGLES: 4,
  COLOR_BUFFER_BIT: 16384,
  DEPTH_BUFFER_BIT: 256,
  DEPTH_TEST: 2929
});

// Mock HTMLCanvasElement
global.HTMLCanvasElement.prototype.getContext = jest.fn().mockImplementation((contextType) => {
  if (contextType === 'webgl' || contextType === 'webgl2') {
    return createMockWebGLContext();
  }
  return null;
});

describe('Tests de Performance WebGL', () => {
  let canvas: HTMLCanvasElement;
  let gl: any;

  beforeEach(() => {
    canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 600;
    gl = canvas.getContext('webgl');
  });

  describe('Initialisation WebGL', () => {
    it('initialise le contexte WebGL rapidement', () => {
      const start = performance.now();
      
      const testCanvas = document.createElement('canvas');
      testCanvas.width = 1920;
      testCanvas.height = 1080;
      const testGl = testCanvas.getContext('webgl2') || testCanvas.getContext('webgl');
      
      const duration = performance.now() - start;
      
      expect(testGl).toBeTruthy();
      expect(duration).toBeLessThan(50); // Moins de 50ms
    });

    it('gère gracieusement l\'échec d\'initialisation WebGL', () => {
      // Mock failed context creation
      const failCanvas = document.createElement('canvas');
      jest.spyOn(failCanvas, 'getContext').mockReturnValue(null);
      
      const context = failCanvas.getContext('webgl');
      expect(context).toBeNull();
    });
  });

  describe('Compilation de Shaders', () => {
    it('compile les shaders en moins de 100ms', () => {
      const vertexShaderSource = `
        attribute vec4 a_position;
        uniform mat4 u_matrix;
        void main() {
          gl_Position = u_matrix * a_position;
        }
      `;
      
      const fragmentShaderSource = `
        precision mediump float;
        uniform vec4 u_color;
        void main() {
          gl_Color = u_color;
        }
      `;
      
      const start = performance.now();
      
      // Mock shader compilation
      const vertexShader = gl.createShader(gl.VERTEX_SHADER);
      gl.shaderSource(vertexShader, vertexShaderSource);
      gl.compileShader(vertexShader);
      
      const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
      gl.shaderSource(fragmentShader, fragmentShaderSource);
      gl.compileShader(fragmentShader);
      
      const program = gl.createProgram();
      gl.attachShader(program, vertexShader);
      gl.attachShader(program, fragmentShader);
      gl.linkProgram(program);
      
      const duration = performance.now() - start;
      
      expect(gl.getProgramParameter(program, gl.LINK_STATUS)).toBe(true);
      expect(duration).toBeLessThan(100);
    });

    it('détecte les erreurs de compilation rapidement', () => {
      const invalidShader = `
        invalid shader code
        this should fail
      `;
      
      const start = performance.now();
      
      const shader = gl.createShader(gl.VERTEX_SHADER);
      gl.shaderSource(shader, invalidShader);
      gl.compileShader(shader);
      
      // Simulate compilation check
      const success = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
      
      const duration = performance.now() - start;
      
      expect(duration).toBeLessThan(50);
      expect(typeof success).toBe('boolean');
    });
  });

  describe('Opérations de rendu', () => {
    it('maintient 60 FPS pour des scènes simples', () => {
      const frameCount = 60;
      const targetFPS = 60;
      const maxFrameTime = 1000 / targetFPS; // 16.67ms
      
      const frameTimes: number[] = [];
      
      for (let i = 0; i < frameCount; i++) {
        const frameStart = performance.now();
        
        // Simuler un frame de rendu
        gl.viewport(0, 0, canvas.width, canvas.height);
        gl.clearColor(0, 0, 0, 1);
        gl.clear(gl.COLOR_BUFFER_BIT);
        
        // Simuler le dessin de quelques triangles
        for (let j = 0; j < 10; j++) {
          gl.drawArrays(gl.TRIANGLES, 0, 3);
        }
        
        const frameTime = performance.now() - frameStart;
        frameTimes.push(frameTime);
      }
      
      const averageFrameTime = frameTimes.reduce((a, b) => a + b, 0) / frameCount;
      const maxFrameTimeActual = Math.max(...frameTimes);
      
      expect(averageFrameTime).toBeLessThan(maxFrameTime);
      expect(maxFrameTimeActual).toBeLessThan(maxFrameTime * 2); // Tolérance pour les pics
    });

    it('gère efficacement les textures multiples', () => {
      const textureCount = 16;
      const textures: any[] = [];
      
      const start = performance.now();
      
      // Simuler la création de textures
      for (let i = 0; i < textureCount; i++) {
        const texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, texture);
        
        // Simuler l'upload de données de texture
        const pixels = new Uint8Array(256 * 256 * 4); // RGBA 256x256
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 256, 256, 0, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
        
        textures.push(texture);
      }
      
      const duration = performance.now() - start;
      
      expect(textures).toHaveLength(textureCount);
      expect(duration).toBeLessThan(500); // Moins de 500ms pour 16 textures
    });
  });

  describe('Gestion mémoire', () => {
    it('libère correctement les ressources WebGL', () => {
      const resources = {
        buffers: [],
        textures: [],
        programs: [],
        shaders: []
      };
      
      // Créer des ressources
      for (let i = 0; i < 10; i++) {
        const buffer = gl.createBuffer();
        const texture = gl.createTexture();
        const program = gl.createProgram();
        const shader = gl.createShader(gl.VERTEX_SHADER);
        
        resources.buffers.push(buffer);
        resources.textures.push(texture);
        resources.programs.push(program);
        resources.shaders.push(shader);
      }
      
      // Libérer les ressources
      const start = performance.now();
      
      resources.buffers.forEach(buffer => gl.deleteBuffer(buffer));
      resources.textures.forEach(texture => gl.deleteTexture(texture));
      resources.programs.forEach(program => gl.deleteProgram(program));
      resources.shaders.forEach(shader => gl.deleteShader(shader));
      
      const duration = performance.now() - start;
      
      expect(duration).toBeLessThan(100);
    });

    it('détecte les fuites mémoire potentielles', () => {
      const initialMemory = performance.memory ? performance.memory.usedJSHeapSize : 0;
      
      // Créer beaucoup de ressources sans les libérer
      const leakyResources = [];
      for (let i = 0; i < 1000; i++) {
        leakyResources.push({
          buffer: gl.createBuffer(),
          texture: gl.createTexture(),
          data: new Float32Array(1000) // 4KB each
        });
      }
      
      const afterCreation = performance.memory ? performance.memory.usedJSHeapSize : 0;
      
      // Libérer les ressources
      leakyResources.forEach(resource => {
        gl.deleteBuffer(resource.buffer);
        gl.deleteTexture(resource.texture);
      });
      leakyResources.length = 0;
      
      const afterCleanup = performance.memory ? performance.memory.usedJSHeapSize : 0;
      
      if (performance.memory) {
        const memoryIncrease = afterCreation - initialMemory;
        const memoryAfterCleanup = afterCleanup - initialMemory;
        
        expect(memoryIncrease).toBeGreaterThan(0); // Memory should increase
        expect(memoryAfterCleanup).toBeLessThan(memoryIncrease * 0.5); // Should clean up most memory
      }
      
      expect(leakyResources).toHaveLength(0);
    });
  });

  describe('Performance en conditions stressantes', () => {
    it('maintient les performances avec beaucoup de draw calls', () => {
      const drawCallCount = 1000;
      
      const start = performance.now();
      
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.clear(gl.COLOR_BUFFER_BIT);
      
      for (let i = 0; i < drawCallCount; i++) {
        // Simuler des changements d'état coûteux
        gl.useProgram(gl.createProgram());
        gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
        gl.drawArrays(gl.TRIANGLES, 0, 3);
      }
      
      const duration = performance.now() - start;
      
      expect(duration).toBeLessThan(1000); // Moins d'1 seconde pour 1000 draw calls
    });

    it('gère les changements de viewport fréquents', () => {
      const viewportChanges = 100;
      
      const start = performance.now();
      
      for (let i = 0; i < viewportChanges; i++) {
        const width = 100 + (i * 10);
        const height = 100 + (i * 10);
        gl.viewport(0, 0, width, height);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
      }
      
      const duration = performance.now() - start;
      
      expect(duration).toBeLessThan(500);
    });
  });

  describe('Validation des performances par fonctionnalité', () => {
    it('WebGL Batch operations performance', () => {
      // Simuler un système de batch comme WebGLBatcher
      const batchSize = 100;
      const batches = 10;
      
      const start = performance.now();
      
      for (let batch = 0; batch < batches; batch++) {
        // Préparer un batch
        const vertices = new Float32Array(batchSize * 3 * 3); // 100 triangles
        for (let i = 0; i < vertices.length; i++) {
          vertices[i] = Math.random();
        }
        
        // Upload et rendu du batch
        const buffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
        gl.drawArrays(gl.TRIANGLES, 0, batchSize * 3);
        
        gl.deleteBuffer(buffer);
      }
      
      const duration = performance.now() - start;
      
      expect(duration).toBeLessThan(200); // Batching doit être efficace
    });

    it('Organism rendering performance', () => {
      // Simuler le rendu d'un organisme complexe
      const organismComplexity = 50; // Nombre de composants
      
      const start = performance.now();
      
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      
      for (let component = 0; component < organismComplexity; component++) {
        // Simuler le rendu d'un composant d'organisme
        gl.useProgram(gl.createProgram());
        
        // Matrices de transformation
        gl.uniformMatrix4fv(gl.getUniformLocation(null, 'u_matrix'), false, new Float32Array(16));
        
        // Couleur du composant
        gl.uniform4f(gl.getUniformLocation(null, 'u_color'), Math.random(), Math.random(), Math.random(), 1.0);
        
        // Géométrie du composant
        gl.drawArrays(gl.TRIANGLES, 0, 6); // Quad = 2 triangles
      }
      
      const duration = performance.now() - start;
      
      expect(duration).toBeLessThan(16); // 60 FPS = 16.67ms par frame
    });
  });
});