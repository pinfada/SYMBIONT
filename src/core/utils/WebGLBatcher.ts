// Système de batching WebGL pour optimiser les performances de rendu
// Regroupe les appels de rendu pour réduire la charge GPU

import { errorHandler } from './ErrorHandler';
import { PerformanceOptimizedRandom } from '../../shared/utils/PerformanceOptimizedRandom';

export interface WebGLDrawCall {
  id: string;
  type: 'triangle' | 'line' | 'point';
  vertices: Float32Array;
  indices?: Uint16Array;
  uniforms: Record<string, number | Float32Array>;
  priority: 'low' | 'normal' | 'high';
  timestamp: number;
}

export interface BatchedDrawCall {
  vertices: Float32Array;
  indices: Uint16Array;
  uniforms: Record<string, number | Float32Array>;
  drawCallCount: number;
  type: 'triangle' | 'line' | 'point';
}

export interface WebGLBatcherConfig {
  maxBatchSize: number;
  maxVertices: number;
  frameTimeoutMs: number;
  enableInstancing: boolean;
}

export class WebGLBatcher {
  private gl: WebGLRenderingContext | WebGL2RenderingContext;
  private config: WebGLBatcherConfig;
  private pendingDrawCalls: Map<string, WebGLDrawCall[]> = new Map();
  private frameId: number | null = null;
  
  // Buffers réutilisables
  private vertexBuffer: WebGLBuffer | null = null;
  private indexBuffer: WebGLBuffer | null = null;
  private vertexArray: WebGLVertexArrayObject | null = null;
  
  // Statistiques
  private stats = {
    totalDrawCalls: 0,
    totalBatches: 0,
    verticesProcessed: 0,
    lastFrameTime: 0,
    averageFrameTime: 0
  };

  constructor(
    gl: WebGLRenderingContext | WebGL2RenderingContext,
    config: Partial<WebGLBatcherConfig> = {}
  ) {
    this.gl = gl;
    this.config = {
      maxBatchSize: 100,
      maxVertices: 65536, // Max vertices per batch
      frameTimeoutMs: 16.67, // ~60 FPS
      enableInstancing: true,
      ...config
    };
    
    this.initializeBuffers();
  }

  /**
   * Initialise les buffers WebGL réutilisables
   */
  private initializeBuffers(): void {
    errorHandler.safeExecute(
      () => {
        // Vertex buffer
        this.vertexBuffer = this.gl.createBuffer();
        if (!this.vertexBuffer) {
          throw new Error('Failed to create vertex buffer');
        }

        // Index buffer
        this.indexBuffer = this.gl.createBuffer();
        if (!this.indexBuffer) {
          throw new Error('Failed to create index buffer');
        }

        // Vertex Array Object (WebGL 2 only)
        if ('createVertexArray' in this.gl) {
          this.vertexArray = (this.gl as WebGL2RenderingContext).createVertexArray();
        }
      },
      undefined,
      { component: 'WebGLBatcher', method: 'initializeBuffers' }
    );
  }

  /**
   * Ajoute un appel de rendu au batch
   */
  public addDrawCall(drawCall: Omit<WebGLDrawCall, 'id' | 'timestamp'>): string {
    const id = `draw_${Date.now()}_${PerformanceOptimizedRandom.random().toString(36).substr(2, 9)}`;
    const fullDrawCall: WebGLDrawCall = {
      ...drawCall,
      id,
      timestamp: Date.now()
    };

    // Groupe par type de primitive
    const typeKey = drawCall.type;
    if (!this.pendingDrawCalls.has(typeKey)) {
      this.pendingDrawCalls.set(typeKey, []);
    }
    
    this.pendingDrawCalls.get(typeKey)!.push(fullDrawCall);
    this.stats.totalDrawCalls++;

    // Schedule frame rendering
    this.scheduleFrameRender();

    return id;
  }

  /**
   * Planifie le rendu du frame
   */
  private scheduleFrameRender(): void {
    if (this.frameId !== null) {
      return; // Already scheduled
    }

    // Check if we should render immediately
    const shouldRenderImmediately = this.shouldRenderImmediately();
    
    if (shouldRenderImmediately) {
      this.renderFrame();
      return;
    }

    // Schedule for next animation frame
    this.frameId = requestAnimationFrame(() => {
      this.renderFrame();
    });
  }

