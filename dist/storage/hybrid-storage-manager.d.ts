/**
 * HybridStorageManager
 * Système de stockage hybride multi-niveaux (mémoire, chrome.storage, IndexedDB, localStorage d'urgence)
 * Assure la cohérence, la réplication et l'auto-réparation des données critiques.
 *
 * Exemple d'utilisation :
 *   const storage = new HybridStorageManager();
 *   await storage.store('clé', { valeur: 42 });
 *   const data = await storage.retrieve('clé');
 */
export declare class HybridStorageManager {
    private memoryCache;
    private persistentStorage;
    private indexedDB;
    private emergencyLocalStorage;
    private indexedDBReady;
    constructor();
    store(key: string, data: any, _options?: any): Promise<void>;
    retrieve(key: string): Promise<any>;
    private setupMultiLayerStorage;
    private cleanOldStorageData;
    isIndexedDBReady(): boolean;
    syncData(): Promise<void>;
    /**
     * Synchronise une clé et sa valeur sur toutes les couches de stockage.
     * Utilisé lors de la réplication ou de l'auto-réparation.
     */
    private syncKeyAcrossLayers;
    private setupDataReplication;
    private setupIntegrityMonitoring;
}
//# sourceMappingURL=hybrid-storage-manager.d.ts.map