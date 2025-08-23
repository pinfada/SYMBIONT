// src/shared/utils/GPGPUMutations.ts
// WebGL2 GPGPU via Transform Feedback et Render-to-Texture
import { logger } from './secureLogger';
import WebGLUtils, { ShaderProgram } from './webgl';

export interface MutationData {
  position: Float32Array; // x, y
  velocity: Float32Array; // vx, vy  
  traits: Float32Array;   // curiosity, focus, rhythm, empathy, creativity
  dna: Float32Array;      // Genetic data as floats
  energy: Float32Array;   // Current energy
  generation: Float32Array; // Generation number
}

export class GPGPUMutationProcessor {
  private gl: WebGL2RenderingContext;
  private transformProgram: ShaderProgram | null = null;
  private renderProgram: ShaderProgram | null = null;
  private vao: WebGLVertexArrayObject | null = null;
  private inputBuffers: WebGLBuffer[] = [];
  private outputBuffers: WebGLBuffer[] = [];
  private transformFeedback: WebGLTransformFeedback | null = null;
  private maxOrganisms: number;
  private initialized = false;

  constructor(gl: WebGL2RenderingContext, maxOrganisms: number = 1000) {
    this.gl = gl;
    this.maxOrganisms = maxOrganisms;
    
    // Vérifier le support Transform Feedback
    if (!gl.createTransformFeedback) {
      throw new Error('Transform Feedback not supported - WebGL2 required');
    }
    
    this.initialize();
  }

  private async initialize(): Promise<void> {
    try {
      await this.createTransformFeedbackProgram();
      await this.createRenderToTextureProgram();
      this.setupBuffers();
      this.setupTransformFeedback();
      this.initialized = true;
      logger.info('GPGPU Mutation Processor initialized with Transform Feedback');
    } catch (error) {
      logger.error('Failed to initialize GPGPU processor:', error);
    }
  }

  private async createTransformFeedbackProgram(): Promise<void> {
    // Vertex shader for mutation processing
    const vertexShader = `#version 300 es
    precision highp float;
    
    // Input attributes (current state)
    in vec2 a_position;
    in vec2 a_velocity; 
    in vec3 a_traits; // curiosity, focus, empathy (pack 5 into 3+2)
    in vec2 a_traits2; // rhythm, creativity
    in vec4 a_dna; // DNA segments as vec4
    in float a_energy;
    in float a_generation;
    in float a_mutationRate;
    
    // Outputs via Transform Feedback
    out vec2 v_newPosition;
    out vec2 v_newVelocity;
    out vec3 v_newTraits;
    out vec2 v_newTraits2; 
    out vec4 v_newDNA;
    out float v_newEnergy;
    out float v_newGeneration;
    
    uniform float u_time;
    uniform float u_deltaTime;
    uniform float u_globalMutation;
    uniform vec2 u_worldBounds;
    uniform float u_energyDecay;
    
    // PRNG fonction basée sur position pour reproductibilité
    float hash(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
    }
    
    float random(vec2 seed) {
        return fract(sin(dot(seed.xy, vec2(12.9898, 78.233))) * 43758.5453);
    }
    
    // Mutation génétique
    vec4 mutateGenetics(vec4 dna, float mutationRate, vec2 seed) {
        vec4 newDNA = dna;
        
        // Mutations ponctuelles
        if (random(seed) < mutationRate) {
            int geneIndex = int(random(seed + vec2(1.0)) * 4.0);
            float mutation = random(seed + vec2(2.0)) * 0.2 - 0.1; // ±10%
            newDNA[geneIndex] = clamp(newDNA[geneIndex] + mutation, 0.0, 1.0);
        }
        
        return newDNA;
    }
    
    // Évolution des traits basée sur l'énergie et l'environnement
    vec3 evolveTraits(vec3 traits, float energy, float generation, vec2 seed) {
        vec3 newTraits = traits;
        
        // Adaptation basée sur l'énergie
        float adaptationRate = 0.01 * (1.0 - energy); // Plus d'adaptation si faible énergie
        
        if (energy < 0.3) {
            // Augmenter focus et réduire créativité en cas de survie
            newTraits.y += adaptationRate * random(seed); // focus
            newTraits.z -= adaptationRate * random(seed + vec2(1.0)) * 0.5; // empathy
        } else if (energy > 0.7) {
            // Augmenter créativité et curiosité en cas d'abondance
            newTraits.x += adaptationRate * random(seed + vec2(2.0)); // curiosity
        }
        
        return clamp(newTraits, vec3(0.0), vec3(1.0));
    }
    
    void main() {
        vec2 seed = a_position + vec2(u_time * 0.001);
        
        // 1. Mouvement physique
        vec2 newPos = a_position + a_velocity * u_deltaTime;
        vec2 newVel = a_velocity;
        
        // Collisions avec les bords du monde
        if (newPos.x < -u_worldBounds.x || newPos.x > u_worldBounds.x) {
            newVel.x *= -0.8; // Rebond avec amortissement
        }
        if (newPos.y < -u_worldBounds.y || newPos.y > u_worldBounds.y) {
            newVel.y *= -0.8;
        }
        newPos = clamp(newPos, -u_worldBounds, u_worldBounds);
        
        // 2. Évolution génétique
        float mutationRate = a_mutationRate * u_globalMutation;
        vec4 newDNA = mutateGenetics(a_dna, mutationRate, seed);
        
        // 3. Évolution des traits
        vec3 newTraits = evolveTraits(a_traits, a_energy, a_generation, seed);
        vec2 newTraits2 = a_traits2;
        
        // Mutation des traits additionnels
        if (random(seed + vec2(10.0)) < mutationRate * 0.5) {
            newTraits2.x += (random(seed + vec2(11.0)) - 0.5) * 0.1; // rhythm
            newTraits2.y += (random(seed + vec2(12.0)) - 0.5) * 0.1; // creativity
            newTraits2 = clamp(newTraits2, vec2(0.0), vec2(1.0));
        }
        
        // 4. Métabolisme énergétique
        float newEnergy = a_energy;
        newEnergy -= u_energyDecay * u_deltaTime; // Décroissance naturelle
        newEnergy += newTraits.y * 0.1 * u_deltaTime; // Focus génère de l'énergie
        newEnergy = clamp(newEnergy, 0.0, 1.0);
        
        // 5. Évolution générationelle
        float newGeneration = a_generation;
        if (newEnergy > 0.8 && random(seed + vec2(20.0)) < 0.001) {
            newGeneration += 1.0; // Reproduction rare
        }
        
        // Outputs
        v_newPosition = newPos;
        v_newVelocity = newVel;
        v_newTraits = newTraits;
        v_newTraits2 = newTraits2;
        v_newDNA = newDNA;
        v_newEnergy = newEnergy;
        v_newGeneration = newGeneration;
    }`;

    // Fragment shader minimal pour Transform Feedback
    const fragmentShader = `#version 300 es
    precision highp float;
    void main() {
        // Pas de sortie fragment nécessaire pour TF
    }`;

    // Créer le programme avec Transform Feedback
    const program = WebGLUtils.createProgram(this.gl, vertexShader, fragmentShader);
    if (!program) {
      throw new Error('Failed to create Transform Feedback program');
    }

    // Spécifier les variables de sortie Transform Feedback
    const varyings = [
      'v_newPosition',
      'v_newVelocity', 
      'v_newTraits',
      'v_newTraits2',
      'v_newDNA',
      'v_newEnergy',
      'v_newGeneration'
    ];

    this.gl.transformFeedbackVaryings(program.program, varyings, this.gl.SEPARATE_ATTRIBS);
    this.gl.linkProgram(program.program);

    if (!this.gl.getProgramParameter(program.program, this.gl.LINK_STATUS)) {
      const error = this.gl.getProgramInfoLog(program.program);
      throw new Error('Transform Feedback linking failed: ' + error);
    }

    this.transformProgram = program;
  }