  /**
   * Détermine si on doit rendre immédiatement
   */
  private shouldRenderImmediately(): boolean {
    let totalVertices = 0;
    let totalDrawCalls = 0;
    let hasHighPriority = false;

    for (const drawCalls of this.pendingDrawCalls.values()) {
      if (!drawCalls || drawCalls.length === 0) continue; // Protection null
      
      totalDrawCalls += drawCalls.length;
      for (const call of drawCalls) {
        if (call && call.vertices) { // Protection null
          totalVertices += call.vertices.length / 3; // Assuming 3 components per vertex
        }
        if (call && call.priority === 'high') {
          hasHighPriority = true;
        }
      }
    }

    // Rendre immédiatement si on dépasse les seuils ou si haute priorité
    const shouldRender = totalVertices >= this.config.maxVertices ||
           totalDrawCalls >= this.config.maxBatchSize ||
           hasHighPriority;

    return shouldRender;
  }

  /**
   * Rend le frame courant
   */
  private renderFrame(): void {
    const startTime = performance.now();
    
    errorHandler.safeExecute(
      () => {
        this.frameId = null;

        // Process each primitive type
        for (const [type, drawCalls] of this.pendingDrawCalls) {
          if (!drawCalls || drawCalls.length === 0) continue;

          const batchedCall = this.batchDrawCalls(drawCalls as WebGLDrawCall[], type as any);
          if (batchedCall.drawCallCount > 0) {
            this.executeDrawCall(batchedCall);
            this.stats.totalBatches++;
            this.stats.verticesProcessed += batchedCall.vertices.length / 3;
          }
        }

        // Clear pending draw calls
        this.pendingDrawCalls.clear();

        // Update frame timing stats
        const frameTime = performance.now() - startTime;
        this.updateFrameStats(frameTime);
      },
      undefined,
      { component: 'WebGLBatcher', method: 'renderFrame' }
    );
  }

  /**
   * Groupe plusieurs draw calls en un seul
   */
  private batchDrawCalls(
    drawCalls: WebGLDrawCall[], 
    type: 'triangle' | 'line' | 'point'
  ): BatchedDrawCall {
    // Filter out null/invalid draw calls
    const validDrawCalls = drawCalls.filter(call => 
      call && call.vertices && call.vertices.length > 0
    );
    
    if (validDrawCalls.length === 0) {
      return {
        vertices: new Float32Array(0),
        indices: new Uint16Array(0),
        uniforms: {},
        drawCallCount: 0,
        type
      };
    }
    
    // Calculate total size needed
    let totalVertices = 0;
    let totalIndices = 0;
    
    validDrawCalls.forEach(call => {
      totalVertices += call.vertices.length;
      totalIndices += call.indices?.length || 0;
    });

    // Create combined arrays
    const vertices = new Float32Array(totalVertices);
    const indices = new Uint16Array(totalIndices);
    const uniforms: Record<string, number | Float32Array> = {};

    let vertexOffset = 0;
    let indexOffset = 0;
    let vertexIndexOffset = 0;

    // Combine draw calls
    validDrawCalls.forEach(call => {
      // Copy vertices
      vertices.set(call.vertices, vertexOffset);
      
      // Copy and adjust indices
      if (call.indices) {
        for (let i = 0; i < call.indices.length; i++) {
          indices[indexOffset + i] = call.indices[i] + vertexIndexOffset;
        }
        indexOffset += call.indices.length;
      }

      // Merge uniforms (take average for conflicts)
      Object.entries(call.uniforms).forEach(([key, value]) => {
        if (uniforms[key] === undefined) {
          uniforms[key] = value;
        } else if (typeof value === 'number' && typeof uniforms[key] === 'number') {
          uniforms[key] = ((uniforms[key] as number) + value) / 2;
        }
      });

      vertexOffset += call.vertices.length;
      vertexIndexOffset += call.vertices.length / 3; // Assuming 3 components per vertex
    });

    return {
      vertices,
      indices: totalIndices > 0 ? indices : new Uint16Array(0),
      uniforms,
      drawCallCount: validDrawCalls.length,
      type
    };
  }

