"use strict";
/**
 * NeuralMesh - Graphe neuronal orienté pour organisme artificiel
 * - Nœuds (neurones) avec activation
 * - Connexions pondérées (synapses)
 * - Propagation, stimulation, plasticité, mutation
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.NeuralMesh = void 0;
class NeuralMesh {
    constructor() {
        this.nodes = new Map();
        this.connections = [];
    }
    /**
     * Ajoute un nœud au réseau
     */
    addNode(id, type, bias = 0) {
        if (this.nodes.has(id))
            throw new Error(`Node ${id} already exists`);
        this.nodes.set(id, { id, activation: 0, bias, type });
    }
    /**
     * Ajoute une connexion pondérée
     */
    addConnection(from, to, weight = 1, plasticity = 0.01) {
        if (!this.nodes.has(from) || !this.nodes.has(to))
            throw new Error('Invalid node id');
        this.connections.push({ from, to, weight, plasticity });
    }
    /**
     * Stimule un nœud d'entrée
     */
    stimulate(id, value) {
        const node = this.nodes.get(id);
        if (!node || node.type !== 'input')
            throw new Error('Can only stimulate input nodes');
        node.activation = value;
    }
    /**
     * Propage l'activation dans le réseau (1 tick)
     */
    propagate() {
        // Calcul des activations pour chaque nœud (hors input)
        const nextActivations = new Map();
        for (const node of this.nodes.values()) {
            if (node.type === 'input')
                continue;
            let sum = node.bias;
            for (const conn of this.connections.filter(c => c.to === node.id)) {
                const fromNode = this.nodes.get(conn.from);
                if (fromNode)
                    sum += fromNode.activation * conn.weight;
            }
            nextActivations.set(node.id, this.sigmoid(sum));
        }
        // Mise à jour des activations
        for (const [id, act] of nextActivations.entries()) {
            const node = this.nodes.get(id);
            if (node)
                node.activation = act;
        }
    }
    /**
     * Applique la plasticité (ajustement des poids)
     */
    adapt(learningRate = 0.01) {
        for (const conn of this.connections) {
            // Règle de Hebb simplifiée : Δw = η * pre * post
            const from = this.nodes.get(conn.from);
            const to = this.nodes.get(conn.to);
            if (from && to) {
                const delta = learningRate * from.activation * to.activation;
                conn.weight += delta * conn.plasticity;
            }
        }
    }
    /**
     * Applique une mutation aléatoire (structurelle ou pondérale)
     */
    mutate(rate = 0.05) {
        for (const conn of this.connections) {
            if (Math.random() < rate) {
                conn.weight += (Math.random() - 0.5) * 0.2;
            }
        }
        for (const node of this.nodes.values()) {
            if (Math.random() < rate) {
                node.bias += (Math.random() - 0.5) * 0.1;
            }
        }
    }
    /**
     * Réinitialise toutes les activations
     */
    reset() {
        for (const node of this.nodes.values()) {
            node.activation = 0;
        }
    }
    /**
     * Récupère l'activation d'un nœud
     */
    getActivation(id) {
        const node = this.nodes.get(id);
        if (!node)
            throw new Error('Node not found');
        return node.activation;
    }
    /**
     * Fonction d'activation (sigmoïde)
     */
    sigmoid(x) {
        return 1 / (1 + Math.exp(-x));
    }
    /**
     * Export JSON pour debug/visualisation
     */
    toJSON() {
        return {
            nodes: Array.from(this.nodes.values()),
            connections: this.connections
        };
    }
}
exports.NeuralMesh = NeuralMesh;
