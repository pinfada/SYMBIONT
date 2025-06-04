import { WebGLBatcher, WebGLDrawCall } from '../src/core/utils/WebGLBatcher';

// Mock WebGL context
const createMockWebGLContext = (): WebGLRenderingContext => {
  const buffers: WebGLBuffer[] = [];
  let bufferIndex = 0;

  return {
    TRIANGLES: 4,
    LINES: 1,
    POINTS: 0,
    ARRAY_BUFFER: 34962,
    ELEMENT_ARRAY_BUFFER: 34963,
    DYNAMIC_DRAW: 35048,
    FLOAT: 5126,
    UNSIGNED_SHORT: 5123,
    
    createBuffer: jest.fn(() => {
      const buffer = { id: bufferIndex++ } as WebGLBuffer;
      buffers.push(buffer);
      return buffer;
    }),
    
    deleteBuffer: jest.fn(),
    bindBuffer: jest.fn(),
    bufferData: jest.fn(),
    vertexAttribPointer: jest.fn(),
    enableVertexAttribArray: jest.fn(),
    drawArrays: jest.fn(),
    drawElements: jest.fn(),
  } as unknown as WebGLRenderingContext;
};

describe('WebGLBatcher', () => {
  let gl: WebGLRenderingContext;
  let batcher: WebGLBatcher;

  beforeEach(() => {
    gl = createMockWebGLContext();
    batcher = new WebGLBatcher(gl, {
      maxBatchSize: 3,
      maxVertices: 100,
      frameTimeoutMs: 16.67
    });
  });

  afterEach(() => {
    if (batcher) {
      batcher.dispose();
    }
  });

  it('should initialize WebGL buffers correctly', () => {
    expect(gl.createBuffer).toHaveBeenCalledTimes(2); // Vertex and index buffers
  });

  it('should add draw calls and return unique IDs', () => {
    const drawCall = {
      type: 'triangle' as const,
      vertices: new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]),
      uniforms: { u_color: 1.0 },
      priority: 'normal' as const
    };

    const id1 = batcher.addDrawCall(drawCall);
    const id2 = batcher.addDrawCall(drawCall);

    expect(id1).toBeDefined();
    expect(id2).toBeDefined();
    expect(id1).not.toBe(id2);
  });

  it('should batch draw calls of the same type', async () => {
    const vertices1 = new Float32Array([0, 0, 0, 0, 0, 1, 0, 0]);
    const vertices2 = new Float32Array([1, 0, 0, 0, 0, 1, 0, 0]);

    batcher.addDrawCall({
      type: 'triangle',
      vertices: vertices1,
      uniforms: { u_color: 1.0 },
      priority: 'normal'
    });

    batcher.addDrawCall({
      type: 'triangle',
      vertices: vertices2,
      uniforms: { u_color: 0.5 },
      priority: 'normal'
    });

    // Force flush to trigger batching
    batcher.flush();

    expect(gl.bufferData).toHaveBeenCalled();
    expect(gl.drawArrays).toHaveBeenCalled();
  });

  it('should handle high priority draw calls immediately', async () => {
    batcher.addDrawCall({
      type: 'triangle',
      vertices: new Float32Array([0, 0, 0, 0, 0, 1, 0, 0]),
      uniforms: { u_color: 1.0 },
      priority: 'low'
    });

    batcher.addDrawCall({
      type: 'triangle',
      vertices: new Float32Array([1, 0, 0, 0, 0, 1, 0, 0]),
      uniforms: { u_color: 1.0 },
      priority: 'high' // Should trigger immediate rendering
    });

    // Small delay to allow async processing
    await new Promise(resolve => setTimeout(resolve, 50));

    expect(gl.drawArrays).toHaveBeenCalled();
  });

  it('should render when max batch size is reached', () => {
    // Add draw calls up to max batch size
    for (let i = 0; i < 3; i++) {
      batcher.addDrawCall({
        type: 'triangle',
        vertices: new Float32Array([i, 0, 0, 0, 0, 1, 0, 0]),
        uniforms: { u_color: 1.0 },
        priority: 'normal'
      });
    }

    // Should have triggered immediate rendering
    expect(gl.drawArrays).toHaveBeenCalled();
  });

  it('should handle indexed drawing correctly', () => {
    batcher.addDrawCall({
      type: 'triangle',
      vertices: new Float32Array([0, 0, 0, 0, 0, 1, 0, 0,
                                  1, 0, 0, 0, 0, 1, 0, 0,
                                  0, 1, 0, 0, 0, 1, 0, 0]),
      indices: new Uint16Array([0, 1, 2]),
      uniforms: { u_color: 1.0 },
      priority: 'normal'
    });

    batcher.flush();

    expect(gl.bindBuffer).toHaveBeenCalledWith(gl.ELEMENT_ARRAY_BUFFER, expect.anything());
    expect(gl.drawElements).toHaveBeenCalled();
  });

  it('should track statistics correctly', () => {
    batcher.addDrawCall({
      type: 'triangle',
      vertices: new Float32Array([0, 0, 0, 0, 0, 1, 0, 0]),
      uniforms: { u_color: 1.0 },
      priority: 'normal'
    });

    batcher.addDrawCall({
      type: 'triangle',
      vertices: new Float32Array([1, 0, 0, 0, 0, 1, 0, 0]),
      uniforms: { u_color: 1.0 },
      priority: 'normal'
    });

    batcher.flush();

    const stats = batcher.getStats();
    expect(stats.totalDrawCalls).toBe(2);
    expect(stats.totalBatches).toBeGreaterThan(0);
    expect(stats.compressionRatio).toBeGreaterThan(1);
  });

  it('should handle different primitive types separately', () => {
    batcher.addDrawCall({
      type: 'triangle',
      vertices: new Float32Array([0, 0, 0, 0, 0, 1, 0, 0]),
      uniforms: { u_color: 1.0 },
      priority: 'normal'
    });

    batcher.addDrawCall({
      type: 'line',
      vertices: new Float32Array([0, 0, 0, 0, 0, 1, 0, 0]),
      uniforms: { u_color: 1.0 },
      priority: 'normal'
    });

    batcher.flush();

    // Should have made separate draw calls for different primitive types
    expect(gl.drawArrays).toHaveBeenCalledTimes(2);
  });

  it('should dispose resources correctly', () => {
    batcher.dispose();

    expect(gl.deleteBuffer).toHaveBeenCalledTimes(2);
  });

  it('should handle empty batches gracefully', () => {
    // Try to flush with no draw calls
    expect(() => batcher.flush()).not.toThrow();
  });

  it('should merge uniforms correctly when batching', () => {
    batcher.addDrawCall({
      type: 'triangle',
      vertices: new Float32Array([0, 0, 0, 0, 0, 1, 0, 0]),
      uniforms: { u_color: 1.0, u_intensity: 0.5 },
      priority: 'normal'
    });

    batcher.addDrawCall({
      type: 'triangle',
      vertices: new Float32Array([1, 0, 0, 0, 0, 1, 0, 0]),
      uniforms: { u_color: 0.5, u_brightness: 1.0 },
      priority: 'normal'
    });

    batcher.flush();

    const stats = batcher.getStats();
    expect(stats.totalBatches).toBe(1); // Should be batched together
  });

  it('should respect frame timeout for rendering', async () => {
    const fastBatcher = new WebGLBatcher(gl, {
      frameTimeoutMs: 10 // Very short timeout
    });

    fastBatcher.addDrawCall({
      type: 'triangle',
      vertices: new Float32Array([0, 0, 0, 0, 0, 1, 0, 0]),
      uniforms: { u_color: 1.0 },
      priority: 'normal'
    });

    // Should render within timeout
    await new Promise(resolve => setTimeout(resolve, 50));

    const stats = fastBatcher.getStats();
    expect(stats.totalBatches).toBeGreaterThan(0);

    fastBatcher.dispose();
  });
}); 