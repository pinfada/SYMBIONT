declare class ServiceWorkerManager {
    private isInitialized;
    initialize(): Promise<void>;
    private handleMessage;
    dispose(): void;
}
declare const swManager: ServiceWorkerManager;
//# sourceMappingURL=service-worker.d.ts.map