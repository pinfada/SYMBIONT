import { RenderQueue, WebGLContext, PerformanceMetrics, VisualMutation } from '../shared/types/organism'
import { OrganismMemoryBank } from './OrganismMemoryBank'
import { logger } from '@/shared/utils/secureLogger';

interface ShaderProgram {
  program: WebGLProgram;
  uniforms: Record<string, WebGLUniformLocation>;
  attributes: Record<string, number>;
}

interface RenderContext {
  gl: WebGLRenderingContext;
  canvas: HTMLCanvasElement;
  shaders: Map<string, ShaderProgram>;
  buffers: Map<string, WebGLBuffer>;
  textures: Map<string, WebGLTexture>;
}

export class WebGLOrchestrator {
  private renderQueue: RenderQueue
  private memoryBank: OrganismMemoryBank
  private contexts: Map<number, RenderContext> = new Map()
  private shaderSources: Map<string, { vertex: string, fragment: string }> = new Map()
  private animationFrameId: number | null = null
  private isRendering = false

  constructor(memoryBank: OrganismMemoryBank) {
    this.renderQueue = []
    this.memoryBank = memoryBank
    this.loadShaderSources()
  }

  async initializeRenderer(tabId: number): Promise<WebGLContext> {
    try {
      // Create canvas element
      const canvas = document.createElement('canvas')
      canvas.width = 800
      canvas.height = 600
      canvas.style.display = 'none'
      document.body.appendChild(canvas)

      // Get WebGL context
      const gl = canvas.getContext('webgl2') || canvas.getContext('webgl')
      if (!gl) {
        throw new Error('WebGL not supported')
      }

      // Initialize context
      const context: RenderContext = {
        gl: gl as WebGLRenderingContext,
        canvas,
        shaders: new Map(),
        buffers: new Map(),
        textures: new Map()
      }

      // Load and compile shaders
      await this.initializeShaders(context)
      
      // Create buffers
      this.createBuffers(context)
      
      // Store context
      this.contexts.set(tabId, context)
      
      // Start render loop
      if (!this.isRendering) {
        this.startRenderLoop()
      }

      return {
        tabId,
        canvas: canvas,
        gl: gl as WebGLRenderingContext,
        ready: true
      } as WebGLContext
    } catch (error) {
      logger.error('WebGL initialization failed:', error)
      throw error
    }
  }

  async updateOrganismVisuals(id: string, mutations: VisualMutation[]): Promise<void> {
    try {
      // Load organism state
      const history = await this.memoryBank.loadOrganismHistory(id)
      const organism = history.states[0]
      if (!organism) return

      // Apply visual mutations
      mutations.forEach(mutation => {
        switch (mutation.type) {
          case 'color':
            organism.visualState = {
              ...organism.visualState,
              color: mutation.value as [number, number, number]
            
    }
            break
          case 'size':
            organism.visualState = {
              ...organism.visualState,
              scale: mutation.value as number
            }
            break
          case 'shape':
            organism.visualState = {
              ...organism.visualState,
              geometry: mutation.value as string
            }
            break
          case 'animation':
            organism.visualState = {
              ...organism.visualState,
              animation: mutation.value as string
            }
            break
        }
      })

      // Add to render queue
      this.renderQueue.push({ id, mutations, timestamp: Date.now() })
      
      // Save updated organism state
      await this.memoryBank.saveOrganismHistory(id, history)
    } catch (error) {
      logger.error('Failed to update organism visuals:', error)
    }
  }

  async optimizePerformance(metrics: PerformanceMetrics): Promise<void> {
    try {
      // GPU optimization based on performance metrics
      if (metrics.fps && metrics.fps < 30) {
        // Reduce quality
        this.contexts.forEach(context => {
          context.gl.disable(context.gl.DEPTH_TEST)
          // Reduce particle count, lower shader quality
        
    })
      }
      
      if (metrics.memoryUsage && metrics.memoryUsage > 100 * 1024 * 1024) { // 100MB
        // Clean up unused resources
        this.cleanupResources()
      }
      
      if (metrics.renderTime && metrics.renderTime > 16) { // >16ms per frame
        // Enable batching and culling
        this.enableOptimizations()
      }
      
      this.logPerformance('GPU optimization executed', metrics)
    } catch (error) {
      logger.error('Performance optimization failed:', error)
    }
  }

