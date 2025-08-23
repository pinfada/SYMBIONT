export declare class ServiceWorkerWebGLBridge {
    private offscreenCreated;
    private pendingRequests;
    initialize(): Promise<boolean>;
    private setupMessageHandling;
    renderOrganism(organismData: any): Promise<ImageData | null>;
    renderEvolutionSteps(organisms: any[]): Promise<ImageData[]>;
    updateShaders(shaderCode: {
        vertex: string;
        fragment: string;
    }): Promise<boolean>;
    cleanup(): Promise<void>;
}
export declare class ContentScriptWebGLFallback {
    renderOrganism(organismData: any): Promise<ImageData | null>;
}
export declare class WebGLBridgeManager {
    private offscreenManager;
    private fallbackManager;
    private useOffscreen;
    constructor();
    initialize(): Promise<void>;
    renderOrganism(organismData: any): Promise<ImageData | null>;
    cleanup(): Promise<void>;
}
export default WebGLBridgeManager;
//# sourceMappingURL=OffscreenWebGL.d.ts.map