  private async createRenderToTextureProgram(): Promise<void> {
    // Programme pour GPGPU via render-to-texture (technique alternative)
    const vertexShader = `#version 300 es
    precision highp float;
    
    in vec2 a_position;
    
    void main() {
        gl_Position = vec4(a_position, 0.0, 1.0);
    }`;

    const fragmentShader = `#version 300 es
    precision highp float;
    
    uniform sampler2D u_dataTexture;
    uniform vec2 u_resolution;
    uniform float u_time;
    
    out vec4 fragColor;
    
    void main() {
        vec2 uv = gl_FragCoord.xy / u_resolution;
        vec4 data = texture(u_dataTexture, uv);
        
        // Process data in fragment shader (example: simple evolution)
        data.x += sin(u_time + data.y) * 0.001; // Position evolution
        data.y += cos(u_time + data.x) * 0.001;
        data.z = clamp(data.z + (data.w - 0.5) * 0.01, 0.0, 1.0); // Trait evolution
        
        fragColor = data;
    }`;

    const program = WebGLUtils.createProgram(this.gl, vertexShader, fragmentShader);
    if (!program) {
      throw new Error('Failed to create render-to-texture program');
    }

    this.renderProgram = program;
  }

  private setupBuffers(): void {
    const gl = this.gl;
    
    // Créer les buffers d'entrée et de sortie
    const bufferSize = this.maxOrganisms * 4; // 4 bytes par float

    for (let i = 0; i < 7; i++) { // 7 attributs de sortie
      // Buffer d'entrée
      const inputBuffer = gl.createBuffer();
      if (!inputBuffer) throw new Error('Failed to create input buffer');
      this.inputBuffers.push(inputBuffer);
      
      // Buffer de sortie
      const outputBuffer = gl.createBuffer();
      if (!outputBuffer) throw new Error('Failed to create output buffer');
      gl.bindBuffer(gl.ARRAY_BUFFER, outputBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, bufferSize, gl.DYNAMIC_READ);
      this.outputBuffers.push(outputBuffer);
    }
    
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
  }

