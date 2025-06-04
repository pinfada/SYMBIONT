import { NeuralNode, NeuralConnection } from '../core/interfaces/INeuralMesh';
export interface WorkerMessage {
    type: 'NEURAL_PROPAGATE' | 'NEURAL_MUTATE' | 'NEURAL_ACTIVITY' | 'NEURAL_INIT';
    id: string;
    payload: any;
}
export interface WorkerResponse {
    type: 'NEURAL_RESULT' | 'NEURAL_ERROR';
    id: string;
    payload: any;
    processingTime: number;
}
export interface NeuralNetworkState {
    nodes: Map<string, NeuralNode>;
    connections: Map<string, NeuralConnection[]>;
    activations: Map<string, number>;
}
declare class NeuralWorkerEngine {
    private networks;
    /**
     * Initialise un réseau neuronal dans le worker
     */
    initializeNetwork(networkId: string, nodes: NeuralNode[], connections: NeuralConnection[]): void;
    /**
     * Propage les activations dans le réseau (opération intensive)
     */
    propagateNetwork(networkId: string, inputs: Record<string, number>): Record<string, number>;
    /**
     * Applique des mutations au réseau
     */
    mutateNetwork(networkId: string, rate: number): boolean;
    /**
     * Calcule les métriques d'activité neurale
     */
    calculateNeuralActivity(networkId: string): {
        activity: number;
        connectionStrength: number;
        nodeCount: number;
        connectionCount: number;
    };
    /**
     * Fonction d'activation sigmoïde optimisée
     */
    private sigmoid;
    /**
     * Nettoie un réseau de la mémoire
     */
    cleanupNetwork(networkId: string): boolean;
    /**
     * Retourne les stats du worker
     */
    getWorkerStats(): {
        networkCount: number;
        memoryUsage: number;
    };
}
declare const neuralEngine: NeuralWorkerEngine;
export default neuralEngine;
//# sourceMappingURL=NeuralWorker.d.ts.map