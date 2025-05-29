/**
 * NeuralOptimizer - Optimisation du réseau neuronal
 * - Pruning (élagage des connexions faibles)
 * - Quantification des poids
 * - Monitoring de la charge
 */
import { NeuralMesh } from '../core/neural/NeuralMesh';
export declare class NeuralOptimizer {
    private mesh;
    constructor(mesh: NeuralMesh);
    /**
     * Prune les connexions dont le poids est inférieur à un seuil
     */
    pruneConnections(threshold?: number): void;
    /**
     * Quantifie les poids des connexions (arrondi à n décimales)
     */
    quantizeWeights(decimals?: number): void;
    /**
     * Retourne la charge totale du réseau (somme des poids absolus)
     */
    getNetworkLoad(): number;
}
//# sourceMappingURL=NeuralOptimizer.d.ts.map