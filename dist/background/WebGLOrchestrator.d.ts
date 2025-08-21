import { WebGLContext, PerformanceMetrics, VisualMutation } from '../shared/types/organism';
import { OrganismMemoryBank } from './OrganismMemoryBank';
export declare class WebGLOrchestrator {
    private renderQueue;
    private memoryBank;
    private contexts;
    private shaderSources;
    private animationFrameId;
    private isRendering;
    constructor(memoryBank: OrganismMemoryBank);
    initializeRenderer(tabId: number): Promise<WebGLContext>;
    updateOrganismVisuals(id: string, mutations: VisualMutation[]): Promise<void>;
    optimizePerformance(metrics: PerformanceMetrics): Promise<void>;
    receiveVisualMutation(id: string, mutation: VisualMutation): Promise<void>;
    private initializeShaders;
    private createShader;
    private createBuffers;
    private loadShaderSources;
    private startRenderLoop;
    private renderFrame;
    private renderOrganism;
    private cleanupResources;
    private enableOptimizations;
    logPerformance(msg: string, metrics?: PerformanceMetrics): void;
    dispose(): void;
    activateForTab(): Promise<void>;
    processMutation(): Promise<void>;
    getPerformanceMetrics(): Promise<unknown>;
}
//# sourceMappingURL=WebGLOrchestrator.d.ts.map