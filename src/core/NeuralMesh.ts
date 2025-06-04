import { INeuralMesh } from './interfaces/INeuralMesh';

export class NeuralMesh implements INeuralMesh {
  private nodes: Map<string, { type: string; activation: number; bias: number }> = new Map();
  private connections: Map<string, Map<string, number>> = new Map();
  private activations: Map<string, number> = new Map();
  private learningRate: number = 0.01;

  constructor() {
    // Initialize empty network
  }

  /**
   * Ajoute un nœud au réseau
   */
  addNode(id: string, type: 'input' | 'hidden' | 'output', bias: number = 0): void {
    const node: { type: string; activation: number; bias: number } = {
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
  addConnection(fromId: string, toId: string, weight: number): void {
    if (!this.nodes.has(fromId) || !this.nodes.has(toId)) {
      throw new Error(`Cannot connect non-existent nodes: ${fromId} -> ${toId}`);
    }

    if (!this.connections.has(fromId)) {
      this.connections.set(fromId, new Map());
    }
    this.connections.get(fromId)!.set(toId, weight);
  }

  /**
   * Stimule un nœud d'entrée
   */
  stimulate(nodeId: string, value: number): void {
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
  propagate(): void {
    // Reset non-input activations
    for (const [nodeId, node] of this.nodes) {
      if (node.type !== 'input') {
        this.activations.set(nodeId, node.bias);
      }
    }

    // Propagate through connections
    for (const [fromId, connections] of this.connections) {
      const fromActivation = this.activations.get(fromId) || 0;
      
      for (const [toId, weight] of connections) {
        const currentActivation = this.activations.get(toId) || 0;
        const newActivation = currentActivation + (fromActivation * weight);
        this.activations.set(toId, this.sigmoid(newActivation));
      }
    }
  }

  /**
   * Fonction d'activation sigmoïde
   */
  private sigmoid(x: number): number {
    return 1 / (1 + Math.exp(-x));
  }

  /**
   * Récupère l'activation d'un nœud
   */
  getActivation(nodeId: string): number {
    return this.activations.get(nodeId) || 0;
  }

  /**
   * Applique une mutation aléatoire au réseau
   */
  mutate(rate: number = 0.05): void {
    // Mutate connection weights
    for (const connections of this.connections.values()) {
      for (const [toId, weight] of connections) {
        if (Math.random() < rate) {
          connections.set(toId, weight + (Math.random() - 0.5) * 0.2);
          connections.set(toId, Math.max(-2, Math.min(2, connections.get(toId) || 0)));
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
  getNeuralActivity(): number {
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
  getConnectionStrength(): number {
    let totalWeight = 0;
    let connectionCount = 0;

    for (const connections of this.connections.values()) {
      for (const weight of connections.values()) {
        totalWeight += Math.abs(weight);
        connectionCount++;
      }
    }

    return connectionCount > 0 ? totalWeight / connectionCount : 0;
  }

  /**
   * Export JSON pour debug/sauvegarde
   */
  toJSON(): any {
    return {
      nodes: Array.from(this.nodes.values()),
      connections: Array.from(this.connections.values()).map(connections => Array.from(connections.entries())),
      activations: Object.fromEntries(this.activations)
    };
  }

  /**
   * Initialise le réseau neuronal
   */
  async initialize(): Promise<void> {
    // Setup default network if empty
    if (this.nodes.size === 0) {
      this.setupDefaultNetwork();
    }
    
    // Perform initial propagation
    this.propagate();
  }

  /**
   * Configure un réseau par défaut pour les tests
   */
  private setupDefaultNetwork(): void {
    // Add input nodes
    this.addNode('sensory_input', 'input');
    this.addNode('memory_input', 'input');
    
    // Add hidden nodes
    this.addNode('processing_1', 'hidden', 0.1);
    this.addNode('processing_2', 'hidden', -0.1);
    
    // Add output nodes
    this.addNode('motor_output', 'output');
    this.addNode('emotion_output', 'output');
    
    // Connect the network
    this.addConnection('sensory_input', 'processing_1', 0.8);
    this.addConnection('memory_input', 'processing_2', 0.6);
    this.addConnection('processing_1', 'motor_output', 0.9);
    this.addConnection('processing_2', 'emotion_output', 0.7);
    this.addConnection('processing_1', 'processing_2', 0.3);
  }

  /**
   * Suspend neural processing
   */
  async suspend(): Promise<void> {
    // Clear activations but keep structure
    this.activations.clear();
    console.log('Neural mesh suspended');
  }

  /**
   * Get CPU usage estimation
   */
  async getCPUUsage(): Promise<number> {
    // Mock implementation - in real scenario, measure actual computation time
    const complexity = this.nodes.size * this.connections.size;
    return Math.min(1, complexity / 1000);
  }

  /**
   * Get memory usage estimation
   */
  async getMemoryUsage(): Promise<number> {
    // Mock implementation - in real scenario, measure actual memory footprint
    const memorySize = (this.nodes.size + this.connections.size) * 64; // bytes approximation
    return Math.min(1, memorySize / (1024 * 1024)); // Convert to MB ratio
  }
}