// src/shared/utils/webgl.ts
import { logger } from './secureLogger';

export interface ShaderProgram {
  program: WebGLProgram;
  uniforms: Record<string, WebGLUniformLocation | null>;
  attributes: Record<string, number>;
}

export interface WebGLMesh {
  vertexBuffer: WebGLBuffer;
  indexBuffer: WebGLBuffer;
  vertexCount: number;
}

export class WebGLUtils {
  static createShader(gl: WebGLRenderingContext | WebGL2RenderingContext, type: number, source: string): WebGLShader | null {
    const shader = gl.createShader(type);
    if (!shader) {
      logger.error('Failed to create shader');
      return null;
    }

    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const error = gl.getShaderInfoLog(shader);
      logger.error('Shader compilation error:', error);
      gl.deleteShader(shader);
      return null;
    }

    return shader;
  }

  static createProgram(
    gl: WebGLRenderingContext | WebGL2RenderingContext,
    vertexSource: string,
    fragmentSource: string
  ): ShaderProgram | null {
    const vertexShader = this.createShader(gl, gl.VERTEX_SHADER, vertexSource);
    const fragmentShader = this.createShader(gl, gl.FRAGMENT_SHADER, fragmentSource);

    if (!vertexShader || !fragmentShader) {
      return null;
    }

    const program = gl.createProgram();
    if (!program) {
      logger.error('Failed to create shader program');
      return null;
    }

    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      const error = gl.getProgramInfoLog(program);
      logger.error('Program linking error:', error);
      gl.deleteProgram(program);
      return null;
    }

    // Get uniforms and attributes
    const uniforms: Record<string, WebGLUniformLocation | null> = {};
    const attributes: Record<string, number> = {};

    const uniformCount = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
    for (let i = 0; i < uniformCount; i++) {
      const uniformInfo = gl.getActiveUniform(program, i);
      if (uniformInfo) {
        uniforms[uniformInfo.name] = gl.getUniformLocation(program, uniformInfo.name);
      }
    }

    const attributeCount = gl.getProgramParameter(program, gl.ACTIVE_ATTRIBUTES);
    for (let i = 0; i < attributeCount; i++) {
      const attributeInfo = gl.getActiveAttrib(program, i);
      if (attributeInfo) {
        attributes[attributeInfo.name] = gl.getAttribLocation(program, attributeInfo.name);
      }
    }

    // Clean up shaders
    gl.deleteShader(vertexShader);
    gl.deleteShader(fragmentShader);

    return {
      program,
      uniforms,
      attributes
    };
  }

  static createBuffer(gl: WebGLRenderingContext | WebGL2RenderingContext, data: Float32Array, usage = gl.STATIC_DRAW): WebGLBuffer | null {
    const buffer = gl.createBuffer();
    if (!buffer) {
      logger.error('Failed to create buffer');
      return null;
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, data, usage);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);

    return buffer;
  }

  static createIndexBuffer(gl: WebGLRenderingContext | WebGL2RenderingContext, data: Uint16Array, usage = gl.STATIC_DRAW): WebGLBuffer | null {
    const buffer = gl.createBuffer();
    if (!buffer) {
      logger.error('Failed to create index buffer');
      return null;
    }

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, data, usage);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);

    return buffer;
  }

  static createQuadMesh(gl: WebGLRenderingContext | WebGL2RenderingContext): WebGLMesh | null {
    // Quad vertices: position (x, y) and texture coordinates (u, v)
    const vertices = new Float32Array([
      -1.0, -1.0,  0.0, 0.0,  // Bottom-left
       1.0, -1.0,  1.0, 0.0,  // Bottom-right
       1.0,  1.0,  1.0, 1.0,  // Top-right
      -1.0,  1.0,  0.0, 1.0   // Top-left
    ]);

    const indices = new Uint16Array([
      0, 1, 2,  // First triangle
      0, 2, 3   // Second triangle
    ]);

    const vertexBuffer = this.createBuffer(gl, vertices);
    const indexBuffer = this.createIndexBuffer(gl, indices);

    if (!vertexBuffer || !indexBuffer) {
      return null;
    }

    return {
      vertexBuffer,
      indexBuffer,
      vertexCount: indices.length
    };
  }

  static createCircleMesh(gl: WebGLRenderingContext | WebGL2RenderingContext, segments = 32): WebGLMesh | null {
    const vertices: number[] = [];
    const indices: number[] = [];

    // Center vertex
    vertices.push(0, 0, 0.5, 0.5);

    // Circle vertices
    for (let i = 0; i <= segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      const x = Math.cos(angle);
      const y = Math.sin(angle);
      const u = (x + 1) * 0.5;
      const v = (y + 1) * 0.5;
      
      vertices.push(x, y, u, v);
    }

    // Create triangles
    for (let i = 1; i <= segments; i++) {
      indices.push(0, i, i + 1);
    }
    indices.push(0, segments + 1, 1); // Close the circle

    const vertexBuffer = this.createBuffer(gl, new Float32Array(vertices));
    const indexBuffer = this.createIndexBuffer(gl, new Uint16Array(indices));

    if (!vertexBuffer || !indexBuffer) {
      return null;
    }

    return {
      vertexBuffer,
      indexBuffer,
      vertexCount: indices.length
    };
  }

  static setUniform1f(gl: WebGLRenderingContext | WebGL2RenderingContext, location: WebGLUniformLocation | null, value: number): void {
    if (location !== null && location !== undefined) {
      gl.uniform1f(location, value);
    }
  }

  static setUniform3f(gl: WebGLRenderingContext | WebGL2RenderingContext, location: WebGLUniformLocation | null, x: number, y: number, z: number): void {
    if (location !== null && location !== undefined) {
      gl.uniform3f(location, x, y, z);
    }
  }

  static setUniformMatrix3(gl: WebGLRenderingContext | WebGL2RenderingContext, location: WebGLUniformLocation | null, matrix: Float32Array): void {
    if (location !== null && location !== undefined) {
      gl.uniformMatrix3fv(location, false, matrix);
    }
  }

  static createTexture(gl: WebGLRenderingContext | WebGL2RenderingContext, width: number, height: number, data?: Uint8Array): WebGLTexture | null {
    const texture = gl.createTexture();
    if (!texture) {
      logger.error('Failed to create texture');
      return null;
    }

    gl.bindTexture(gl.TEXTURE_2D, texture);
    
    if (data) {
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, data);
    } else {
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    }
    
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    
    gl.bindTexture(gl.TEXTURE_2D, null);

    return texture;
  }

  static generateNoiseTexture(gl: WebGLRenderingContext | WebGL2RenderingContext, size = 256): WebGLTexture | null {
    const data = new Uint8Array(size * size * 4);
    
    for (let i = 0; i < size * size; i++) {
      const noise = Math.random();
      data[i * 4] = noise * 255;     // R
      data[i * 4 + 1] = noise * 255; // G
      data[i * 4 + 2] = noise * 255; // B
      data[i * 4 + 3] = 255;         // A
    }

    return this.createTexture(gl, size, size, data);
  }

  static resizeCanvas(canvas: HTMLCanvasElement, displayWidth?: number, displayHeight?: number): boolean {
    const width = displayWidth || canvas.clientWidth;
    const height = displayHeight || canvas.clientHeight;

    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
      return true;
    }
    return false;
  }
}

export default WebGLUtils;