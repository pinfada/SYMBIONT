"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NeuralMesh = void 0;
class NeuralMesh {
    constructor() {
        this.nodes = new Map();
        this.connections = new Map();
        this.activations = new Map();
        this.learningRate = 0.01;
        // Initialize empty network
    }
    /**
     * Ajoute un nœud au réseau
     */
    addNode(id, type, bias = 0) {
        const node = {
            id,
            type,
            activation: 0,
            bias
        };
        this.nodes.set(id, node);
        this.activations.set(id, 0);
    }
    /**
     * Ajoute une connexion entre deux nœuds
     */
    addConnection(fromId, toId, weight) {
        if (!this.nodes.has(fromId) || !this.nodes.has(toId)) {
            throw new Error(`Cannot connect non-existent nodes: ${fromId} -> ${toId}`);
        }
        const connection = {
            from: fromId,
            to: toId,
            weight,
            active: true
        };
        if (!this.connections.has(fromId)) {
            this.connections.set(fromId, []);
        }
        this.connections.get(fromId).push(connection);
    }
    /**
     * Stimule un nœud d'entrée
     */
    stimulate(nodeId, value) {
        const node = this.nodes.get(nodeId);
        if (!node || node.type !== 'input') {
            console.warn(`Cannot stimulate non-input node: ${nodeId}`);
            return;
        }
        this.activations.set(nodeId, value);
    }
    /**
     * Propage l'activation à travers le réseau
     */
    propagate() {
        // Reset non-input activations
        for (const [nodeId, node] of this.nodes) {
            if (node.type !== 'input') {
                this.activations.set(nodeId, node.bias);
            }
        }
        // Propagate through connections
        for (const [fromId, connections] of this.connections) {
            const fromActivation = this.activations.get(fromId) || 0;
            for (const connection of connections) {
                if (!connection.active)
                    continue;
                const currentActivation = this.activations.get(connection.to) || 0;
                const newActivation = currentActivation + (fromActivation * connection.weight);
                this.activations.set(connection.to, this.sigmoid(newActivation));
            }
        }
    }
    /**
     * Fonction d'activation sigmoïde
     */
    sigmoid(x) {
        return 1 / (1 + Math.exp(-x));
    }
    /**
     * Récupère l'activation d'un nœud
     */
    getActivation(nodeId) {
        return this.activations.get(nodeId) || 0;
    }
    /**
     * Applique une mutation aléatoire au réseau
     */
    mutate(rate = 0.05) {
        // Mutate connection weights
        for (const connections of this.connections.values()) {
            for (const connection of connections) {
                if (Math.random() < rate) {
                    connection.weight += (Math.random() - 0.5) * 0.2;
                    connection.weight = Math.max(-2, Math.min(2, connection.weight));
                }
            }
        }
        // Mutate node biases
        for (const node of this.nodes.values()) {
            if (Math.random() < rate) {
                node.bias += (Math.random() - 0.5) * 0.1;
                node.bias = Math.max(-1, Math.min(1, node.bias));
            }
        }
    }
    /**
     * Mesure l'activité neurale globale
     */
    getNeuralActivity() {
        let totalActivity = 0;
        let nodeCount = 0;
        for (const activation of this.activations.values()) {
            totalActivity += Math.abs(activation);
            nodeCount++;
        }
        return nodeCount > 0 ? totalActivity / nodeCount : 0;
    }
    /**
     * Mesure la force moyenne des connexions
     */
    getConnectionStrength() {
        let totalWeight = 0;
        let connectionCount = 0;
        for (const connections of this.connections.values()) {
            for (const connection of connections) {
                if (connection.active) {
                    totalWeight += Math.abs(connection.weight);
                    connectionCount++;
                }
            }
        }
        return connectionCount > 0 ? totalWeight / connectionCount : 0;
    }
    /**
     * Export JSON pour debug/sauvegarde
     */
    toJSON() {
        return {
            nodes: Array.from(this.nodes.values()),
            connections: Array.from(this.connections.values()).flat(),
            activations: Object.fromEntries(this.activations)
        };
    }
    /**
     * Initialise le réseau neuronal
     */
    async initialize() {
        // Setup default network if empty
        if (this.nodes.size === 0) {
            this.setupDefaultNetwork();
        }
        // Perform initial propagation
        this.propagate();
    }
    /**
     * Configure un réseau par défaut
     */
    setupDefaultNetwork() {
        // Input layer
        this.addNode('sensory_input', 'input');
        this.addNode('memory_input', 'input');
        // Hidden layer
        this.addNode('processing', 'hidden', 0.1);
        this.addNode('integration', 'hidden', -0.1);
        // Output layer
        this.addNode('action_output', 'output');
        this.addNode('state_output', 'output');
        // Connections
        this.addConnection('sensory_input', 'processing', 0.8);
        this.addConnection('memory_input', 'integration', 0.6);
        this.addConnection('processing', 'action_output', 1.0);
        this.addConnection('integration', 'state_output', 0.9);
        this.addConnection('processing', 'integration', 0.4);
    }
    /**
     * Gère la suspension du système
     */
    async suspend() {
        // Save current state or perform cleanup
        console.log('Neural mesh suspending...');
    }
    /**
     * Simule l'usage CPU (basé sur l'activité neurale)
     */
    async getCPUUsage() {
        const activity = this.getNeuralActivity();
        return Math.min(1.0, activity * 0.5 + 0.1);
    }
    /**
     * Simule l'usage mémoire (basé sur la taille du réseau)
     */
    async getMemoryUsage() {
        const nodeCount = this.nodes.size;
        const connectionCount = Array.from(this.connections.values())
            .reduce((sum, conns) => sum + conns.length, 0);
        return Math.min(1.0, (nodeCount + connectionCount) / 1000);
    }
}
exports.NeuralMesh = NeuralMesh;
