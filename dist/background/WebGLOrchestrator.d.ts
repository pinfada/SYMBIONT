import { PerformanceMetrics, VisualMutation } from '../shared/types/organism';
import { OrganismMemoryBank } from './OrganismMemoryBank';
interface RenderRequest {
    id: string;
    type: 'organism' | 'evolution' | 'neural_activity';
    data: any;
    priority: 'high' | 'medium' | 'low';
    timestamp: number;
}
export declare class WebGLOrchestrator {
    private renderQueue;
    private memoryBank;
    private webglBridge;
    private renderTargets;
    private isInitialized;
    private performanceMetrics;
    constructor(memoryBank: OrganismMemoryBank);
    initialize(): Promise<void>;
    private initializeRenderTargets;
    private monitorRenderTargets;
    private checkContentScriptAvailability;
    updateOrganismVisuals(id: string, mutations: VisualMutation[]): Promise<void>;
    queueRenderRequest(request: RenderRequest): Promise<void>;
    private processRenderQueue;
    private selectBestRenderTarget;
    private executeRenderRequest;
    private startQueueProcessor;
    optimizePerformance(metrics: PerformanceMetrics): Promise<void>;
    private adjustRenderTargetPerformance;
    private cleanupRenderTargets;
    private adjustTargetPriorities;
    receiveVisualMutation(id: string, mutation: VisualMutation): Promise<void>;
    requestHighPriorityRender(organismId: string, data: any): Promise<void>;
    getPerformanceMetrics(): Promise<typeof this.performanceMetrics>;
    activateForTab(tabId: number): Promise<void>;
    processMutation(organismId: string, mutationData: any): Promise<void>;
    logPerformance(msg: string, metrics?: PerformanceMetrics): void;
    dispose(): Promise<void>;
    isReady(): boolean;
    getQueueLength(): number;
    getRenderTargetStatus(): Record<string, {
        available: boolean;
        performance: number;
    }>;
}
export {};
//# sourceMappingURL=WebGLOrchestrator.d.ts.map