// src/generative/OrganismEngine.ts
// Moteur WebGL principal
import { ShaderProgram } from './ShaderProgram';
import { DNAInterpreter } from './DNAInterpreter';
import { MutationEngine } from './MutationEngine';
import { ProceduralGenerator } from './ProceduralGenerator';
import { PerformanceMonitor } from '../monitoring/PerformanceMonitor';
import { OrganismTraits, VisualProperties, OrganismMutation } from '../types/organism';

// Importer les shaders directement
import vertexShaderSource from '../shaders/organism.vert';
import fragmentShaderSource from '../shaders/organism.frag';

/**
 * OrganismEngine - Moteur WebGL pour le rendu de l'organisme
 */
export class OrganismEngine {
  private canvas: HTMLCanvasElement;
  private gl: WebGLRenderingContext | WebGL2RenderingContext;
  private shaderProgram: ShaderProgram;
  private dnaInterpreter: DNAInterpreter;
  private mutationEngine: MutationEngine;
  private generator: ProceduralGenerator;
  private performanceMonitor: PerformanceMonitor;
  
  // Propriétés de l'organisme
  private dna: string;
  private visualProperties: VisualProperties;
  private traits: OrganismTraits;
  
  // État de rendu
  private frameCount: number = 0;
  private elapsedTime: number = 0;
  private vertices: Float32Array;
  private indices: Uint16Array;
  private vertexBuffer: WebGLBuffer | null = null;
  private indexBuffer: WebGLBuffer | null = null;
  
  // Animation
  private animationParams = {
    rotation: 0,
    scale: 1.0,
    pulsePhase: 0,
    noiseOffset: 0
  };
  
  /**
   * Constructeur
   */
  constructor(canvas: HTMLCanvasElement, dna: string) {
    this.canvas = canvas;
    this.dna = dna;
    
    // Initialisation WebGL
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    if (!gl) {
      throw new Error('WebGL not supported');
    }
    this.gl = gl;
    
    // Configuration WebGL
    this.setupGL();
    
    // Création des moteurs spécialisés
    this.dnaInterpreter = new DNAInterpreter();
    this.mutationEngine = new MutationEngine();
    this.generator = new ProceduralGenerator(dna);
    this.performanceMonitor = new PerformanceMonitor(gl);
    
    // Initialisation des shaders
    this.shaderProgram = new ShaderProgram(gl, vertexShaderSource, fragmentShaderSource);
    
    // Création de la géométrie initiale
    const initialGeometry = this.generator.generateBaseForm();
    this.vertices = initialGeometry.vertices;
    this.indices = initialGeometry.indices;
    
    // Préparation des buffers
    this.setupBuffers();
    
    // Propriétés par défaut
    this.visualProperties = this.dnaInterpreter.extractVisualProperties(dna);
    this.traits = {
      curiosity: 0.5,
      focus: 0.5,
      rhythm: 0.5,
      empathy: 0.5,
      creativity: 0.5,
      energy: 0.5,
      harmony: 0.5,
      wisdom: 0.1
    };
  }
  
