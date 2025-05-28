/**
 * NeuralMesh - Graphe neuronal orienté pour organisme artificiel
 * - Nœuds (neurones) avec activation
 * - Connexions pondérées (synapses)
 * - Propagation, stimulation, plasticité, mutation
 */
export type NodeId = string;
interface Node {
    id: NodeId;
    activation: number;
    bias: number;
    type: 'input' | 'hidden' | 'output';
}
interface Connection {
    from: NodeId;
    to: NodeId;
    weight: number;
    plasticity: number;
}
export declare class NeuralMesh {
    private nodes;
    private connections;
    /**
     * Ajoute un nœud au réseau
     */
    addNode(id: NodeId, type: 'input' | 'hidden' | 'output', bias?: number): void;
    /**
     * Ajoute une connexion pondérée
     */
    addConnection(from: NodeId, to: NodeId, weight?: number, plasticity?: number): void;
    /**
     * Stimule un nœud d'entrée
     */
    stimulate(id: NodeId, value: number): void;
    /**
     * Propage l'activation dans le réseau (1 tick)
     */
    propagate(): void;
    /**
     * Applique la plasticité (ajustement des poids)
     */
    adapt(learningRate?: number): void;
    /**
     * Applique une mutation aléatoire (structurelle ou pondérale)
     */
    mutate(rate?: number): void;
    /**
     * Réinitialise toutes les activations
     */
    reset(): void;
    /**
     * Récupère l'activation d'un nœud
     */
    getActivation(id: NodeId): number;
    /**
     * Fonction d'activation (sigmoïde)
     */
    private sigmoid;
    /**
     * Export JSON pour debug/visualisation
     */
    toJSON(): {
        nodes: Node[];
        connections: Connection[];
    };
}
export {};
//# sourceMappingURL=NeuralMesh.d.ts.map