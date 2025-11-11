// src/background/services/WebGLRenderer.ts
// Moteur de rendu WebGL pour les organismes SYMBIONT
// G�re le pipeline de rendu complet avec support WebGL1/WebGL2

import { logger } from '@/shared/utils/secureLogger';
import { SecureRandom } from '@/shared/utils/secureRandom';
import { WebGLBatcher, WebGLDrawCall } from '@/core/utils/WebGLBatcher';

export interface RenderOptions {
  width: number;
  height: number;
  quality: 'low' | 'medium' | 'high';
  effects: string[];
  enableBatching?: boolean;
}

export interface OrganismRenderData {
  id: string;
  position: [number, number];
  scale: number;
  rotation: number;
  color: [number, number, number];
  traits: {
    curiosity: number;
    focus: number;
    rhythm: number;
    empathy: number;
    creativity: number;
  };
  energy: number;
  consciousness: number;
  generation: number;
}

export interface ShaderSource {
  vertex: string;
  fragment: string;
}

export class WebGLRenderer {
  private canvas: HTMLCanvasElement | OffscreenCanvas | null = null;
  private gl: WebGLRenderingContext | WebGL2RenderingContext | null = null;
  private isWebGL2 = false;
  private batcher: WebGLBatcher | null = null;

  // Shader programs
  private programs: Map<string, WebGLProgram> = new Map();
  private currentProgram: WebGLProgram | null = null;

  // Buffers
  private buffers: Map<string, WebGLBuffer> = new Map();
  private textures: Map<string, WebGLTexture> = new Map();

  // Rendering state
  private isInitialized = false;
  private frameCount = 0;
  private startTime = Date.now();

  // Performance metrics
  private metrics = {
    fps: 0,
    frameTime: 0,
    drawCalls: 0,
    verticesRendered: 0
  };

  constructor() {
    // Constructor vide, l'initialisation se fait via initialize()
  }

