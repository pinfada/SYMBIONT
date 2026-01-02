// src/background/services/WebGLSceneManager.ts
// Gestionnaire de scène WebGL avec pooling d'objets et gestion optimisée des ressources
// Implémente un système de rendu multi-passes avec frustum culling et LOD

import { logger } from '@/shared/utils/secureLogger';
import WebGLRenderer, { OrganismRenderData } from './WebGLRenderer';

export interface SceneObject {
  id: string;
  type: 'organism' | 'particle' | 'environment';
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
  boundingBox: {
    min: [number, number, number];
    max: [number, number, number];
  };
  lodLevel: number; // 0 = high, 1 = medium, 2 = low
  visible: boolean;
  userData?: any;
}

export interface Camera {
  position: [number, number, number];
  rotation: [number, number, number];
  fov: number;
  aspect: number;
  near: number;
  far: number;
  viewMatrix?: Float32Array;
  projectionMatrix?: Float32Array;
}

export interface Light {
  type: 'directional' | 'point' | 'ambient';
  position?: [number, number, number];
  direction?: [number, number, number];
  color: [number, number, number];
  intensity: number;
}

export interface RenderPass {
  name: string;
  enabled: boolean;
  order: number;
  shader: string;
  renderTarget?: 'screen' | 'texture';
  clearColor?: [number, number, number, number];
  clearDepth?: boolean;
  clearStencil?: boolean;
}

interface ObjectPool<T> {
  available: T[];
  inUse: Map<string, T>;
  create: () => T;
  max: number;
}

export class WebGLSceneManager {
  private renderer: WebGLRenderer;
  private canvas: HTMLCanvasElement | OffscreenCanvas | null = null;
  private gl: WebGL2RenderingContext | WebGLRenderingContext | null = null;

  // Scene management
  private objects: Map<string, SceneObject> = new Map();
  private visibleObjects: Set<string> = new Set();
  private camera: Camera;
  private lights: Light[] = [];

  // Render passes
  private renderPasses: RenderPass[] = [];
  private framebuffers: Map<string, WebGLFramebuffer> = new Map();
  private renderTextures: Map<string, WebGLTexture> = new Map();

  // Object pooling for performance
  private matrixPool: ObjectPool<Float32Array>;
  private vectorPool: ObjectPool<Float32Array>;

  // Performance metrics
  private metrics = {
    objectsInScene: 0,
    objectsCulled: 0,
    drawCallsPerFrame: 0,
    trianglesRendered: 0,
    frameTime: 0,
    fps: 0
  };

  // Frame timing
  private frameCount = 0;
  private fpsUpdateTime = 0;

  // Configuration
  private config = {
    enableFrustumCulling: true,
    enableLOD: true,
    enableObjectPooling: true,
    maxObjectsPerFrame: 1000,
    shadowMapSize: 2048,
    enableShadows: false
  };

  constructor(renderer: WebGLRenderer) {
    this.renderer = renderer;

    // Initialize camera with default values
    this.camera = {
      position: [0, 0, 5],
      rotation: [0, 0, 0],
      fov: 60,
      aspect: 1,
      near: 0.1,
      far: 1000
    };

    // Initialize object pools
    this.matrixPool = this.createMatrixPool();
    this.vectorPool = this.createVectorPool();

    // Setup default render passes
    this.setupDefaultRenderPasses();
  }

  /**
   * Initialize scene manager with WebGL context
   */
  async initialize(
    canvas: HTMLCanvasElement | OffscreenCanvas,
    gl: WebGL2RenderingContext | WebGLRenderingContext
  ): Promise<void> {
    this.canvas = canvas;
    this.gl = gl;

    // Update camera aspect ratio
    this.camera.aspect = canvas.width / canvas.height;

    // Initialize framebuffers for multi-pass rendering
    this.initializeFramebuffers();

    // Setup default lighting
    this.setupDefaultLighting();

    // Calculate initial matrices
    this.updateCameraMatrices();

    logger.info('WebGL Scene Manager initialized');
  }

