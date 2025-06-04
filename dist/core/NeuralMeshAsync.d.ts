import { INeuralMesh } from './interfaces/INeuralMesh';
interface NeuralMeshAsyncConfig {
    useWorker?: boolean;
    fallbackToMainThread?: boolean;
    maxRetries?: number;
    timeoutMs?: number;
}
export declare class NeuralMeshAsync implements INeuralMesh {
    private nodes;
    private connections;
    private activations;
    private learningRate;
    private worker;
    private networkId;
    private workerReady;
    private pendingOperations;
    private lastPropagationTime;
    private averageProcessingTime;
    private operationCount;
    private config;
    constructor(config?: NeuralMeshAsyncConfig);
    /**
     * Initialise le Web Worker
     */
    private initializeWorker;
    /**
     * Gère les messages du worker
     */
    private handleWorkerMessage;
    /**
     * Gère les erreurs du worker
     */
    private handleWorkerError;
    /**
     * Envoie un message au worker avec timeout
     */
    private sendWorkerMessage;
    /**
     * Met à jour les métriques de performance
     */
    private updatePerformanceMetrics;
    /**
     * Ajoute un nœud au réseau
     */
    addNode(id: string, type: 'input' | 'hidden' | 'output', bias?: number): void;
    /**
     * Ajoute une connexion entre deux nœuds
     */
    addConnection(fromId: string, toId: string, weight: number): void;
    /**
     * Stimule un nœud d'entrée
     */
    stimulate(nodeId: string, value: number): void;
    /**
     * Propagation des signaux dans le réseau
     */
    propagate(): Promise<void>;
    /**
     * Propagation synchrone (fallback)
     */
    private propagateSync;
    /**
     * Fonction d'activation sigmoïde
     */
    private sigmoid;
    /**
     * Récupère l'activation d'un nœud
     */
    getActivation(nodeId: string): number;
    /**
     * Applique une mutation aléatoire au réseau (version async)
     */
    mutate(rate?: number): Promise<void>;
    /**
     * Mutation synchrone (fallback)
     */
    private mutateSync;
    /**
     * Synchronise l'état du réseau depuis le worker
     */
    private syncNetworkFromWorker;
    /**
     * Mesure l'activité neurale globale - implémentation unifiée
     */
    getNeuralActivity(): number;
    /**
     * Version asynchrone de getNeuralActivity pour calculs avancés
     */
    getNeuralActivityAsync(): Promise<number>;
    /**
     * Mesure la force moyenne des connexions
     */
    getConnectionStrength(): number;
    /**
     * Export JSON pour debug/sauvegarde
     */
    toJSON(): any;
    /**
     * Initialise le réseau neuronal
     */
    initialize(): Promise<void>;
    /**
     * Configure un réseau par défaut pour les tests
     */
    private setupDefaultNetwork;
    /**
     * Suspend neural processing
     */
    suspend(): Promise<void>;
    /**
     * Get CPU usage estimation
     */
    getCPUUsage(): Promise<number>;
    /**
     * Get memory usage estimation
     */
    getMemoryUsage(): Promise<number>;
    /**
     * Get performance metrics
     */
    getPerformanceMetrics(): {
        lastPropagationTime: number;
        averageProcessingTime: number;
        operationCount: number;
        workerReady: boolean;
    };
}
export {};
//# sourceMappingURL=NeuralMeshAsync.d.ts.map