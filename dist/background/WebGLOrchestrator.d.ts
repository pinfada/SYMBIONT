import { WebGLContext, PerformanceMetrics, VisualMutation } from '../shared/types/organism';
import { OrganismMemoryBank } from './OrganismMemoryBank';
export declare class WebGLOrchestrator {
    private renderQueue;
    private memoryBank;
    constructor(memoryBank: OrganismMemoryBank);
    initializeRenderer(_tabId: number): Promise<WebGLContext>;
    updateOrganismVisuals(id: string, mutations: VisualMutation[]): Promise<void>;
    optimizePerformance(_metrics: PerformanceMetrics): Promise<void>;
    optimizeRendering(): Promise<void>;
    receiveVisualMutation(id: string, mutation: VisualMutation): Promise<void>;
    logPerformance(msg: string): void;
    activateForTab(): Promise<void>;
    processMutation(): Promise<void>;
    getPerformanceMetrics(): Promise<any>;
}
//# sourceMappingURL=WebGLOrchestrator.d.ts.map