  /**
   * Create object pool for matrices
   */
  private createMatrixPool(): ObjectPool<Float32Array> {
    return {
      available: [],
      inUse: new Map(),
      create: () => new Float32Array(16),
      max: 100
    };
  }

  /**
   * Create object pool for vectors
   */
  private createVectorPool(): ObjectPool<Float32Array> {
    return {
      available: [],
      inUse: new Map(),
      create: () => new Float32Array(4),
      max: 200
    };
  }

  /**
   * Get matrix from pool (currently unused but kept for future optimization)
   */
  /*
  private getPooledMatrix(id: string): Float32Array {
    if (!this.config.enableObjectPooling) {
      return new Float32Array(16);
    }

    let matrix = this.matrixPool.available.pop();
    if (!matrix) {
      matrix = this.matrixPool.create();
    }

    this.matrixPool.inUse.set(id, matrix);
    return matrix;
  }
  */

  /**
   * Return matrix to pool
   */
  private releasePooledMatrix(id: string): void {
    if (!this.config.enableObjectPooling) return;

    const matrix = this.matrixPool.inUse.get(id);
    if (matrix && this.matrixPool.available.length < this.matrixPool.max) {
      this.matrixPool.available.push(matrix);
    }
    this.matrixPool.inUse.delete(id);
  }

  /**
   * Setup default render passes
   */
  private setupDefaultRenderPasses(): void {
    this.renderPasses = [
      {
        name: 'shadow',
        enabled: false, // Disabled by default for performance
        order: 0,
        shader: 'shadow',
        renderTarget: 'texture',
        clearDepth: true
      },
      {
        name: 'main',
        enabled: true,
        order: 1,
        shader: 'organism',
        renderTarget: 'screen',
        clearColor: [0, 0, 0, 1],
        clearDepth: true
      },
      {
        name: 'particles',
        enabled: true,
        order: 2,
        shader: 'particle',
        renderTarget: 'screen',
        clearDepth: false
      },
      {
        name: 'postprocess',
        enabled: false, // Enable when post-processing is needed
        order: 3,
        shader: 'postprocess',
        renderTarget: 'screen'
      }
    ];

    // Sort by order
    this.renderPasses.sort((a, b) => a.order - b.order);
  }

  /**
   * Initialize framebuffers for render-to-texture
   */
  private initializeFramebuffers(): void {
    if (!this.gl || !this.canvas) return;

    const gl = this.gl;
    const width = this.canvas.width;
    const height = this.canvas.height;

    // Shadow map framebuffer
    if (this.config.enableShadows) {
      const shadowFBO = gl.createFramebuffer();
      const shadowTexture = gl.createTexture();

      if (shadowFBO && shadowTexture) {
        gl.bindTexture(gl.TEXTURE_2D, shadowTexture);
        gl.texImage2D(
          gl.TEXTURE_2D, 0, gl.DEPTH_COMPONENT,
          this.config.shadowMapSize, this.config.shadowMapSize,
          0, gl.DEPTH_COMPONENT, gl.UNSIGNED_SHORT, null
        );
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

        gl.bindFramebuffer(gl.FRAMEBUFFER, shadowFBO);
        gl.framebufferTexture2D(
          gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT,
          gl.TEXTURE_2D, shadowTexture, 0
        );

        this.framebuffers.set('shadow', shadowFBO);
        this.renderTextures.set('shadow', shadowTexture);
      }
    }

    // Post-processing framebuffer
    const postFBO = gl.createFramebuffer();
    const postTexture = gl.createTexture();

    if (postFBO && postTexture) {
      gl.bindTexture(gl.TEXTURE_2D, postTexture);
      gl.texImage2D(
        gl.TEXTURE_2D, 0, gl.RGBA,
        width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null
      );
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

      gl.bindFramebuffer(gl.FRAMEBUFFER, postFBO);
      gl.framebufferTexture2D(
        gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0,
        gl.TEXTURE_2D, postTexture, 0
      );

      this.framebuffers.set('postprocess', postFBO);
      this.renderTextures.set('postprocess', postTexture);
    }

    // Restore default framebuffer
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }

