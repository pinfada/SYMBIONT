/**
 * WebGLOptimizer - Optimisation du rendu WebGL
 * - Adaptation du frame rate
 * - Nettoyage des buffers/textures
 * - Adaptation dynamique de la qualité
 */
export declare class WebGLOptimizer {
    private gl;
    private targetFPS;
    constructor(gl: WebGLRenderingContext | WebGL2RenderingContext, targetFPS?: number);
    /**
     * Adapte le frame rate en fonction de la charge
     */
    adaptFrameRate(currentFPS: number): void;
    /**
     * Nettoie les buffers et textures inutilisés
     */
    cleanupResources(): void;
    /**
     * Change dynamiquement la qualité de rendu
     */
    setQuality(level: 'low' | 'medium' | 'high'): void;
}
//# sourceMappingURL=WebGLOptimizer.d.ts.map