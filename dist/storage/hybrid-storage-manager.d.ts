export declare class HybridStorageManager {
    private memoryCache;
    private persistentStorage;
    private indexedDB;
    private emergencyLocalStorage;
    private indexedDBReady;
    constructor();
    store(key: string, data: any, options?: any): Promise<void>;
    retrieve(key: string): Promise<any>;
    private setupMultiLayerStorage;
    isIndexedDBReady(): boolean;
    syncData(): Promise<void>;
    private setupDataReplication;
    private setupIntegrityMonitoring;
}
//# sourceMappingURL=hybrid-storage-manager.d.ts.map