  /**
   * Setup default lighting
   */
  private setupDefaultLighting(): void {
    // Ambient light
    this.lights.push({
      type: 'ambient',
      color: [0.2, 0.2, 0.3],
      intensity: 0.5
    });

    // Main directional light
    this.lights.push({
      type: 'directional',
      direction: [-0.5, -0.7, -0.5],
      color: [1.0, 0.95, 0.8],
      intensity: 1.0
    });

    // Fill light
    this.lights.push({
      type: 'directional',
      direction: [0.5, 0.3, 0.7],
      color: [0.4, 0.5, 0.7],
      intensity: 0.3
    });
  }

  /**
   * Add object to scene
   */
  addObject(object: SceneObject): void {
    this.objects.set(object.id, object);
    this.metrics.objectsInScene = this.objects.size;

    // Calculate initial bounding box if not provided
    if (!object.boundingBox) {
      object.boundingBox = this.calculateBoundingBox(object);
    }
  }

  /**
   * Remove object from scene
   */
  removeObject(id: string): void {
    this.objects.delete(id);
    this.visibleObjects.delete(id);
    this.releasePooledMatrix(id);
    this.metrics.objectsInScene = this.objects.size;
  }

  /**
   * Update object properties
   */
  updateObject(id: string, updates: Partial<SceneObject>): void {
    const object = this.objects.get(id);
    if (object) {
      Object.assign(object, updates);

      // Recalculate bounding box if transform changed
      if (updates.position || updates.rotation || updates.scale) {
        object.boundingBox = this.calculateBoundingBox(object);
      }
    }
  }

  /**
   * Calculate object bounding box
   */
  private calculateBoundingBox(object: SceneObject): SceneObject['boundingBox'] {
    const halfScale = object.scale.map(s => s * 0.5) as [number, number, number];

    return {
      min: [
        object.position[0] - halfScale[0],
        object.position[1] - halfScale[1],
        object.position[2] - halfScale[2]
      ],
      max: [
        object.position[0] + halfScale[0],
        object.position[1] + halfScale[1],
        object.position[2] + halfScale[2]
      ]
    };
  }

  /**
   * Update camera matrices
   */
  private updateCameraMatrices(): void {
    // View matrix calculation
    this.camera.viewMatrix = this.calculateViewMatrix(
      this.camera.position,
      this.camera.rotation
    );

    // Projection matrix calculation
    this.camera.projectionMatrix = this.calculateProjectionMatrix(
      this.camera.fov,
      this.camera.aspect,
      this.camera.near,
      this.camera.far
    );
  }

  /**
   * Calculate view matrix
   */
  private calculateViewMatrix(
    position: [number, number, number],
    rotation: [number, number, number]
  ): Float32Array {
    const matrix = new Float32Array(16);

    // Simplified view matrix (can be replaced with proper lookAt implementation)
    const [x, y, z] = position;
    const [rx, ry, rz] = rotation;

    const cosX = Math.cos(rx);
    const sinX = Math.sin(rx);
    const cosY = Math.cos(ry);
    const sinY = Math.sin(ry);
    const cosZ = Math.cos(rz);
    const sinZ = Math.sin(rz);

    // Combined rotation and translation
    matrix[0] = cosY * cosZ;
    matrix[1] = cosY * sinZ;
    matrix[2] = -sinY;
    matrix[3] = 0;

    matrix[4] = sinX * sinY * cosZ - cosX * sinZ;
    matrix[5] = sinX * sinY * sinZ + cosX * cosZ;
    matrix[6] = sinX * cosY;
    matrix[7] = 0;

    matrix[8] = cosX * sinY * cosZ + sinX * sinZ;
    matrix[9] = cosX * sinY * sinZ - sinX * cosZ;
    matrix[10] = cosX * cosY;
    matrix[11] = 0;

    matrix[12] = -x;
    matrix[13] = -y;
    matrix[14] = -z;
    matrix[15] = 1;

    return matrix;
  }

