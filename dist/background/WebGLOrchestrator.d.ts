import { WebGLContext, PerformanceMetrics, VisualMutation } from '../shared/types/organism';
import { OrganismMemoryBank } from './OrganismMemoryBank';
export declare class WebGLOrchestrator {
    private renderQueue;
    private memoryBank;
    constructor(memoryBank: OrganismMemoryBank);
    initializeRenderer(tabId: number): Promise<WebGLContext>;
    updateOrganismVisuals(id: string, mutations: VisualMutation[]): Promise<void>;
    optimizePerformance(metrics: PerformanceMetrics): Promise<void>;
    optimizeRendering(): Promise<void>;
    receiveVisualMutation(id: string, mutation: VisualMutation): Promise<void>;
    logPerformance(msg: string): void;
}
//# sourceMappingURL=WebGLOrchestrator.d.ts.map