  // Méthode publique pour recevoir une mutation visuelle
  async receiveVisualMutation(id: string, mutation: VisualMutation): Promise<void> {
    await this.updateOrganismVisuals(id, [mutation])
  
    }

  private async initializeShaders(context: RenderContext): Promise<void> {
    for (const [name, sources] of this.shaderSources) {
      const vertexShader = this.createShader(context.gl, context.gl.VERTEX_SHADER, sources.vertex)
      const fragmentShader = this.createShader(context.gl, context.gl.FRAGMENT_SHADER, sources.fragment)
      
      if (!vertexShader || !fragmentShader) continue
      
      const program = context.gl.createProgram()
      if (!program) continue
      
      context.gl.attachShader(program, vertexShader)
      context.gl.attachShader(program, fragmentShader)
      context.gl.linkProgram(program)
      
      if (!context.gl.getProgramParameter(program, context.gl.LINK_STATUS)) {
        logger.error('Shader program link failed:', context.gl.getProgramInfoLog(program))
        continue
      
    }
      
      // Get uniform and attribute locations
      const uniforms: Record<string, WebGLUniformLocation> = {}
      const attributes: Record<string, number> = {}
      
      const numUniforms = context.gl.getProgramParameter(program, context.gl.ACTIVE_UNIFORMS)
      for (let i = 0; i < numUniforms; i++) {
        const info = context.gl.getActiveUniform(program, i)
        if (info) {
          const location = context.gl.getUniformLocation(program, info.name)
          if (location) uniforms[info.name] = location
        }
      }
      
      const numAttributes = context.gl.getProgramParameter(program, context.gl.ACTIVE_ATTRIBUTES)
      for (let i = 0; i < numAttributes; i++) {
        const info = context.gl.getActiveAttrib(program, i)
        if (info) {
          attributes[info.name] = context.gl.getAttribLocation(program, info.name)
        }
      }
      
      context.shaders.set(name, { program, uniforms, attributes })
    }
  }
  
  private createShader(gl: WebGLRenderingContext, type: number, source: string): WebGLShader | null {
    const shader = gl.createShader(type)
    if (!shader) return null
    
    gl.shaderSource(shader, source)
    gl.compileShader(shader)
    
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      logger.error('Shader compilation failed:', gl.getShaderInfoLog(shader))
      gl.deleteShader(shader)
      return null
    }
    
