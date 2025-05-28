import { SynapticRouter } from './SynapticRouter';
import { OrganismCore } from './OrganismCore';
import { NavigationCortex } from './NavigationCortex';

// Types minimaux pour lever les erreurs
interface NeuralNode {
  id: string;
  type: 'input' | 'hidden' | 'output';
  activation: number;
  bias: number;
}

interface NeuralConnection {
  from: string;
  to: string;
  weight: number;
  active: boolean;
}

interface OrganismJSON {
  mesh: any;
}

export class NeuralMesh {
  private nodes: Map<string, NeuralNode> = new Map();
  private connections: Map<string, NeuralConnection[]> = new Map();
  private activations: Map<string, number> = new Map();
  private learningRate: number = 0.01;

  constructor() {
    // Initialize empty network
  }

  /**
   * Ajoute un nœud au réseau
   */
  addNode(id: string, type: 'input' | 'hidden' | 'output', bias: number = 0): void {
    const node: NeuralNode = {
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
  addConnection(fromId: string, toId: string, weight: number): void {
    if (!this.nodes.has(fromId) || !this.nodes.has(toId)) {
      throw new Error(`Cannot connect non-existent nodes: ${fromId} -> ${toId}`);
    }

    const connection: NeuralConnection = {
      from: fromId,
      to: toId,
      weight,
      active: true
    };

    if (!this.connections.has(fromId)) {
      this.connections.set(fromId, []);
    }
    this.connections.get(fromId)!.push(connection);
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
      
      for (const connection of connections) {
        if (!connection.active) continue;
        
        const currentActivation = this.activations.get(connection.to) || 0;
        const newActivation = currentActivation + (fromActivation * connection.weight);
        this.activations.set(connection.to, this.sigmoid(newActivation));
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
  toJSON(): OrganismJSON['mesh'] {
    return {
      nodes: Array.from(this.nodes.values()),
      connections: Array.from(this.connections.values()).flat(),
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
   * Configure un réseau par défaut
   */
  private setupDefaultNetwork(): void {
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
  async suspend(): Promise<void> {
    // Save current state or perform cleanup
    console.log('Neural mesh suspending...');
  }

  /**
   * Simule l'usage CPU (basé sur l'activité neurale)
   */
  async getCPUUsage(): Promise<number> {
    const activity = this.getNeuralActivity();
    return Math.min(1.0, activity * 0.5 + 0.1);
  }

  /**
   * Simule l'usage mémoire (basé sur la taille du réseau)
   */
  async getMemoryUsage(): Promise<number> {
    const nodeCount = this.nodes.size;
    const connectionCount = Array.from(this.connections.values())
      .reduce((sum, conns) => sum + conns.length, 0);
    
    return Math.min(1.0, (nodeCount + connectionCount) / 1000);
  }
}