  /**
   * Exécute un draw call batchéed
   */
  private executeDrawCall(batchedCall: BatchedDrawCall): void {
    errorHandler.safeExecute(
      () => {
        const gl = this.gl;

        // Bind vertex buffer
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, batchedCall.vertices, gl.DYNAMIC_DRAW);

        // Setup vertex attributes (assuming position + normal + uv)
        const stride = 8 * Float32Array.BYTES_PER_ELEMENT; // 3 pos + 3 normal + 2 uv
        
        // Position attribute (location 0)
        gl.vertexAttribPointer(0, 3, gl.FLOAT, false, stride, 0);
        gl.enableVertexAttribArray(0);
        
        // Normal attribute (location 1)
        gl.vertexAttribPointer(1, 3, gl.FLOAT, false, stride, 3 * Float32Array.BYTES_PER_ELEMENT);
        gl.enableVertexAttribArray(1);
        
        // UV attribute (location 2)
        gl.vertexAttribPointer(2, 2, gl.FLOAT, false, stride, 6 * Float32Array.BYTES_PER_ELEMENT);
        gl.enableVertexAttribArray(2);

        // Draw based on type
        if (batchedCall.indices.length > 0) {
          // Indexed drawing
          gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
          gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, batchedCall.indices, gl.DYNAMIC_DRAW);
          
          const mode = this.getGLPrimitive(batchedCall.type);
          gl.drawElements(mode, batchedCall.indices.length, gl.UNSIGNED_SHORT, 0);
        } else {
          // Array drawing
          const mode = this.getGLPrimitive(batchedCall.type);
          const vertexCount = batchedCall.vertices.length / 8; // 8 components per vertex
          gl.drawArrays(mode, 0, vertexCount);
        }
      },
      undefined,
      { component: 'WebGLBatcher', method: 'executeDrawCall' }
    );
  }

  /**
   * Convertit le type de primitive en constante WebGL
   */
  private getGLPrimitive(type: 'triangle' | 'line' | 'point'): number {
    switch (type) {
      case 'triangle': return this.gl.TRIANGLES;
      case 'line': return this.gl.LINES;
      case 'point': return this.gl.POINTS;
      default: return this.gl.TRIANGLES;
    }
  }

  /**
   * Met à jour les statistiques de frame
   */
  private updateFrameStats(frameTime: number): void {
    this.stats.lastFrameTime = frameTime;
    
    // Moving average
    const alpha = 0.1;
    this.stats.averageFrameTime = this.stats.averageFrameTime * (1 - alpha) + frameTime * alpha;
  }

  /**
   * Force le rendu immédiat de tous les draw calls en attente
   */
  public flush(): void {
    if (this.frameId) {
      cancelAnimationFrame(this.frameId);
      this.frameId = null;
    }
    this.renderFrame();
  }

  /**
   * Récupère les statistiques de performance
   */
  public getStats(): {
    totalDrawCalls: number;
    totalBatches: number;
    verticesProcessed: number;
    lastFrameTime: number;
    averageFrameTime: number;
    compressionRatio: number;
    pendingDrawCalls: number;
  } {
    let pendingDrawCalls = 0;
    for (const calls of this.pendingDrawCalls.values()) {
      pendingDrawCalls += calls.length;
    }

    return {
      ...this.stats,
      compressionRatio: this.stats.totalBatches > 0 ? this.stats.totalDrawCalls / this.stats.totalBatches : 1,
      pendingDrawCalls
    };
  }

  /**
   * Nettoie les ressources WebGL
   */
  public dispose(): void {
    if (this.frameId) {
      cancelAnimationFrame(this.frameId);
      this.frameId = null;
    }

    const gl = this.gl;
    
    if (this.vertexBuffer) {
      gl.deleteBuffer(this.vertexBuffer);
      this.vertexBuffer = null;
    }
    
    if (this.indexBuffer) {
      gl.deleteBuffer(this.indexBuffer);
      this.indexBuffer = null;
    }
    
    if (this.vertexArray && 'deleteVertexArray' in gl) {
      (gl as WebGL2RenderingContext).deleteVertexArray(this.vertexArray);
      this.vertexArray = null;
    }

    this.pendingDrawCalls.clear();
  }
} 