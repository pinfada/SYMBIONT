// src/background/services/WebGLParticleSystem.ts
// Système de particules GPU avec instancing et Transform Feedback
// Optimisé pour des milliers de particules avec physique temps réel

import { logger } from '@/shared/utils/secureLogger';
import { SecureRandom } from '@/shared/utils/secureRandom';

export interface ParticleEmitter {
  id: string;
  position: [number, number, number];
  direction: [number, number, number];
  spread: number; // Angle de dispersion en radians
  rate: number; // Particules par seconde
  lifetime: number; // Durée de vie en secondes
  speed: number;
  speedVariance: number;
  size: number;
  sizeVariance: number;
  color: [number, number, number, number];
  colorVariance: [number, number, number, number];
  gravity: [number, number, number];
  texture?: string;
  blendMode: 'additive' | 'normal' | 'multiply';
  enabled: boolean;
}

export interface ParticleData {
  position: Float32Array; // x, y, z
  velocity: Float32Array; // vx, vy, vz
  color: Float32Array; // r, g, b, a
  size: Float32Array; // size
  lifetime: Float32Array; // current lifetime
  maxLifetime: Float32Array; // max lifetime
}

export interface ParticleSystemConfig {
  maxParticles: number;
  useInstancing: boolean;
  useTransformFeedback: boolean;
  sortParticles: boolean;
  enableCollisions: boolean;
  worldBounds: {
    min: [number, number, number];
    max: [number, number, number];
  };
}

export class WebGLParticleSystem {
  private gl: WebGL2RenderingContext | WebGLRenderingContext;
  private isWebGL2: boolean;
  private config: ParticleSystemConfig;

  // Particle data
  private particles: ParticleData;
  private activeParticles = 0;
  private particlePool: number[] = [];

  // Emitters
  private emitters: Map<string, ParticleEmitter> = new Map();
  private emitterTimers: Map<string, number> = new Map();

  // WebGL resources
  private vao: WebGLVertexArrayObject | null = null;
  private buffers: {
    position?: WebGLBuffer;
    velocity?: WebGLBuffer;
    color?: WebGLBuffer;
    size?: WebGLBuffer;
    lifetime?: WebGLBuffer;
    maxLifetime?: WebGLBuffer;
    indices?: WebGLBuffer;
  } = {};

  // Transform Feedback (WebGL2 only)
  private transformFeedback: WebGLTransformFeedback | null = null;
  private tfBuffers: WebGLBuffer[] = [];

  // Shaders
  private updateProgram: WebGLProgram | null = null;
  private renderProgram: WebGLProgram | null = null;

  // Textures
  private textures: Map<string, WebGLTexture> = new Map();

  // Performance metrics
  private metrics = {
    activeParticles: 0,
    particlesPerSecond: 0,
    updateTime: 0,
    renderTime: 0
  };

  constructor(
    gl: WebGL2RenderingContext | WebGLRenderingContext,
    config: Partial<ParticleSystemConfig> = {}
  ) {
    this.gl = gl;
    this.isWebGL2 = 'createTransformFeedback' in gl;

    this.config = {
      maxParticles: config.maxParticles || 10000,
      useInstancing: config.useInstancing !== false && this.isWebGL2,
      useTransformFeedback: config.useTransformFeedback !== false && this.isWebGL2,
      sortParticles: config.sortParticles || false,
      enableCollisions: config.enableCollisions || false,
      worldBounds: config.worldBounds || {
        min: [-100, -100, -100] as [number, number, number],
        max: [100, 100, 100] as [number, number, number]
      }
    };

    // Initialize particle data arrays
    this.particles = this.initializeParticleData();

    // Initialize particle pool
    for (let i = 0; i < this.config.maxParticles; i++) {
      this.particlePool.push(i);
    }

    this.initialize();
  }