  /**
   * Initialise le contexte WebGL
   */
  async initialize(
    canvas: HTMLCanvasElement | OffscreenCanvas,
    options: Partial<RenderOptions> = {}
  ): Promise<boolean> {
    try {
      this.canvas = canvas;

      // Tenter d'obtenir un contexte WebGL2 en premier
      const contextOptions: WebGLContextAttributes = {
        alpha: true,
        depth: true,
        stencil: false,
        antialias: options.quality !== 'low',
        premultipliedAlpha: false,
        preserveDrawingBuffer: false,
        powerPreference: options.quality === 'high' ? 'high-performance' : 'default',
        failIfMajorPerformanceCaveat: false
      };

      // Cascade de fallback
      this.gl = canvas.getContext('webgl2', contextOptions) as WebGL2RenderingContext | null;
      if (this.gl) {
        this.isWebGL2 = true;
        logger.info('WebGL2 context acquired for renderer');
      } else {
        this.gl = canvas.getContext('webgl', contextOptions) as WebGLRenderingContext | null;
        if (this.gl) {
          logger.info('WebGL1 context acquired for renderer');
        }
      }

      if (!this.gl) {
        // Dernier recours (seulement pour HTMLCanvasElement, pas OffscreenCanvas)
        if (canvas instanceof HTMLCanvasElement) {
          this.gl = canvas.getContext('experimental-webgl' as any, contextOptions) as WebGLRenderingContext | null;
          if (this.gl) {
            logger.warn('Using experimental-webgl context');
          }
        }

        if (!this.gl) {
          throw new Error('Failed to acquire WebGL context');
        }
      }

      // Initialiser le batcher si activ�
      if (options.enableBatching !== false) {
        this.batcher = new WebGLBatcher(this.gl, {
          maxBatchSize: 100,
          maxVertices: 65536,
          frameTimeoutMs: 16.67,
          enableInstancing: this.isWebGL2
        });
      }

      // Configuration WebGL de base
      this.gl.enable(this.gl.BLEND);
      this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);
      this.gl.enable(this.gl.DEPTH_TEST);
      this.gl.depthFunc(this.gl.LEQUAL);
      this.gl.clearColor(0.0, 0.0, 0.0, 0.0);

      this.isInitialized = true;
      logger.info('WebGLRenderer initialized successfully');
      return true;

    } catch (error) {
      logger.error('WebGLRenderer initialization failed:', error);
      return false;
    }
  }

  /**
   * Compile et stocke un programme shader
   */
  createShaderProgram(name: string, vertexSource: string, fragmentSource: string): boolean {
    if (!this.gl) {
      logger.error('Cannot create shader program: WebGL context not initialized');
      return false;
    }

    try {
      const vertexShader = this.compileShader(this.gl.VERTEX_SHADER, vertexSource);
      const fragmentShader = this.compileShader(this.gl.FRAGMENT_SHADER, fragmentSource);

      if (!vertexShader || !fragmentShader) {
        throw new Error('Shader compilation failed');
      }

      const program = this.gl.createProgram();
      if (!program) {
        throw new Error('Failed to create shader program');
      }

      this.gl.attachShader(program, vertexShader);
      this.gl.attachShader(program, fragmentShader);
      this.gl.linkProgram(program);

      if (!this.gl.getProgramParameter(program, this.gl.LINK_STATUS)) {
        const info = this.gl.getProgramInfoLog(program);
        throw new Error(`Shader program linking failed: ${info}`);
      }

      // Cleanup shaders (they're now linked into program)
      this.gl.deleteShader(vertexShader);
      this.gl.deleteShader(fragmentShader);

      this.programs.set(name, program);
      logger.info(`Shader program '${name}' created successfully`);
      return true;

    } catch (error) {
      logger.error(`Failed to create shader program '${name}':`, error);
      return false;
    }
  }

  /**
   * Compile un shader individuel
   */
  private compileShader(type: number, source: string): WebGLShader | null {
    if (!this.gl) return null;

    const shader = this.gl.createShader(type);
    if (!shader) return null;

    this.gl.shaderSource(shader, source);
    this.gl.compileShader(shader);

    if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
      const info = this.gl.getShaderInfoLog(shader);
      logger.error(`Shader compilation failed: ${info}`);
      this.gl.deleteShader(shader);
      return null;
    }

    return shader;
  }

  /**
   * Utilise un programme shader
   */
  useProgram(name: string): boolean {
    if (!this.gl) return false;

    const program = this.programs.get(name);
    if (!program) {
      logger.warn(`Shader program '${name}' not found`);
      return false;
    }

    this.gl.useProgram(program);
    this.currentProgram = program;
    return true;
  }

  /**
   * Cr�e un buffer WebGL
   */
  createBuffer(name: string, data: Float32Array | Uint16Array, target: 'array' | 'element'): boolean {
    if (!this.gl) return false;

    try {
      const buffer = this.gl.createBuffer();
      if (!buffer) {
        throw new Error('Failed to create buffer');
      }

      const targetType = target === 'array' ? this.gl.ARRAY_BUFFER : this.gl.ELEMENT_ARRAY_BUFFER;
      this.gl.bindBuffer(targetType, buffer);
      this.gl.bufferData(targetType, data, this.gl.STATIC_DRAW);

      this.buffers.set(name, buffer);
      return true;

    } catch (error) {
      logger.error(`Failed to create buffer '${name}':`, error);
      return false;
    }
  }

  /**
   * Cr�e une texture 2D
   */
  createTexture(name: string, width: number, height: number, data?: Uint8Array): boolean {
    if (!this.gl) return false;

    try {
      const texture = this.gl.createTexture();
      if (!texture) {
        throw new Error('Failed to create texture');
      }

      this.gl.bindTexture(this.gl.TEXTURE_2D, texture);

      // G�n�ration de donn�es de noise si non fournies
      const textureData = data || this.generateNoiseData(width, height);

      this.gl.texImage2D(
        this.gl.TEXTURE_2D,
        0,
        this.gl.RGBA,
        width,
        height,
        0,
        this.gl.RGBA,
        this.gl.UNSIGNED_BYTE,
        textureData
      );

      // Configuration de la texture
      this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.REPEAT);
      this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.REPEAT);
      this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
      this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR);

      this.textures.set(name, texture);
      return true;

    } catch (error) {
      logger.error(`Failed to create texture '${name}':`, error);
      return false;
    }
  }

  /**
   * G�n�re des donn�es de bruit proc�dural
   */
  private generateNoiseData(width: number, height: number): Uint8Array {
    const data = new Uint8Array(width * height * 4);

    for (let i = 0; i < width * height; i++) {
      const value = Math.floor(SecureRandom.random() * 256);
      data[i * 4] = value;
      data[i * 4 + 1] = value;
      data[i * 4 + 2] = value;
      data[i * 4 + 3] = 255;
    }

    return data;
  }

  /**
   * Rend un organisme
   */
  renderOrganism(organism: OrganismRenderData): void {
    if (!this.gl || !this.currentProgram || !this.batcher) {
      logger.warn('Cannot render organism: renderer not fully initialized');
      return;
    }

    // Si le batching est activ�, ajouter au batch
    if (this.batcher) {
      const drawCall = this.createOrganismDrawCall(organism);
      this.batcher.addDrawCall(drawCall);
    } else {
      // Rendu direct
      this.renderOrganismDirect(organism);
    }

    this.metrics.drawCalls++;
  }

  /**
   * Cr�e un draw call pour un organisme
   */
  private createOrganismDrawCall(organism: OrganismRenderData): Omit<WebGLDrawCall, 'id' | 'timestamp'> {
    // Cr�er un quad simple pour l'organisme
    const size = organism.scale;
    const vertices = new Float32Array([
      // Position (x, y), Normal (x, y, z), UV (u, v)
      -size, -size, 0, 0, -1, 0, 0,
       size, -size, 0, 0, -1, 1, 0,
       size,  size, 0, 0, -1, 1, 1,
      -size,  size, 0, 0, -1, 0, 1
    ]);

    const indices = new Uint16Array([0, 1, 2, 0, 2, 3]);

    return {
      type: 'triangle',
      vertices,
      indices,
      uniforms: {
        u_position: new Float32Array(organism.position),
        u_rotation: organism.rotation,
        u_color: new Float32Array(organism.color),
        u_energy: organism.energy / 100,
        u_consciousness: organism.consciousness
      },
      priority: organism.energy > 70 ? 'high' : 'normal'
    };
  }

  /**
   * Rend un organisme directement (sans batching)
   */
  private renderOrganismDirect(organism: OrganismRenderData): void {
    if (!this.gl || !this.currentProgram) return;

    // Implementation du rendu direct
    // TODO: Impl�menter le rendu sans batching si n�cessaire
    logger.debug(`Direct rendering organism ${organism.id}`);
  }

  /**
   * Efface le buffer de rendu
   */
  clear(): void {
    if (!this.gl) return;
    this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
  }

  /**
   * Finalise le rendu du frame
   */
  flush(): void {
    if (this.batcher) {
      this.batcher.flush();
    }

    this.frameCount++;
    this.updateMetrics();
  }

  /**
   * Met � jour les m�triques de performance
   */
  private updateMetrics(): void {
    const now = Date.now();
    const elapsed = (now - this.startTime) / 1000;

    if (elapsed > 0) {
      this.metrics.fps = this.frameCount / elapsed;
    }
  }

  /**
   * Obtient les m�triques de performance
   */
  getMetrics(): typeof this.metrics {
    return { ...this.metrics };
  }

  /**
   * Redimensionne le canvas
   */
  resize(width: number, height: number): void {
    if (!this.canvas || !this.gl) return;

    this.canvas.width = width;
    this.canvas.height = height;
    this.gl.viewport(0, 0, width, height);
  }

  /**
   * V�rifie si le renderer est initialis�
   */
  isReady(): boolean {
    return this.isInitialized && this.gl !== null;
  }

  /**
   * Nettoie les ressources WebGL
   */
  dispose(): void {
    if (!this.gl) return;

    try {
      // Nettoyer le batcher
      if (this.batcher) {
        this.batcher.dispose();
        this.batcher = null;
      }

      // Supprimer les programmes
      for (const program of this.programs.values()) {
        this.gl.deleteProgram(program);
      }
      this.programs.clear();

      // Supprimer les buffers
      for (const buffer of this.buffers.values()) {
        this.gl.deleteBuffer(buffer);
      }
      this.buffers.clear();

      // Supprimer les textures
      for (const texture of this.textures.values()) {
        this.gl.deleteTexture(texture);
      }
      this.textures.clear();

      this.gl = null;
      this.canvas = null;
      this.isInitialized = false;

      logger.info('WebGLRenderer disposed successfully');

    } catch (error) {
      logger.error('Error during WebGLRenderer disposal:', error);
    }
  }
}

export default WebGLRenderer;
