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
export declare class WebGLBatcher {
    private gl;
    private config;
    private pendingDrawCalls;
    private frameId;
    private vertexBuffer;
    private indexBuffer;
    private vertexArray;
    private stats;
    constructor(gl: WebGLRenderingContext | WebGL2RenderingContext, config?: Partial<WebGLBatcherConfig>);
    /**
     * Initialise les buffers WebGL réutilisables
     */
    private initializeBuffers;
    /**
     * Ajoute un appel de rendu au batch
     */
    addDrawCall(drawCall: Omit<WebGLDrawCall, 'id' | 'timestamp'>): string;
    /**
     * Planifie le rendu du frame
     */
    private scheduleFrameRender;
    /**
     * Détermine si on doit rendre immédiatement
     */
    private shouldRenderImmediately;
    /**
     * Rend le frame courant
     */
    private renderFrame;
    /**
     * Groupe plusieurs draw calls en un seul
     */
    private batchDrawCalls;
    /**
     * Exécute un draw call batchéed
     */
    private executeDrawCall;
    /**
     * Convertit le type de primitive en constante WebGL
     */
    private getGLPrimitive;
    /**
     * Met à jour les statistiques de frame
     */
    private updateFrameStats;
    /**
     * Force le rendu immédiat de tous les draw calls en attente
     */
    flush(): void;
    /**
     * Récupère les statistiques de performance
     */
    getStats(): {
        totalDrawCalls: number;
        totalBatches: number;
        verticesProcessed: number;
        lastFrameTime: number;
        averageFrameTime: number;
        compressionRatio: number;
        pendingDrawCalls: number;
    };
    /**
     * Nettoie les ressources WebGL
     */
    dispose(): void;
}
//# sourceMappingURL=WebGLBatcher.d.ts.map