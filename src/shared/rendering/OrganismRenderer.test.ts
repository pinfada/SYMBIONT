/**
 * Tests du moteur de rendu partagé OrganismRenderer.
 *
 * Objectif : garantir la logique cross-navigateur critique pour la qualité
 * visuelle — sélection du contexte (WebGL2 préféré, repli WebGL1),
 * supersampling, blending alpha prémultiplié, robustesse à la perte de
 * contexte — sans dépendre d'un vrai GPU.
 */

import { OrganismRenderer, hashSeed } from './OrganismRenderer';

// Mock GL autonome : enregistre les appels clés pour assertions
function createMockGL(overrides: Record<string, unknown> = {}) {
  const calls: Record<string, unknown[][]> = {};
  const rec = (name: string) => (...args: unknown[]) => {
    (calls[name] ||= []).push(args);
    return undefined;
  };
  const gl: Record<string, unknown> = {
    VERTEX_SHADER: 0x8b31, FRAGMENT_SHADER: 0x8b30,
    COMPILE_STATUS: 0x8b81, LINK_STATUS: 0x8b82,
    ARRAY_BUFFER: 0x8892, STATIC_DRAW: 0x88e4, FLOAT: 0x1406,
    COLOR_BUFFER_BIT: 0x4000, BLEND: 0x0be2,
    ONE: 1, ONE_MINUS_SRC_ALPHA: 0x0303, TRIANGLE_FAN: 0x0006,
    createShader: () => ({}),
    shaderSource: rec('shaderSource'),
    compileShader: rec('compileShader'),
    getShaderParameter: () => true,
    getShaderInfoLog: () => '',
    deleteShader: rec('deleteShader'),
    createProgram: () => ({}),
    attachShader: rec('attachShader'),
    linkProgram: rec('linkProgram'),
    getProgramParameter: () => true,
    getProgramInfoLog: () => '',
    deleteProgram: rec('deleteProgram'),
    useProgram: rec('useProgram'),
    getAttribLocation: () => 0,
    getUniformLocation: () => ({}),
    createBuffer: () => ({}),
    bindBuffer: rec('bindBuffer'),
    bufferData: rec('bufferData'),
    deleteBuffer: rec('deleteBuffer'),
    enableVertexAttribArray: rec('enableVertexAttribArray'),
    vertexAttribPointer: rec('vertexAttribPointer'),
    uniform1f: rec('uniform1f'),
    uniform1fv: rec('uniform1fv'),
    uniform3f: rec('uniform3f'),
    viewport: rec('viewport'),
    clearColor: rec('clearColor'),
    clear: rec('clear'),
    enable: rec('enable'),
    blendFunc: rec('blendFunc'),
    drawArrays: rec('drawArrays'),
    isContextLost: () => false,
    ...overrides,
  };
  return { gl, calls };
}

function createMockCanvas(gl: unknown, contextTypes: string[] = ['webgl2']) {
  return {
    width: 0,
    height: 0,
    getContext: (type: string) => (contextTypes.includes(type) ? gl : null),
    toDataURL: () => 'data:image/png;base64,MOCK',
  } as unknown as HTMLCanvasElement;
}

describe('OrganismRenderer', () => {
  it('préfère WebGL2 quand disponible', () => {
    const { gl } = createMockGL();
    const canvas = createMockCanvas(gl, ['webgl2', 'webgl']);
    const renderer = new OrganismRenderer(canvas);

    expect(renderer.initialize()).toBe(true);
    expect(renderer.contextType).toBe('webgl2');
  });

  it('retombe sur WebGL1 quand WebGL2 est indisponible', () => {
    const { gl } = createMockGL();
    const canvas = createMockCanvas(gl, ['webgl']); // pas de webgl2
    const renderer = new OrganismRenderer(canvas);

    expect(renderer.initialize()).toBe(true);
    expect(renderer.contextType).toBe('webgl');
  });

  it('échoue proprement sans aucun contexte WebGL', () => {
    const canvas = createMockCanvas(null, []);
    const renderer = new OrganismRenderer(canvas);

    expect(renderer.initialize()).toBe(false);
    expect(renderer.isInitialized()).toBe(false);
  });

  it('applique le supersampling (canvas rendu à renderScale × taille logique)', () => {
    const { gl } = createMockGL();
    const canvas = createMockCanvas(gl);
    const renderer = new OrganismRenderer(canvas);
    renderer.initialize();

    renderer.render(
      { energy: 0.8, traits: { curiosity: 1 } },
      { width: 400, height: 300, renderScale: 2 },
    );

    expect(canvas.width).toBe(800);
    expect(canvas.height).toBe(600);
  });

  it('utilise un blending en alpha prémultiplié (ONE, ONE_MINUS_SRC_ALPHA)', () => {
    const { gl, calls } = createMockGL();
    const canvas = createMockCanvas(gl);
    const renderer = new OrganismRenderer(canvas);
    renderer.initialize();

    renderer.render({ energy: 0.5 }, { width: 400, height: 300 });

    expect(calls.blendFunc).toBeDefined();
    const [srcFactor, dstFactor] = calls.blendFunc![0];
    expect(srcFactor).toBe(gl.ONE);
    expect(dstFactor).toBe(gl.ONE_MINUS_SRC_ALPHA);
  });

  it('dessine la géométrie en TRIANGLE_FAN', () => {
    const { gl, calls } = createMockGL();
    const canvas = createMockCanvas(gl);
    const renderer = new OrganismRenderer(canvas);
    renderer.initialize();

    renderer.render({ energy: 0.5 }, { width: 400, height: 300 });

    expect(calls.drawArrays).toBeDefined();
    expect(calls.drawArrays![0][0]).toBe(gl.TRIANGLE_FAN);
  });

  it('refuse de rendre si le contexte est perdu', () => {
    const { gl } = createMockGL({ isContextLost: () => true });
    const canvas = createMockCanvas(gl);
    const renderer = new OrganismRenderer(canvas);
    renderer.initialize();

    expect(renderer.render({ energy: 0.5 }, { width: 400, height: 300 })).toBe(false);
  });

  it('exporte un data URL PNG après rendu', () => {
    const { gl } = createMockGL();
    const canvas = createMockCanvas(gl);
    const renderer = new OrganismRenderer(canvas);
    renderer.initialize();
    renderer.render({ energy: 0.5 }, { width: 400, height: 300 });

    expect(renderer.toDataURL()).toMatch(/^data:image\/png/);
  });

  describe('hashSeed (unicité par ADN)', () => {
    it('est déterministe : même ADN → même graine', () => {
      const dna = '7f3a9c21-4b8e-4d1a-9c2f-1e5b6a8d0c34';
      expect(hashSeed(dna)).toBe(hashSeed(dna));
    });

    it('produit des graines différentes pour des ADN différents', () => {
      const a = hashSeed('organism-alpha');
      const b = hashSeed('organism-beta');
      expect(a).not.toBe(b);
    });

    it('reste borné dans [0, 1)', () => {
      for (const dna of ['', 'x', 'a-very-long-dna-string-0123456789', '🧬']) {
        const s = hashSeed(dna);
        expect(s).toBeGreaterThanOrEqual(0);
        expect(s).toBeLessThan(1);
      }
    });
  });

  it('libère les ressources GPU au dispose', () => {
    const { gl, calls } = createMockGL();
    const canvas = createMockCanvas(gl);
    const renderer = new OrganismRenderer(canvas);
    renderer.initialize();
    renderer.dispose();

    expect(calls.deleteBuffer).toBeDefined();
    expect(calls.deleteProgram).toBeDefined();
    expect(renderer.isInitialized()).toBe(false);
  });
});
