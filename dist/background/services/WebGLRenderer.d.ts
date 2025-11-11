export interface RenderOptions {
    width: number;
    height: number;
    quality: 'low' | 'medium' | 'high';
    effects: string[];
    enableBatching?: boolean;
}
export interface OrganismRenderData {
    id: string;
    position: [number, number];
    scale: number;
    rotation: number;
    color: [number, number, number];
    traits: {
        curiosity: number;
        focus: number;
        rhythm: number;
        empathy: number;
        creativity: number;
    };
    energy: number;
    consciousness: number;
    generation: number;
}
export interface ShaderSource {
    vertex: string;
    fragment: string;
}
export declare class WebGLRenderer {
    private canvas;
    private gl;
    private isWebGL2;
    private batcher;
    private programs;
    private currentProgram;
    private buffers;
    private textures;
    private isInitialized;
    private frameCount;
    private startTime;
    private metrics;
    constructor();
    /**
     * Initialise le contexte WebGL
     */
    initialize(canvas: HTMLCanvasElement | OffscreenCanvas, options?: Partial<RenderOptions>): Promise<boolean>;
    /**
     * Compile et stocke un programme shader
     */
    createShaderProgram(name: string, vertexSource: string, fragmentSource: string): boolean;
    /**
     * Compile un shader individuel
     */
    private compileShader;
    /**
     * Utilise un programme shader
     */
    useProgram(name: string): boolean;
    /**
     * Cr�e un buffer WebGL
     */
    createBuffer(name: string, data: Float32Array | Uint16Array, target: 'array' | 'element'): boolean;
    /**
     * Cr�e une texture 2D
     */
    createTexture(name: string, width: number, height: number, data?: Uint8Array): boolean;
    /**
     * G�n�re des donn�es de bruit proc�dural
     */
    private generateNoiseData;
    /**
     * Rend un organisme
     */
    renderOrganism(organism: OrganismRenderData): void;
    /**
     * Cr�e un draw call pour un organisme
     */
    private createOrganismDrawCall;
    /**
     * Rend un organisme directement (sans batching)
     */
    private renderOrganismDirect;
    /**
     * Efface le buffer de rendu
     */
    clear(): void;
    /**
     * Finalise le rendu du frame
     */
    flush(): void;
    /**
     * Met � jour les m�triques de performance
     */
    private updateMetrics;
    /**
     * Obtient les m�triques de performance
     */
    getMetrics(): typeof this.metrics;
    /**
     * Redimensionne le canvas
     */
    resize(width: number, height: number): void;
    /**
     * V�rifie si le renderer est initialis�
     */
    isReady(): boolean;
    /**
     * Nettoie les ressources WebGL
     */
    dispose(): void;
}
export default WebGLRenderer;
//# sourceMappingURL=WebGLRenderer.d.ts.map