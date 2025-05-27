import { OrganismEngine } from '../../../src/generative/OrganismEngine';
import { OrganismMutation } from '../../../src/types';

describe('OrganismEngine', () => {
  let canvas: HTMLCanvasElement;
  let engine: OrganismEngine;

  beforeEach(() => {
    // Mock du canvas et du contexte WebGL
    canvas = document.createElement('canvas');
    canvas.width = 100;
    canvas.height = 100;
    // @ts-ignore
    canvas.getContext = jest.fn(() => ({
      createBuffer: jest.fn(() => ({})),
      bindBuffer: jest.fn(),
      bufferData: jest.fn(),
      createShader: jest.fn(() => ({})),
      shaderSource: jest.fn(),
      compileShader: jest.fn(),
      getShaderParameter: jest.fn(() => true),
      createProgram: jest.fn(() => ({})),
      attachShader: jest.fn(),
      linkProgram: jest.fn(),
      getProgramParameter: jest.fn(() => true),
      useProgram: jest.fn(),
      getAttribLocation: jest.fn(() => 0),
      enableVertexAttribArray: jest.fn(),
      vertexAttribPointer: jest.fn(),
      getUniformLocation: jest.fn(() => ({})),
      uniform1f: jest.fn(),
      uniform3fv: jest.fn(),
      clearColor: jest.fn(),
      clear: jest.fn(),
      drawElements: jest.fn(),
      viewport: jest.fn(),
      enable: jest.fn(),
      blendFunc: jest.fn(),
      depthFunc: jest.fn(),
      deleteBuffer: jest.fn(),
      deleteProgram: jest.fn(),
      deleteShader: jest.fn(),
    }));
    engine = new OrganismEngine(canvas, 'TESTDNA');
  });

  it('s instancie et initialise le moteur', () => {
    expect(engine).toBeDefined();
    expect(engine.isInitialized()).toBe(true);
  });

  it('effectue un rendu sans erreur', () => {
    expect(() => engine.render()).not.toThrow();
  });

  it('accepte et applique une mutation visuelle', () => {
    const mutation: OrganismMutation = {
      type: 'color_shift',
      magnitude: 0.5,
      duration: 1000
    };
    expect(() => engine.mutate(mutation)).not.toThrow();
  });
});