  /**
   * Initialize particle data arrays
   */
  private initializeParticleData(): ParticleData {
    const count = this.config.maxParticles;

    return {
      position: new Float32Array(count * 3),
      velocity: new Float32Array(count * 3),
      color: new Float32Array(count * 4),
      size: new Float32Array(count),
      lifetime: new Float32Array(count),
      maxLifetime: new Float32Array(count)
    };
  }

  /**
   * Initialize WebGL resources
   */
  private async initialize(): Promise<void> {
    try {
      // Create shaders
      await this.createShaders();

      // Create buffers
      this.createBuffers();

      // Setup VAO if WebGL2
      if (this.isWebGL2) {
        this.setupVAO();
      }

      // Setup Transform Feedback if enabled
      if (this.config.useTransformFeedback && this.isWebGL2) {
        this.setupTransformFeedback();
      }

      logger.info('Particle system initialized', {
        maxParticles: this.config.maxParticles,
        webgl2: this.isWebGL2,
        instancing: this.config.useInstancing,
        transformFeedback: this.config.useTransformFeedback
      });

    } catch (error) {
      logger.error('Failed to initialize particle system:', error);
      throw error;
    }
  }

  /**
   * Create update and render shaders
   */
  private async createShaders(): Promise<void> {
    // Update shader (Transform Feedback for WebGL2)
    if (this.config.useTransformFeedback && this.isWebGL2) {
      const updateVS = `#version 300 es
        precision highp float;

        in vec3 a_position;
        in vec3 a_velocity;
        in vec4 a_color;
        in float a_size;
        in float a_lifetime;
        in float a_maxLifetime;

        out vec3 v_position;
        out vec3 v_velocity;
        out vec4 v_color;
        out float v_size;
        out float v_lifetime;
        out float v_maxLifetime;

        uniform float u_deltaTime;
        uniform vec3 u_gravity;
        uniform vec3 u_wind;
        uniform vec3 u_worldMin;
        uniform vec3 u_worldMax;

        void main() {
          // Update lifetime
          v_lifetime = a_lifetime - u_deltaTime;
          v_maxLifetime = a_maxLifetime;

          // Check if particle is alive
          if (v_lifetime <= 0.0) {
            // Reset particle (handled by CPU)
            v_position = a_position;
            v_velocity = vec3(0.0);
            v_color = vec4(0.0);
            v_size = 0.0;
          } else {
            // Apply physics
            vec3 acceleration = u_gravity + u_wind * 0.1;
            v_velocity = a_velocity + acceleration * u_deltaTime;

            // Apply damping
            v_velocity *= 0.99;

            // Update position
            v_position = a_position + v_velocity * u_deltaTime;

            // World bounds collision
            if (v_position.x < u_worldMin.x || v_position.x > u_worldMax.x) {
              v_velocity.x *= -0.8;
              v_position.x = clamp(v_position.x, u_worldMin.x, u_worldMax.x);
            }
            if (v_position.y < u_worldMin.y || v_position.y > u_worldMax.y) {
              v_velocity.y *= -0.8;
              v_position.y = clamp(v_position.y, u_worldMin.y, u_worldMax.y);
            }
            if (v_position.z < u_worldMin.z || v_position.z > u_worldMax.z) {
              v_velocity.z *= -0.8;
              v_position.z = clamp(v_position.z, u_worldMin.z, u_worldMax.z);
            }

            // Fade out based on lifetime
            float lifetimeRatio = v_lifetime / v_maxLifetime;
            v_color = a_color;
            v_color.a *= lifetimeRatio;

            // Size can grow or shrink over time
            v_size = a_size * (1.0 + (1.0 - lifetimeRatio) * 0.5);
          }
        }`;

      const updateFS = `#version 300 es
        precision highp float;
        void main() {
          // No fragment output needed for Transform Feedback
        }`;

      this.updateProgram = this.createProgram(updateVS, updateFS);

      if (this.updateProgram && this.isWebGL2) {
        const gl = this.gl as WebGL2RenderingContext;

        // Specify Transform Feedback varyings
        const varyings = [
          'v_position', 'v_velocity', 'v_color',
          'v_size', 'v_lifetime', 'v_maxLifetime'
        ];

        gl.transformFeedbackVaryings(
          this.updateProgram,
          varyings,
          gl.SEPARATE_ATTRIBS
        );

        // Re-link program after setting varyings
        gl.linkProgram(this.updateProgram);
      }
    }

    // Render shader
    const renderVS = this.isWebGL2 ? `#version 300 es
      precision highp float;

      in vec3 a_position;
      in vec4 a_color;
      in float a_size;

      uniform mat4 u_viewMatrix;
      uniform mat4 u_projectionMatrix;
      uniform vec3 u_cameraPosition;

      out vec4 v_color;
      out vec2 v_uv;
      out float v_distance;

      void main() {
        v_color = a_color;

        // Billboard vertices (quad corners)
        int vertexID = gl_VertexID % 4;
        vec2 corner = vec2(
          float(vertexID == 1 || vertexID == 2),
          float(vertexID == 2 || vertexID == 3)
        ) * 2.0 - 1.0;

        v_uv = corner * 0.5 + 0.5;

        // Calculate billboard position
        vec4 viewPos = u_viewMatrix * vec4(a_position, 1.0);
        viewPos.xy += corner * a_size;

        gl_Position = u_projectionMatrix * viewPos;

        // Distance for sorting
        v_distance = length(a_position - u_cameraPosition);
      }` : `
      precision highp float;

      attribute vec3 a_position;
      attribute vec4 a_color;
      attribute float a_size;
      attribute vec2 a_corner; // For WebGL1, need explicit corner attribute

      uniform mat4 u_viewMatrix;
      uniform mat4 u_projectionMatrix;
      uniform vec3 u_cameraPosition;

      varying vec4 v_color;
      varying vec2 v_uv;
      varying float v_distance;

      void main() {
        v_color = a_color;
        v_uv = a_corner * 0.5 + 0.5;

        // Calculate billboard position
        vec4 viewPos = u_viewMatrix * vec4(a_position, 1.0);
        viewPos.xy += a_corner * a_size;

        gl_Position = u_projectionMatrix * viewPos;

        // Distance for sorting
        v_distance = length(a_position - u_cameraPosition);
      }`;

    const renderFS = this.isWebGL2 ? `#version 300 es
      precision highp float;

      in vec4 v_color;
      in vec2 v_uv;
      in float v_distance;

      uniform sampler2D u_texture;
      uniform bool u_useTexture;

      out vec4 fragColor;

      void main() {
        // Soft circular particle
        float dist = length(v_uv - 0.5) * 2.0;
        float alpha = 1.0 - smoothstep(0.4, 1.0, dist);

        vec4 color = v_color;

        if (u_useTexture) {
          vec4 texColor = texture(u_texture, v_uv);
          color *= texColor;
        }

        color.a *= alpha;

        // Discard fully transparent pixels
        if (color.a < 0.01) discard;

        fragColor = color;
      }` : `
      precision highp float;

      varying vec4 v_color;
      varying vec2 v_uv;
      varying float v_distance;

      uniform sampler2D u_texture;
      uniform bool u_useTexture;

      void main() {
        // Soft circular particle
        float dist = length(v_uv - 0.5) * 2.0;
        float alpha = 1.0 - smoothstep(0.4, 1.0, dist);

        vec4 color = v_color;

        if (u_useTexture) {
          vec4 texColor = texture2D(u_texture, v_uv);
          color *= texColor;
        }

        color.a *= alpha;

        // Discard fully transparent pixels
        if (color.a < 0.01) discard;

        gl_FragColor = color;
      }`;

    this.renderProgram = this.createProgram(renderVS, renderFS);
  }

