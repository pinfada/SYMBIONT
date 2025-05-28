// src/generative/OrganismEngine.ts
// Moteur WebGL principal harmonisé
import { DNAInterpreter } from './DNAInterpreter';
import { MutationEngine } from './MutationEngine';
import { ProceduralGenerator } from './ProceduralGenerator';
import { PerformanceMonitor } from '../monitoring/PerformanceMonitor';
import {
  OrganismState,
  OrganismMutation,
  OrganismTraits,
  VisualProperties,
  Geometry
} from '@shared/types';

// Importer les shaders via raw-loader (Webpack)
const vertexShaderSource = '';
const fragmentShaderSource = '';

/**
 * OrganismEngine - Moteur WebGL pour le rendu de l'organisme
 */
export class OrganismEngine {
  private canvas: HTMLCanvasElement;
  private gl: WebGLRenderingContext | WebGL2RenderingContext;
  private program: WebGLProgram | null = null;
  private dnaInterpreter: DNAInterpreter;
  private mutationEngine: MutationEngine;
  private generator: ProceduralGenerator;
  private performanceMonitor: PerformanceMonitor;
  
  // Buffers
  private vertexBuffer: WebGLBuffer | null = null;
  private indexBuffer: WebGLBuffer | null = null;
  
  // État
  private frameCount = 0;
  private elapsedTime = 0;
  private geometry: Geometry;
  private traits: OrganismTraits;
  private visualProperties: VisualProperties;
  private currentState: OrganismState;
  private lastGeometryComplexity: number = 0;
  private fractalTexture: WebGLTexture | null = null;
  
  /**
   * Constructeur
   */
  constructor(canvas: HTMLCanvasElement, dna: string) {
    this.canvas = canvas;
    // Initialisation WebGL (WebGL2 si possible)
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    if (!gl) throw new Error('WebGL not supported');
    this.gl = gl;
    
    // Gestion du contexte perdu
    this.canvas.addEventListener('webglcontextlost', (e) => {
      e.preventDefault();
      this.cleanup();
    });
    
    // Initialisation des modules
    this.dnaInterpreter = new DNAInterpreter(dna);
    this.mutationEngine = new MutationEngine();
    this.generator = new ProceduralGenerator(this.dnaInterpreter.getCurrentParameters());
    this.performanceMonitor = new PerformanceMonitor(0.3);
    
    // Propriétés initiales
    this.traits = {
      curiosity: 0.5, focus: 0.5, rhythm: 0.5, empathy: 0.5,
      creativity: 0.5, energy: 0.5, harmony: 0.5, wisdom: 0.1
    };
    this.visualProperties = {
      primaryColor: { h: 200, s: 80, l: 60 },
      secondaryColor: { h: 340, s: 60, l: 40 }
    };
    this.currentState = {
      id: 'engine',
      generation: 1,
      health: 1,
      energy: 1,
      traits: this.traits,
      visualDNA: dna,
      lastMutation: Date.now(),
      mutations: [],
      createdAt: Date.now(),
      dna: dna,
      birthTime: Date.now(),
      socialConnections: [],
      memoryFragments: []
    };
    
    // Génération de la géométrie initiale
    this.geometry = this.generator.generateBaseForm(this.dnaInterpreter.getCurrentParameters());
    // Génération et upload de la texture fractale
    const fractal = this.generator.generateFractalPattern(Date.now());
    this.fractalTexture = this.createGLTexture(fractal);
    this.setupGL();
    this.setupShaders();
    this.setupBuffers();
  }
  
  /**
   * Configuration WebGL
   */
  private setupGL(): void {
    const gl = this.gl;
    
    // Configuration de base
    gl.clearColor(0, 0, 0, 0);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    
    // Configuration du viewport
    this.resizeCanvas();
    
    // Event listener pour redimensionnement
    window.addEventListener('resize', this.resizeCanvas.bind(this));
  }
  
  /**
   * Mise à jour du viewport canvas
   */
  private resizeCanvas(): void {
    // Ajustement pour la densité de pixels
    const devicePixelRatio = window.devicePixelRatio || 1;
    
    // Taille affichée
    const displayWidth = this.canvas.clientWidth;
    const displayHeight = this.canvas.clientHeight;
    
    // Vérifier si le redimensionnement est nécessaire
    if (this.canvas.width !== displayWidth * devicePixelRatio ||
        this.canvas.height !== displayHeight * devicePixelRatio) {
        
      // Ajuster le buffer canvas
      this.canvas.width = displayWidth * devicePixelRatio;
      this.canvas.height = displayHeight * devicePixelRatio;
      
      // Mettre à jour le viewport
      this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    }
  }
  
  /**
   * Préparation des buffers WebGL
   */
  private setupBuffers(): void {
    const gl = this.gl;
    
    // Vertex buffer
    this.vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, this.geometry.vertices, gl.STATIC_DRAW);
    
