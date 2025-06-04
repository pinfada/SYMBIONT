export interface MutationRequest {
    id: string;
    rate: number;
    timestamp: number;
    priority: 'low' | 'normal' | 'high';
}
export interface BatchedMutation {
    combinedRate: number;
    requestCount: number;
    timespan: number;
    priority: 'low' | 'normal' | 'high';
}
export interface MutationBatcherConfig {
    debounceMs: number;
    maxBatchSize: number;
    maxWaitTimeMs: number;
    combinationStrategy: 'average' | 'max' | 'sum' | 'weighted';
}
export declare class MutationBatcher {
    private pendingMutations;
    private debounceTimer;
    private config;
    private onBatchReady;
    private totalRequests;
    private totalBatches;
    private averageBatchSize;
    private lastBatchTime;
    constructor(onBatchReady: (batch: BatchedMutation) => Promise<void>, config?: Partial<MutationBatcherConfig>);
    /**
     * Ajoute une requête de mutation au batch
     */
    addMutation(rate: number, priority?: 'low' | 'normal' | 'high'): string;
    /**
     * Annule une mutation en attente
     */
    cancelMutation(mutationId: string): boolean;
    /**
     * Force le traitement immédiat du batch
     */
    flushBatch(): Promise<void>;
    /**
     * Planifie le traitement du batch avec debouncing
     */
    private scheduleBatchProcessing;
    /**
     * Vérifie s'il y a des mutations haute priorité
     */
    private hasHighPriorityMutation;
    /**
     * Vérifie si la mutation la plus ancienne dépasse le temps d'attente max
     */
    private hasOldestMutationExceededMaxWait;
    /**
     * Traite toutes les mutations en attente
     */
    private processPendingMutations;
    /**
     * Combine plusieurs mutations en une seule selon la stratégie configurée
     */
    private combineMutations;
    /**
     * Calcule un taux pondéré basé sur la priorité et le timing
     */
    private calculateWeightedRate;
    /**
     * Met à jour les statistiques
     */
    private updateStatistics;
    /**
     * Récupère les statistiques de performance
     */
    getStatistics(): {
        totalRequests: number;
        totalBatches: number;
        averageBatchSize: number;
        compressionRatio: number;
        pendingMutations: number;
        lastBatchTime: number;
        config: MutationBatcherConfig;
    };
    /**
     * Met à jour la configuration
     */
    updateConfig(newConfig: Partial<MutationBatcherConfig>): void;
    /**
     * Nettoie les ressources
     */
    dispose(): void;
}
//# sourceMappingURL=MutationBatcher.d.ts.map