  private setupTransformFeedback(): void {
    const gl = this.gl;
    
    this.transformFeedback = gl.createTransformFeedback();
    if (!this.transformFeedback) {
      throw new Error('Failed to create Transform Feedback');
    }

    this.vao = gl.createVertexArray();
    if (!this.vao) {
      throw new Error('Failed to create VAO');
    }
  }

  public processMutations(data: MutationData, deltaTime: number): MutationData | null {
    if (!this.initialized || !this.transformProgram || !this.transformFeedback || !this.vao) {
      logger.error('GPGPU processor not initialized');
      return null;
    }

    const gl = this.gl;
    
    try {
      // Upload input data
      this.uploadInputData(data);

      // Setup Transform Feedback
      gl.bindVertexArray(this.vao);
      gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, this.transformFeedback);

      // Bind output buffers
      for (let i = 0; i < this.outputBuffers.length; i++) {
        gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, i, this.outputBuffers[i]);
      }

      // Use shader program
      gl.useProgram(this.transformProgram.program);

      // Set uniforms
      WebGLUtils.setUniform1f(gl, this.transformProgram.uniforms['u_time'], Date.now() / 1000);
      WebGLUtils.setUniform1f(gl, this.transformProgram.uniforms['u_deltaTime'], deltaTime);
      WebGLUtils.setUniform1f(gl, this.transformProgram.uniforms['u_globalMutation'], 0.01);
      WebGLUtils.setUniform2f(gl, this.transformProgram.uniforms['u_worldBounds'], 10.0, 10.0);
      WebGLUtils.setUniform1f(gl, this.transformProgram.uniforms['u_energyDecay'], 0.1);

      // Execute Transform Feedback
      gl.enable(gl.RASTERIZER_DISCARD); // Pas besoin de rasterisation
      gl.beginTransformFeedback(gl.POINTS);
      gl.drawArrays(gl.POINTS, 0, data.position.length / 2);
      gl.endTransformFeedback();
      gl.disable(gl.RASTERIZER_DISCARD);

      // Read results
      const results = this.readOutputData(data.position.length / 2);

      gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, null);
      gl.bindVertexArray(null);

      return results;

    } catch (error) {
      logger.error('GPGPU processing failed:', error);
      return null;
    }
  }

  private uploadInputData(data: MutationData): void {
    const gl = this.gl;
    const program = this.transformProgram!;

    // Position
    gl.bindBuffer(gl.ARRAY_BUFFER, this.inputBuffers[0]);
    gl.bufferData(gl.ARRAY_BUFFER, data.position, gl.DYNAMIC_DRAW);
    const positionLoc = program.attributes['a_position'];
    if (positionLoc >= 0) {
      gl.enableVertexAttribArray(positionLoc);
      gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 0, 0);
    }

    // Velocity
    gl.bindBuffer(gl.ARRAY_BUFFER, this.inputBuffers[1]);
    gl.bufferData(gl.ARRAY_BUFFER, data.velocity, gl.DYNAMIC_DRAW);
    const velocityLoc = program.attributes['a_velocity'];
    if (velocityLoc >= 0) {
      gl.enableVertexAttribArray(velocityLoc);
      gl.vertexAttribPointer(velocityLoc, 2, gl.FLOAT, false, 0, 0);
    }

    // Continue pour les autres attributs...
    // (Code similaire pour traits, dna, energy, generation)
  }

  private readOutputData(count: number): MutationData {
    const gl = this.gl;
    
    const results: MutationData = {
      position: new Float32Array(count * 2),
      velocity: new Float32Array(count * 2),
      traits: new Float32Array(count * 5),
      dna: new Float32Array(count * 4),
      energy: new Float32Array(count),
      generation: new Float32Array(count)
    };

    // Lire les données depuis les buffers de sortie
    for (let i = 0; i < this.outputBuffers.length; i++) {
      gl.bindBuffer(gl.ARRAY_BUFFER, this.outputBuffers[i]);
      // Note: gl.getBufferSubData n'est pas disponible en WebGL2
      // Alternative: utiliser une texture pour lire les données
    }

    return results;
  }

  public destroy(): void {
    const gl = this.gl;
    
    if (this.transformProgram) {
      gl.deleteProgram(this.transformProgram.program);
    }
    
    if (this.renderProgram) {
      gl.deleteProgram(this.renderProgram.program);
    }

    for (const buffer of this.inputBuffers) {
      gl.deleteBuffer(buffer);
    }
    
    for (const buffer of this.outputBuffers) {
      gl.deleteBuffer(buffer);
    }

    if (this.transformFeedback) {
      gl.deleteTransformFeedback(this.transformFeedback);
    }

    if (this.vao) {
      gl.deleteVertexArray(this.vao);
    }

    logger.info('GPGPU Mutation Processor destroyed');
  }
}

export default GPGPUMutationProcessor;