  /**
   * Calculate projection matrix
   */
  private calculateProjectionMatrix(
    fov: number,
    aspect: number,
    near: number,
    far: number
  ): Float32Array {
    const matrix = new Float32Array(16);
    const f = 1.0 / Math.tan(fov * Math.PI / 360);
    const rangeInv = 1 / (near - far);

    matrix[0] = f / aspect;
    matrix[5] = f;
    matrix[10] = (near + far) * rangeInv;
    matrix[11] = -1;
    matrix[14] = near * far * rangeInv * 2;

    return matrix;
  }

  /**
   * Perform frustum culling
   */
  private performFrustumCulling(): void {
    if (!this.config.enableFrustumCulling) {
      // All objects are visible if culling disabled
      this.visibleObjects = new Set(this.objects.keys());
      return;
    }

    this.visibleObjects.clear();
    let culledCount = 0;

    for (const [id, object] of this.objects) {
      if (this.isInFrustum(object)) {
        this.visibleObjects.add(id);
      } else {
        culledCount++;
      }
    }

    this.metrics.objectsCulled = culledCount;
  }

  /**
   * Check if object is in camera frustum
   */
  private isInFrustum(object: SceneObject): boolean {
    // Simplified frustum check (can be enhanced with proper plane equations)
    const camPos = this.camera.position;
    const objPos = object.position;

    // Distance check
    const dx = objPos[0] - camPos[0];
    const dy = objPos[1] - camPos[1];
    const dz = objPos[2] - camPos[2];
    const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

    // Check if within near/far planes
    if (distance < this.camera.near || distance > this.camera.far) {
      return false;
    }

    // Simple FOV check (can be improved)
    const maxFOVDistance = distance * Math.tan(this.camera.fov * Math.PI / 360);
    const screenX = Math.abs(dx);
    const screenY = Math.abs(dy);

    return screenX <= maxFOVDistance && screenY <= maxFOVDistance;
  }

  /**
   * Calculate LOD level based on distance
   */
  private calculateLOD(object: SceneObject): number {
    if (!this.config.enableLOD) return 0;

    const camPos = this.camera.position;
    const objPos = object.position;

    const dx = objPos[0] - camPos[0];
    const dy = objPos[1] - camPos[1];
    const dz = objPos[2] - camPos[2];
    const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

    // LOD thresholds
    if (distance < 10) return 0;  // High detail
    if (distance < 50) return 1;  // Medium detail
    return 2;  // Low detail
  }

  /**
   * Main render function
   */
  render(): void {
    if (!this.gl || !this.renderer.isReady()) return;

    const startTime = performance.now();

    // Update camera
    this.updateCameraMatrices();

    // Perform culling
    this.performFrustumCulling();

    // Update LOD levels
    for (const id of this.visibleObjects) {
      const object = this.objects.get(id);
      if (object) {
        object.lodLevel = this.calculateLOD(object);
      }
    }

    // Reset metrics
    this.metrics.drawCallsPerFrame = 0;
    this.metrics.trianglesRendered = 0;

    // Execute render passes
    for (const pass of this.renderPasses) {
      if (!pass.enabled) continue;

      this.executeRenderPass(pass);
    }

    // Update performance metrics
    const endTime = performance.now();
    this.updateMetrics(endTime - startTime);
  }

  /**
   * Execute single render pass
   */
  private executeRenderPass(pass: RenderPass): void {
    if (!this.gl) return;

    const gl = this.gl;

    // Bind render target
    if (pass.renderTarget === 'texture') {
      const fbo = this.framebuffers.get(pass.name);
      if (fbo) {
        gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
      }
    } else {
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }

    // Clear if needed
    if (pass.clearColor || pass.clearDepth || pass.clearStencil) {
      let clearBits = 0;

      if (pass.clearColor) {
        gl.clearColor(...(pass.clearColor || [0, 0, 0, 1]));
        clearBits |= gl.COLOR_BUFFER_BIT;
      }

      if (pass.clearDepth) {
        gl.clearDepth(1.0);
        clearBits |= gl.DEPTH_BUFFER_BIT;
      }

      if (pass.clearStencil) {
        gl.clearStencil(0);
        clearBits |= gl.STENCIL_BUFFER_BIT;
      }

      gl.clear(clearBits);
    }

    // Use appropriate shader
    this.renderer.useProgram(pass.shader);

    // Render visible objects
    for (const id of this.visibleObjects) {
      const object = this.objects.get(id);
      if (!object) continue;

      // Filter by pass type
      if (pass.name === 'particles' && object.type !== 'particle') continue;
      if (pass.name === 'main' && object.type === 'particle') continue;

      this.renderObject(object);
      this.metrics.drawCallsPerFrame++;
    }
  }