    return shader
  }
  
  private createBuffers(context: RenderContext): void {
    // Create vertex buffer for organism geometry
    const vertices = new Float32Array([
      -1, -1, 0,
       1, -1, 0,
       0,  1, 0
    ])
    
    const vertexBuffer = context.gl.createBuffer()
    if (vertexBuffer) {
      context.gl.bindBuffer(context.gl.ARRAY_BUFFER, vertexBuffer)
      context.gl.bufferData(context.gl.ARRAY_BUFFER, vertices, context.gl.STATIC_DRAW)
      context.buffers.set('vertices', vertexBuffer)
    
    }
  }
  
  private loadShaderSources(): void {
    // Load shader sources (these would typically be loaded from files)
    this.shaderSources.set('organism', {
      vertex: `
        attribute vec3 position;
        uniform mat4 modelViewMatrix;
        uniform mat4 projectionMatrix;
        uniform float time;
        varying vec3 vPosition;
        
        void main() {
          vPosition = position;
          vec3 pos = position;
          pos.x += sin(time + position.y * 2.0) * 0.1;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        
    }
      `,
      fragment: `
        precision mediump float;
        uniform vec3 color;
        uniform float time;
        varying vec3 vPosition;
        
        void main() {
          float intensity = sin(time + vPosition.x * 5.0) * 0.5 + 0.5;
          gl_FragColor = vec4(color * intensity, 1.0);
        }
      `
    })
  }
  
  private startRenderLoop(): void {
    this.isRendering = true
    const render = () => {
      this.renderFrame()
      if (this.isRendering) {
        this.animationFrameId = requestAnimationFrame(render)
      
    }
    }
    render()
  }
  
  private renderFrame(): void {
    const currentTime = Date.now()
    
    this.contexts.forEach((context) => {
      const gl = context.gl
      
      // Clear canvas
      gl.clearColor(0.1, 0.1, 0.2, 1.0)
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)
      
      // Process render queue for this tab
      const queueItems = this.renderQueue.filter(item => 
        currentTime - item.timestamp < 1000 // Keep items for 1 second
      )
      
      queueItems.forEach(item => {
        this.renderOrganism(context, item.id, currentTime)
      
    })
    })
    
    // Clean old queue items
    this.renderQueue = this.renderQueue.filter(item => 
      currentTime - item.timestamp < 1000
    )
  }
  
  private renderOrganism(context: RenderContext, _organismId: string, time: number): void {
    const shader = context.shaders.get('organism')
    if (!shader) return
    
    const gl = context.gl
    gl.useProgram(shader.program)
    
    // Set uniforms
    gl.uniform1f(shader.uniforms['time'], time * 0.001)
    gl.uniform3f(shader.uniforms['color'], 0.5, 0.8, 1.0)
    
    // Bind vertex buffer
    const vertexBuffer = context.buffers.get('vertices')
    if (vertexBuffer) {
      gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer)
      gl.enableVertexAttribArray(shader.attributes['position'])
      gl.vertexAttribPointer(shader.attributes['position'], 3, gl.FLOAT, false, 0, 0)
    
    }
    
    // Draw
    gl.drawArrays(gl.TRIANGLES, 0, 3)
  }
  
  private cleanupResources(): void {
    this.contexts.forEach(context => {
      // Clean up unused textures and buffers
      context.textures.clear()
    
    })
  }
  
  private enableOptimizations(): void {
    this.contexts.forEach(context => {
      context.gl.enable(context.gl.CULL_FACE)
      context.gl.enable(context.gl.DEPTH_TEST)
    
    })
  }

  // --- Monitoring ---
  logPerformance(msg: string, metrics?: PerformanceMetrics) {
    if (metrics) {
      logger.info(`[WebGL] ${msg}`, {
        fps: metrics.fps,
        renderTime: metrics.renderTime,
        memoryUsage: metrics.memoryUsage
      })
    } else {
      logger.info(`[WebGL] ${msg}`)
    }
  }
  
  // Public cleanup method
  dispose(): void {
    this.isRendering = false
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId)
    
    }
    
    this.contexts.forEach(context => {
      // Cleanup WebGL resources
      context.shaders.forEach(shader => {
        context.gl.deleteProgram(shader.program)
      })
      
      context.buffers.forEach(buffer => {
        context.gl.deleteBuffer(buffer)
      })
      
      context.textures.forEach(texture => {
        context.gl.deleteTexture(texture)
      })
      
      // Remove canvas
      if (context.canvas.parentNode) {
        context.canvas.parentNode.removeChild(context.canvas)
      }
    })
    
    this.contexts.clear()
    this.renderQueue = []
  }

  async activateForTab(): Promise<void> {
    // Activate WebGL orchestration for specific tab
    // ... existing code ...
  
    }

  async processMutation(): Promise<void> {
    // Process organism mutation with WebGL updates
    // ... existing code ...
  
    }

  async getPerformanceMetrics(): Promise<unknown> {
    // Get comprehensive performance metrics
    return {
      renderTime: 0,
      frameRate: 0,
      memoryUsage: 0,
      activeAnimations: 0
    };
  }
} 