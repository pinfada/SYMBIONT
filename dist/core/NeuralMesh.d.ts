import { INeuralMesh } from './interfaces/INeuralMesh';
export declare class NeuralMesh implements INeuralMesh {
    private nodes;
    private connections;
    private activations;
    private learningRate;
    constructor();
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
     * Propage l'activation à travers le réseau
     */
    propagate(): void;
    /**
     * Fonction d'activation sigmoïde
     */
    private sigmoid;
    /**
     * Récupère l'activation d'un nœud
     */
    getActivation(nodeId: string): number;
    /**
     * Applique une mutation aléatoire au réseau
     */
    mutate(rate?: number): void;
    /**
     * Mesure l'activité neurale globale
     */
    getNeuralActivity(): number;
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
}
//# sourceMappingURL=NeuralMesh.d.ts.map