  /**
   * Create shader program
   */
  private createProgram(vertexSource: string, fragmentSource: string): WebGLProgram | null {
    const gl = this.gl;

    const vertexShader = this.compileShader(gl.VERTEX_SHADER, vertexSource);
    const fragmentShader = this.compileShader(gl.FRAGMENT_SHADER, fragmentSource);

    if (!vertexShader || !fragmentShader) return null;

    const program = gl.createProgram();
    if (!program) return null;

    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      logger.error('Shader link failed:', gl.getProgramInfoLog(program));
      gl.deleteProgram(program);
      return null;
    }

    // Clean up shaders
    gl.deleteShader(vertexShader);
    gl.deleteShader(fragmentShader);

    return program;
  }

  /**
   * Compile shader
   */
  private compileShader(type: number, source: string): WebGLShader | null {
    const gl = this.gl;
    const shader = gl.createShader(type);

    if (!shader) return null;

    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      logger.error('Shader compile failed:', gl.getShaderInfoLog(shader));
      gl.deleteShader(shader);
      return null;
    }

    return shader;
  }

  /**
   * Create WebGL buffers
   */
  private createBuffers(): void {
    const gl = this.gl;

    // Position buffer
    this.buffers.position = gl.createBuffer() || undefined;
    if (this.buffers.position) {
      gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.position);
      gl.bufferData(gl.ARRAY_BUFFER, this.particles.position, gl.DYNAMIC_DRAW);
    }

    // Velocity buffer
    this.buffers.velocity = gl.createBuffer() || undefined;
    if (this.buffers.velocity) {
      gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.velocity);
      gl.bufferData(gl.ARRAY_BUFFER, this.particles.velocity, gl.DYNAMIC_DRAW);
    }

    // Color buffer
    this.buffers.color = gl.createBuffer() || undefined;
    if (this.buffers.color) {
      gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.color);
      gl.bufferData(gl.ARRAY_BUFFER, this.particles.color, gl.DYNAMIC_DRAW);
    }

    // Size buffer
    this.buffers.size = gl.createBuffer() || undefined;
    if (this.buffers.size) {
      gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.size);
      gl.bufferData(gl.ARRAY_BUFFER, this.particles.size, gl.DYNAMIC_DRAW);
    }

    // Lifetime buffers
    this.buffers.lifetime = gl.createBuffer() || undefined;
    if (this.buffers.lifetime) {
      gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.lifetime);
      gl.bufferData(gl.ARRAY_BUFFER, this.particles.lifetime, gl.DYNAMIC_DRAW);
    }

    this.buffers.maxLifetime = gl.createBuffer() || undefined;
    if (this.buffers.maxLifetime) {
      gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.maxLifetime);
      gl.bufferData(gl.ARRAY_BUFFER, this.particles.maxLifetime, gl.DYNAMIC_DRAW);
    }

    // For WebGL1, create corner vertices for billboards
    if (!this.isWebGL2) {
      const corners = new Float32Array(this.config.maxParticles * 4 * 2);
      for (let i = 0; i < this.config.maxParticles; i++) {
        const offset = i * 8;
        // Bottom-left
        corners[offset + 0] = -1;
        corners[offset + 1] = -1;
        // Bottom-right
        corners[offset + 2] = 1;
        corners[offset + 3] = -1;
        // Top-right
        corners[offset + 4] = 1;
        corners[offset + 5] = 1;
        // Top-left
        corners[offset + 6] = -1;
        corners[offset + 7] = 1;
      }

      const cornerBuffer = gl.createBuffer();
      if (cornerBuffer) {
        gl.bindBuffer(gl.ARRAY_BUFFER, cornerBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, corners, gl.STATIC_DRAW);
      }
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, null);
  }

  /**
   * Setup VAO for WebGL2
   */
  private setupVAO(): void {
    if (!this.isWebGL2 || !this.renderProgram) return;

    const gl = this.gl as WebGL2RenderingContext;
    this.vao = gl.createVertexArray();

    if (!this.vao) return;

    gl.bindVertexArray(this.vao);

    // Setup attribute pointers
    const positionLoc = gl.getAttribLocation(this.renderProgram, 'a_position');
    if (positionLoc >= 0 && this.buffers.position) {
      gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.position);
      gl.enableVertexAttribArray(positionLoc);
      gl.vertexAttribPointer(positionLoc, 3, gl.FLOAT, false, 0, 0);
    }

    const colorLoc = gl.getAttribLocation(this.renderProgram, 'a_color');
    if (colorLoc >= 0 && this.buffers.color) {
      gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.color);
      gl.enableVertexAttribArray(colorLoc);
      gl.vertexAttribPointer(colorLoc, 4, gl.FLOAT, false, 0, 0);
    }

    const sizeLoc = gl.getAttribLocation(this.renderProgram, 'a_size');
    if (sizeLoc >= 0 && this.buffers.size) {
      gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.size);
      gl.enableVertexAttribArray(sizeLoc);
      gl.vertexAttribPointer(sizeLoc, 1, gl.FLOAT, false, 0, 0);
    }

    gl.bindVertexArray(null);
  }

  /**
   * Setup Transform Feedback for WebGL2
   */
  private setupTransformFeedback(): void {
    if (!this.isWebGL2 || !this.updateProgram) return;

    const gl = this.gl as WebGL2RenderingContext;
    this.transformFeedback = gl.createTransformFeedback();

    if (!this.transformFeedback) return;

    // Create output buffers for Transform Feedback
    const bufferSize = this.config.maxParticles * 4; // Size in bytes

    for (let i = 0; i < 6; i++) { // 6 outputs
      const buffer = gl.createBuffer();
      if (buffer) {
        gl.bindBuffer(gl.TRANSFORM_FEEDBACK_BUFFER, buffer);
        gl.bufferData(gl.TRANSFORM_FEEDBACK_BUFFER, bufferSize * 4, gl.DYNAMIC_COPY);
        this.tfBuffers.push(buffer);
      }
    }

    gl.bindBuffer(gl.TRANSFORM_FEEDBACK_BUFFER, null);
  }

  /**
   * Add particle emitter
   */
  addEmitter(emitter: ParticleEmitter): void {
    this.emitters.set(emitter.id, emitter);
    this.emitterTimers.set(emitter.id, 0);
  }

  /**
   * Remove particle emitter
   */
  removeEmitter(id: string): void {
    this.emitters.delete(id);
    this.emitterTimers.delete(id);
  }

  /**
   * Spawn particle
   */
  private spawnParticle(emitter: ParticleEmitter): void {
    if (this.particlePool.length === 0) return;

    const index = this.particlePool.pop()!;
    const offset3 = index * 3;
    const offset4 = index * 4;

    // Position with variance
    this.particles.position[offset3] = emitter.position[0] + (SecureRandom.random() - 0.5) * 0.1;
    this.particles.position[offset3 + 1] = emitter.position[1] + (SecureRandom.random() - 0.5) * 0.1;
    this.particles.position[offset3 + 2] = emitter.position[2] + (SecureRandom.random() - 0.5) * 0.1;

    // Velocity with spread
    const spread = SecureRandom.random() * emitter.spread - emitter.spread / 2;
    const speed = emitter.speed + (SecureRandom.random() - 0.5) * emitter.speedVariance;

    this.particles.velocity[offset3] = emitter.direction[0] * speed + SecureRandom.random() * spread;
    this.particles.velocity[offset3 + 1] = emitter.direction[1] * speed + SecureRandom.random() * spread;
    this.particles.velocity[offset3 + 2] = emitter.direction[2] * speed + SecureRandom.random() * spread;

    // Color with variance
    this.particles.color[offset4] = Math.min(1, Math.max(0,
      emitter.color[0] + (SecureRandom.random() - 0.5) * emitter.colorVariance[0]));
    this.particles.color[offset4 + 1] = Math.min(1, Math.max(0,
      emitter.color[1] + (SecureRandom.random() - 0.5) * emitter.colorVariance[1]));
    this.particles.color[offset4 + 2] = Math.min(1, Math.max(0,
      emitter.color[2] + (SecureRandom.random() - 0.5) * emitter.colorVariance[2]));
    this.particles.color[offset4 + 3] = Math.min(1, Math.max(0,
      emitter.color[3] + (SecureRandom.random() - 0.5) * emitter.colorVariance[3]));

    // Size with variance
    this.particles.size[index] = Math.max(0.01,
      emitter.size + (SecureRandom.random() - 0.5) * emitter.sizeVariance);

    // Lifetime
    this.particles.lifetime[index] = emitter.lifetime;
    this.particles.maxLifetime[index] = emitter.lifetime;

    this.activeParticles++;
  }

  /**
   * Update particles
   */
  update(deltaTime: number): void {
    const startTime = performance.now();

    // Update emitters
    for (const [id, emitter] of this.emitters) {
      if (!emitter.enabled) continue;

      let timer = this.emitterTimers.get(id) || 0;
      timer += deltaTime;

      const particlesPerEmit = 1.0 / emitter.rate;
      while (timer >= particlesPerEmit) {
        this.spawnParticle(emitter);
        timer -= particlesPerEmit;
      }

      this.emitterTimers.set(id, timer);
    }

    // Update particles with Transform Feedback or CPU
    if (this.config.useTransformFeedback && this.isWebGL2) {
      this.updateWithTransformFeedback(deltaTime);
    } else {
      this.updateOnCPU(deltaTime);
    }

    // Sort particles if enabled
    if (this.config.sortParticles) {
      this.sortParticles();
    }

    // Update metrics
    this.metrics.activeParticles = this.activeParticles;
    this.metrics.updateTime = performance.now() - startTime;
  }

  /**
   * Update particles with Transform Feedback
   */
  private updateWithTransformFeedback(deltaTime: number): void {
    if (!this.isWebGL2 || !this.updateProgram || !this.transformFeedback) return;

    const gl = this.gl as WebGL2RenderingContext;

    // Use update program
    gl.useProgram(this.updateProgram);

    // Set uniforms
    const uniforms = {
      u_deltaTime: deltaTime,
      u_gravity: [0, -9.81, 0],
      u_wind: [0, 0, 0],
      u_worldMin: this.config.worldBounds.min,
      u_worldMax: this.config.worldBounds.max
    };

    // Set uniform values
    Object.entries(uniforms).forEach(([name, value]) => {
      const location = gl.getUniformLocation(this.updateProgram!, name);
      if (location) {
        if (Array.isArray(value)) {
          gl.uniform3fv(location, value);
        } else {
          gl.uniform1f(location, value);
        }
      }
    });

    // Bind Transform Feedback
    gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, this.transformFeedback);

    // Bind output buffers
    for (let i = 0; i < this.tfBuffers.length; i++) {
      gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, i, this.tfBuffers[i]);
    }

    // Disable rasterization
    gl.enable(gl.RASTERIZER_DISCARD);

    // Run Transform Feedback
    gl.beginTransformFeedback(gl.POINTS);
    gl.drawArrays(gl.POINTS, 0, this.activeParticles);
    gl.endTransformFeedback();

    // Re-enable rasterization
    gl.disable(gl.RASTERIZER_DISCARD);

    // Unbind Transform Feedback
    gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, null);

    // Swap buffers
    this.swapTransformFeedbackBuffers();
  }

  /**
   * Update particles on CPU
   */
  private updateOnCPU(deltaTime: number): void {
    const gravity = [0, -9.81, 0];
    const worldMin = this.config.worldBounds.min;
    const worldMax = this.config.worldBounds.max;

    // Update each active particle
    const particlesToRemove: number[] = [];

    for (let i = 0; i < this.config.maxParticles; i++) {
      if (this.particles.lifetime[i] <= 0) continue;

      // Update lifetime
      this.particles.lifetime[i] -= deltaTime;

      if (this.particles.lifetime[i] <= 0) {
        particlesToRemove.push(i);
        continue;
      }

      const offset3 = i * 3;
      const offset4 = i * 4;

      // Apply gravity
      this.particles.velocity[offset3 + 1] += gravity[1] * deltaTime;

      // Apply damping
      this.particles.velocity[offset3] *= 0.99;
      this.particles.velocity[offset3 + 1] *= 0.99;
      this.particles.velocity[offset3 + 2] *= 0.99;

      // Update position
      this.particles.position[offset3] += this.particles.velocity[offset3] * deltaTime;
      this.particles.position[offset3 + 1] += this.particles.velocity[offset3 + 1] * deltaTime;
      this.particles.position[offset3 + 2] += this.particles.velocity[offset3 + 2] * deltaTime;

      // World bounds collision
      if (this.config.enableCollisions) {
        for (let j = 0; j < 3; j++) {
          if (this.particles.position[offset3 + j] < worldMin[j]) {
            this.particles.position[offset3 + j] = worldMin[j];
            this.particles.velocity[offset3 + j] *= -0.8;
          } else if (this.particles.position[offset3 + j] > worldMax[j]) {
            this.particles.position[offset3 + j] = worldMax[j];
            this.particles.velocity[offset3 + j] *= -0.8;
          }
        }
      }

      // Update alpha based on lifetime
      const lifetimeRatio = this.particles.lifetime[i] / this.particles.maxLifetime[i];
      this.particles.color[offset4 + 3] *= lifetimeRatio;
    }

    // Return dead particles to pool
    for (const index of particlesToRemove) {
      this.particlePool.push(index);
      this.activeParticles--;
    }

    // Update buffers
    this.updateBuffers();
  }

  /**
   * Sort particles by distance (for transparency)
   */
  private sortParticles(): void {
    // TODO: Implement particle sorting based on camera distance
    // This requires camera position and can be expensive for many particles
  }

  /**
   * Swap Transform Feedback buffers
   */
  private swapTransformFeedbackBuffers(): void {
    // Swap input and output buffers for next frame
    // This avoids copying data
    const temp = this.buffers;
    this.buffers = {
      position: this.tfBuffers[0],
      velocity: this.tfBuffers[1],
      color: this.tfBuffers[2],
      size: this.tfBuffers[3],
      lifetime: this.tfBuffers[4],
      maxLifetime: this.tfBuffers[5]
    };

    // Store old buffers for next TF pass
    this.tfBuffers = [
      temp.position!,
      temp.velocity!,
      temp.color!,
      temp.size!,
      temp.lifetime!,
      temp.maxLifetime!
    ];
  }

  /**
   * Update GPU buffers with CPU data
   */
  private updateBuffers(): void {
    const gl = this.gl;

    if (this.buffers.position) {
      gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.position);
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.particles.position);
    }

    if (this.buffers.velocity) {
      gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.velocity);
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.particles.velocity);
    }

    if (this.buffers.color) {
      gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.color);
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.particles.color);
    }

    if (this.buffers.size) {
      gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.size);
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.particles.size);
    }

    if (this.buffers.lifetime) {
      gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.lifetime);
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.particles.lifetime);
    }
  }

  /**
   * Render particles
   */
  render(viewMatrix: Float32Array, projectionMatrix: Float32Array, cameraPosition: [number, number, number]): void {
    if (!this.renderProgram || this.activeParticles === 0) return;

    const startTime = performance.now();
    const gl = this.gl;

    // Use render program
    gl.useProgram(this.renderProgram);

    // Set uniforms
    const viewLoc = gl.getUniformLocation(this.renderProgram, 'u_viewMatrix');
    const projLoc = gl.getUniformLocation(this.renderProgram, 'u_projectionMatrix');
    const camPosLoc = gl.getUniformLocation(this.renderProgram, 'u_cameraPosition');

    if (viewLoc) gl.uniformMatrix4fv(viewLoc, false, viewMatrix);
    if (projLoc) gl.uniformMatrix4fv(projLoc, false, projectionMatrix);
    if (camPosLoc) gl.uniform3fv(camPosLoc, cameraPosition);

    // Enable blending for transparency
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    // Disable depth writing for transparent particles
    gl.depthMask(false);

    // Bind VAO or set attributes manually
    if (this.isWebGL2 && this.vao) {
      (gl as WebGL2RenderingContext).bindVertexArray(this.vao);
    } else {
      this.bindAttributes();
    }

    // Draw particles
    if (this.config.useInstancing && this.isWebGL2) {
      // Draw instanced quads
      (gl as WebGL2RenderingContext).drawArraysInstanced(
        gl.TRIANGLE_STRIP,
        0,
        4,
        this.activeParticles
      );
    } else {
      // Draw as points (less efficient but compatible)
      gl.drawArrays(gl.POINTS, 0, this.activeParticles);
    }

    // Restore depth writing
    gl.depthMask(true);

    // Update metrics
    this.metrics.renderTime = performance.now() - startTime;
  }

  /**
   * Bind attributes for WebGL1
   */
  private bindAttributes(): void {
    if (!this.renderProgram) return;

    const gl = this.gl;

    const positionLoc = gl.getAttribLocation(this.renderProgram, 'a_position');
    if (positionLoc >= 0 && this.buffers.position) {
      gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.position);
      gl.enableVertexAttribArray(positionLoc);
      gl.vertexAttribPointer(positionLoc, 3, gl.FLOAT, false, 0, 0);
    }

    const colorLoc = gl.getAttribLocation(this.renderProgram, 'a_color');
    if (colorLoc >= 0 && this.buffers.color) {
      gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.color);
      gl.enableVertexAttribArray(colorLoc);
      gl.vertexAttribPointer(colorLoc, 4, gl.FLOAT, false, 0, 0);
    }

    const sizeLoc = gl.getAttribLocation(this.renderProgram, 'a_size');
    if (sizeLoc >= 0 && this.buffers.size) {
      gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.size);
      gl.enableVertexAttribArray(sizeLoc);
      gl.vertexAttribPointer(sizeLoc, 1, gl.FLOAT, false, 0, 0);
    }
  }

  /**
   * Get performance metrics
   */
  getMetrics(): typeof this.metrics {
    return { ...this.metrics };
  }

  /**
   * Clear all particles
   */
  clear(): void {
    // Reset all particles
    this.particles.lifetime.fill(0);
    this.activeParticles = 0;

    // Reset pool
    this.particlePool = [];
    for (let i = 0; i < this.config.maxParticles; i++) {
      this.particlePool.push(i);
    }

    this.updateBuffers();
  }

  /**
   * Dispose resources
   */
  dispose(): void {
    const gl = this.gl;

    // Delete programs
    if (this.updateProgram) gl.deleteProgram(this.updateProgram);
    if (this.renderProgram) gl.deleteProgram(this.renderProgram);

    // Delete buffers
    Object.values(this.buffers).forEach(buffer => {
      if (buffer) gl.deleteBuffer(buffer);
    });

    // Delete Transform Feedback buffers
    this.tfBuffers.forEach(buffer => gl.deleteBuffer(buffer));

    // Delete VAO
    if (this.isWebGL2 && this.vao) {
      (gl as WebGL2RenderingContext).deleteVertexArray(this.vao);
    }

    // Delete Transform Feedback
    if (this.isWebGL2 && this.transformFeedback) {
      (gl as WebGL2RenderingContext).deleteTransformFeedback(this.transformFeedback);
    }

    // Delete textures
    this.textures.forEach(texture => gl.deleteTexture(texture));

    // Clear data
    this.emitters.clear();
    this.emitterTimers.clear();

    logger.info('Particle system disposed');
  }
}

export default WebGLParticleSystem;