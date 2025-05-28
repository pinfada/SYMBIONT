import { OrganismState, OrganismMutation } from '@shared/types';
/**
 * OrganismEngine - Moteur WebGL pour le rendu de l'organisme
 */
export declare class OrganismEngine {
    private canvas;
    private gl;
    private program;
    private dnaInterpreter;
    private mutationEngine;
    private generator;
    private performanceMonitor;
    private vertexBuffer;
    private indexBuffer;
    private frameCount;
    private elapsedTime;
    private geometry;
    private traits;
    private visualProperties;
    private currentState;
    private lastGeometryComplexity;
    private fractalTexture;
    /**
     * Constructeur
     */
    constructor(canvas: HTMLCanvasElement, dna: string);
    /**
     * Configuration WebGL
     */
    private setupGL;
    /**
     * Mise à jour du viewport canvas
     */
    private resizeCanvas;
    /**
     * Préparation des buffers WebGL
     */
    private setupBuffers;
    /**
     * Compilation et linkage des shaders
     */
    private setupShaders;
    private compileShader;
    /**
     * Rendu principal
     */
    render(state?: OrganismState): void;
    /**
     * Configuration des attributs du shader
     */
    private setupAttributes;
    /**
     * Configuration des uniforms du shader
     */
    private setupUniforms;
    /**
     * Application d'une mutation
     */
    mutate(mutation: OrganismMutation): void;
    /**
     * Récupération des métriques de performance
     */
    getPerformanceMetrics(): import("../types").PerformanceMetrics;
    /**
     * Nettoyage mémoire et ressources
     */
    cleanup(): void;
    /**
     * Indique si le moteur est prêt
     */
    isInitialized(): boolean;
    private createGLTexture;
}
//# sourceMappingURL=OrganismEngine.d.ts.map