  /**
   * Configuration WebGL
   */
  private setupGL(): void {
    const gl = this.gl;
    
    // Configuration de base
    gl.clearColor(0.0, 0.0, 0.0, 0.0);
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
    gl.bufferData(gl.ARRAY_BUFFER, this.vertices, gl.DYNAMIC_DRAW);
    
    // Index buffer
    this.indexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, this.indices, gl.STATIC_DRAW);
  }
  
  /**
   * Met à jour l'état de l'organisme
   */
  public update(deltaTime: number): void {
    // Conversion en secondes
    const dt = deltaTime / 1000;
    this.elapsedTime += dt;
    
    // Mise à jour des animations
    this.updateAnimationParameters(dt);
    
    // Application des mutations en cours
    this.mutationEngine.update(dt);
    
    // Monitoring performance
    this.performanceMonitor.measure();
  }
  
  /**
   * Mise à jour des paramètres d'animation
   */
  private updateAnimationParameters(deltaTime: number): void {
    // Rotation basée sur traits rhythm et energy
    const rotationSpeed = 0.2 * this.traits.rhythm + 0.1 * this.traits.energy;
    this.animationParams.rotation += rotationSpeed * deltaTime;
    
    // Pulsation basée sur traits empathy
    const pulseFrequency = 0.5 + this.traits.empathy * 2;
    this.animationParams.pulsePhase += pulseFrequency * deltaTime;
    const pulseAmplitude = 0.05 * this.traits.empathy;
    this.animationParams.scale = 1.0 + Math.sin(this.animationParams.pulsePhase) * pulseAmplitude;
    
    // Déplacement noise basé sur creativity
    const noiseSpeed = 0.1 + this.traits.creativity * 0.5;
    this.animationParams.noiseOffset += noiseSpeed * deltaTime;
  }
  
  /**
   * Effectue le rendu de l'organisme
   */
  public render(): void {
    this.performanceMonitor.startFrame();
    
    const gl = this.gl;
    
    // Clear buffers
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    
    // Activation du shader
    this.shaderProgram.use();
    
    // Configuration des attributs
    this.setupAttributes();
    
    // Configuration des uniforms
    this.setupUniforms();
    
    // Rendu de la géométrie
    gl.drawElements(gl.TRIANGLES, this.indices.length, gl.UNSIGNED_SHORT, 0);
    
    // Compteur de frames
    this.frameCount++;
    
    this.performanceMonitor.endFrame();
  }
  
  /**
   * Configuration des attributs du shader
   */
  private setupAttributes(): void {
    const gl = this.gl;
    
    // Position
    const positionAttributeLocation = this.shaderProgram.getAttribLocation('a_position');
    gl.enableVertexAttribArray(positionAttributeLocation);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
    gl.vertexAttribPointer(
      positionAttributeLocation,
      3,         // 3 composantes (x, y, z)
      gl.FLOAT,  // type
      false,     // normalisation
      5 * 4,     // stride (5 floats par vertex)
      0          // offset
    );
    
    // Texture coordinates
    const texCoordAttributeLocation = this.shaderProgram.getAttribLocation('a_texCoord');
    gl.enableVertexAttribArray(texCoordAttributeLocation);
    gl.vertexAttribPointer(
      texCoordAttributeLocation,
      2,         // 2 composantes (u, v)
      gl.FLOAT,  // type
      false,     // normalisation
      5 * 4,     // stride
      3 * 4      // offset (après xyz)
    );
    
    // Indices
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
  }
  
  /**
   * Configuration des uniforms du shader
   */
  private setupUniforms(): void {
    // Variables pour animation/rendu
    this.shaderProgram.setUniform1f('u_time', this.elapsedTime);
    this.shaderProgram.setUniform1f('u_rotation', this.animationParams.rotation);
    this.shaderProgram.setUniform1f('u_scale', this.animationParams.scale);
    this.shaderProgram.setUniform1f('u_noiseOffset', this.animationParams.noiseOffset);
    
    // Propriétés visuelles
    const primaryColor = this.visualProperties.primaryColor;
    const secondaryColor = this.visualProperties.secondaryColor;
    
    this.shaderProgram.setUniform3f(
      'u_primaryColor',
      primaryColor.h / 360, // Normalisation 0-1
      primaryColor.s / 100,
      primaryColor.l / 100
    );
    
    this.shaderProgram.setUniform3f(
      'u_secondaryColor',
      secondaryColor.h / 360,
      secondaryColor.s / 100,
      secondaryColor.l / 100
    );
    
    // Propriétés basées sur traits
    this.shaderProgram.setUniform1f('u_complexity', this.traits.creativity);
    this.shaderProgram.setUniform1f('u_energy', this.traits.energy);
    this.shaderProgram.setUniform1f('u_harmony', this.traits.harmony);
    
    // Aspect ratio pour corriger les déformations
    const aspectRatio = this.canvas.width / this.canvas.height;
    this.shaderProgram.setUniform1f('u_aspectRatio', aspectRatio);
  }
  
  /**
   * Définit les propriétés visuelles
   */
  public setVisualProperties(properties: VisualProperties): void {
    this.visualProperties = properties;
  }
  
  /**
   * Définit les traits de l'organisme
   */
  public setTraits(traits: OrganismTraits): void {
    this.traits = traits;
  }
  
  /**
   * Applique une mutation à l'organisme
   */
  public applyMutation(mutation: OrganismMutation): void {
    console.log('Applying mutation:', mutation.type);
    
    // Enregistrement dans le moteur de mutation
    this.mutationEngine.addMutation(mutation);
    
    // Régénération géométrique si nécessaire
    if (mutation.type === 'visual_evolution' && mutation.magnitude > 0.3) {
      this.regenerateGeometry(mutation);
    }
  }
  
  /**
   * Régénération de la géométrie lors de mutations majeures
   */
  private regenerateGeometry(mutation: OrganismMutation): void {
    // Régénérer la géométrie avec les paramètres modifiés
    const influencedGeometry = this.generator.generateMutatedForm(mutation);
    
    // Mise à jour des buffers
    this.vertices = influencedGeometry.vertices;
    this.indices = influencedGeometry.indices;
    
    // Mise à jour buffers WebGL
    const gl = this.gl;
    
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, this.vertices, gl.DYNAMIC_DRAW);
    
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, this.indices, gl.STATIC_DRAW);
  }
  
  /**
   * Stimule l'organisme (interaction utilisateur)
   */
  public stimulate(intensity: number): void {
    // Animation de stimulation
    const pulseIntensity = Math.min(1.0, 0.2 + intensity * 0.8);
    this.animationParams.scale += pulseIntensity * 0.2;
    
    // Effet visuel temporaire
    setTimeout(() => {
      // Retour à la normale
    }, 500);
  }
  
  /**
   * Nettoyage des ressources WebGL
   */
  public cleanup(): void {
    const gl = this.gl;
    
    // Suppression des buffers
    gl.deleteBuffer(this.vertexBuffer);
    gl.deleteBuffer(this.indexBuffer);
    
    // Suppression du programme shader
    this.shaderProgram.delete();
    
    // Suppression des event listeners
    window.removeEventListener('resize', this.resizeCanvas.bind(this));
    
    console.log('OrganismEngine resources cleaned up');
  }
}