    // Index buffer
    this.indexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, this.geometry.indices, gl.STATIC_DRAW);
  }
  
  /**
   * Compilation et linkage des shaders
   */
  private setupShaders(): void {
    const gl = this.gl;
    const vert = this.compileShader(vertexShaderSource, gl.VERTEX_SHADER);
    const frag = this.compileShader(fragmentShaderSource, gl.FRAGMENT_SHADER);
    if (!vert || !frag) throw new Error('Shader compilation failed');
    this.program = gl.createProgram();
    if (!this.program) throw new Error('Program creation failed');
    gl.attachShader(this.program, vert);
    gl.attachShader(this.program, frag);
    gl.linkProgram(this.program);
    if (!gl.getProgramParameter(this.program, gl.LINK_STATUS)) {
      throw new Error('Shader program linking failed: ' + gl.getProgramInfoLog(this.program));
    }
    gl.deleteShader(vert);
    gl.deleteShader(frag);
  }
  
  private compileShader(source: string, type: number): WebGLShader | null {
    const gl = this.gl;
    const shader = gl.createShader(type);
    if (!shader) return null;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error('Shader compilation error:', gl.getShaderInfoLog(shader));
      gl.deleteShader(shader);
      return null;
    }
    return shader;
  }
  
  /**
   * Rendu principal
   */
  public render(state?: OrganismState): void {
    if (state) {
      this.currentState = state;
      // Adapter dynamiquement les paramètres selon les traits
      const traits = state.traits || this.traits;
      const params = this.dnaInterpreter.getCurrentParameters();
      // Influence des traits sur les paramètres visuels
      params.complexity = 0.3 + 0.7 * (traits.curiosity ?? 0.5); // curiosité → complexité
      params.patternDensity = 0.2 + 0.8 * (traits.creativity ?? 0.5); // créativité → densité
      params.colorVariance = 0.1 + 0.7 * (traits.creativity ?? 0.5); // créativité → variance chromatique
      params.symmetry = 0.2 + 0.7 * (traits.focus ?? 0.5); // focus → symétrie
      params.fluidity = 0.2 + 0.7 * (traits.energy ?? 0.5); // énergie → fluidité
      // Régénérer la géométrie si la complexité change beaucoup
      if (Math.abs(params.complexity - this.lastGeometryComplexity) > 0.2) {
        this.geometry = this.generator.generateBaseForm(params);
        this.setupBuffers();
        this.lastGeometryComplexity = params.complexity;
      }
    }
    this.performanceMonitor.startFrame();
    const gl = this.gl;
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    if (!this.program) return;
    gl.useProgram(this.program);
    this.setupAttributes();
    this.setupUniforms();
    gl.drawElements(gl.TRIANGLES, this.geometry.indices.length, gl.UNSIGNED_SHORT, 0);
    this.frameCount++;
    this.performanceMonitor.endFrame();
  }
  
  /**
   * Configuration des attributs du shader
   */
  private setupAttributes(): void {
    const gl = this.gl;
    if (!this.program) return;
    // a_position
    const posLoc = gl.getAttribLocation(this.program, 'a_position');
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 3, gl.FLOAT, false, 0, 0);
    // (ajouter a_texCoord si besoin)
    // Index buffer déjà bindé
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
  }
  
  /**
   * Configuration des uniforms du shader
   */
  private setupUniforms(): void {
    const gl = this.gl;
    if (!this.program) return;
    // Temps
    const timeLoc = gl.getUniformLocation(this.program, 'u_time');
    gl.uniform1f(timeLoc, this.frameCount * 0.016);
    // Paramètres DNA
    const params = this.dnaInterpreter.getCurrentParameters();
    gl.uniform3fv(gl.getUniformLocation(this.program, 'u_primaryColor'), params.primaryColor);
    gl.uniform3fv(gl.getUniformLocation(this.program, 'u_secondaryColor'), params.secondaryColor);
    gl.uniform1f(gl.getUniformLocation(this.program, 'u_complexity'), params.complexity);
    gl.uniform1f(gl.getUniformLocation(this.program, 'u_symmetry'), params.symmetry);
    gl.uniform1f(gl.getUniformLocation(this.program, 'u_fluidity'), params.fluidity);
    gl.uniform1f(gl.getUniformLocation(this.program, 'u_colorVariance'), params.colorVariance);
    gl.uniform1f(gl.getUniformLocation(this.program, 'u_patternDensity'), params.patternDensity);
    // Mutations
    this.mutationEngine.update(performance.now());
    const mutationState = this.mutationEngine.getCurrentState();
    gl.uniform1f(gl.getUniformLocation(this.program, 'u_mutation'), mutationState.colorShift || 0);
    // Texture fractale
    if (this.fractalTexture) {
      const fractalLoc = gl.getUniformLocation(this.program, 'u_fractalTex');
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, this.fractalTexture);
      gl.uniform1i(fractalLoc, 0);
    }
    // (ajouter d'autres uniforms selon le shader)
  }
  
  /**
   * Application d'une mutation
   */
  public mutate(mutation: OrganismMutation): void {
    // On ignore les mutations non visuelles pour le moteur WebGL
    if (!['visual', 'behavioral', 'cognitive'].includes(mutation.type)) {
      return;
    }
    this.mutationEngine.apply(mutation as any); // Cast sûr car on filtre ci-dessus
  }
  
  /**
   * Récupération des métriques de performance
   */
  public getPerformanceMetrics() {
    return this.performanceMonitor.getMetrics();
  }
  
  /**
   * Nettoyage mémoire et ressources
   */
  public cleanup(): void {
    const gl = this.gl;
    if (this.vertexBuffer) gl.deleteBuffer(this.vertexBuffer);
    if (this.indexBuffer) gl.deleteBuffer(this.indexBuffer);
    if (this.program) gl.deleteProgram(this.program);
    
    // Suppression des event listeners
    window.removeEventListener('resize', this.resizeCanvas.bind(this));
    
    console.log('OrganismEngine resources cleaned up');
  }
  
  /**
   * Indique si le moteur est prêt
   */
  public isInitialized(): boolean {
    return !!this.gl && !!this.program;
  }
  
  private createGLTexture(textureData: { data: Uint8Array; width: number; height: number }): WebGLTexture {
    const gl = this.gl;
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      textureData.width,
      textureData.height,
      0,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      textureData.data
    );
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
    gl.bindTexture(gl.TEXTURE_2D, null);
    return tex!;
  }
}