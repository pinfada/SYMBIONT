export declare class HybridStorageManager {
    private memoryCache;
    private persistentStorage;
    private indexedDB;
    private emergencyLocalStorage;
    constructor();
    store(key: string, data: any, options?: any): Promise<void>;
    retrieve(key: string): Promise<any>;
    private setupMultiLayerStorage;
    private setupDataReplication;
    private setupIntegrityMonitoring;
}
//# sourceMappingURL=hybrid-storage-manager.d.ts.map