  /**
   * Render single object
   */
  private renderObject(object: SceneObject): void {
    if (object.type === 'organism' && object.userData) {
      // Convert to OrganismRenderData format
      const renderData: OrganismRenderData = {
        id: object.id,
        position: [object.position[0], object.position[1]],
        scale: object.scale[0],
        rotation: object.rotation[2], // Use Z rotation for 2D
        color: object.userData.color || [1, 1, 1],
        traits: object.userData.traits || {
          curiosity: 0.5,
          focus: 0.5,
          rhythm: 0.5,
          empathy: 0.5,
          creativity: 0.5
        },
        energy: object.userData.energy || 50,
        consciousness: object.userData.consciousness || 0.5,
        generation: object.userData.generation || 0
      };

      this.renderer.renderOrganism(renderData);

      // Estimate triangles (2 triangles per quad)
      this.metrics.trianglesRendered += 2;
    }
  }

  /**
   * Update performance metrics
   */
  private updateMetrics(frameTime: number): void {
    this.metrics.frameTime = frameTime;
    this.frameCount++;

    const now = performance.now();
    const deltaTime = now - this.fpsUpdateTime;

    // Update FPS every second
    if (deltaTime >= 1000) {
      this.metrics.fps = this.frameCount * 1000 / deltaTime;
      this.frameCount = 0;
      this.fpsUpdateTime = now;
    }
  }

  /**
   * Set camera properties
   */
  setCamera(updates: Partial<Camera>): void {
    Object.assign(this.camera, updates);
    this.updateCameraMatrices();
  }

  /**
   * Add light to scene
   */
  addLight(light: Light): void {
    this.lights.push(light);
  }

  /**
   * Remove all lights
   */
  clearLights(): void {
    this.lights = [];
  }

  /**
   * Enable/disable render pass
   */
  setRenderPassEnabled(name: string, enabled: boolean): void {
    const pass = this.renderPasses.find(p => p.name === name);
    if (pass) {
      pass.enabled = enabled;
    }
  }

  /**
   * Get performance metrics
   */
  getMetrics(): typeof this.metrics {
    return { ...this.metrics };
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<typeof this.config>): void {
    Object.assign(this.config, config);

    // Reinitialize if shadow settings changed
    if ('enableShadows' in config || 'shadowMapSize' in config) {
      this.initializeFramebuffers();
    }
  }

  /**
   * Resize handler
   */
  resize(width: number, height: number): void {
    this.camera.aspect = width / height;
    this.updateCameraMatrices();

    // Recreate framebuffers with new size
    this.initializeFramebuffers();
  }

  /**
   * Cleanup resources
   */
  dispose(): void {
    if (!this.gl) return;

    // Clear objects
    this.objects.clear();
    this.visibleObjects.clear();

    // Delete framebuffers
    for (const fbo of this.framebuffers.values()) {
      this.gl.deleteFramebuffer(fbo);
    }
    this.framebuffers.clear();

    // Delete textures
    for (const texture of this.renderTextures.values()) {
      this.gl.deleteTexture(texture);
    }
    this.renderTextures.clear();

    // Clear pools
    this.matrixPool.available = [];
    this.matrixPool.inUse.clear();
    this.vectorPool.available = [];
    this.vectorPool.inUse.clear();

    logger.info('WebGL Scene Manager disposed');
  }
}

export default WebGLSceneManager;