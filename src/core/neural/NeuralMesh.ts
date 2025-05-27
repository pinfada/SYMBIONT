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
  plasticity: number; // taux d'adaptation
}

export class NeuralMesh {
  private nodes: Map<NodeId, Node> = new Map();
  private connections: Connection[] = [];

  /**
   * Ajoute un nœud au réseau
   */
  public addNode(id: NodeId, type: 'input' | 'hidden' | 'output', bias = 0): void {
    if (this.nodes.has(id)) throw new Error(`Node ${id} already exists`);
    this.nodes.set(id, { id, activation: 0, bias, type });
  }

  /**
   * Ajoute une connexion pondérée
   */
  public addConnection(from: NodeId, to: NodeId, weight = 1, plasticity = 0.01): void {
    if (!this.nodes.has(from) || !this.nodes.has(to)) throw new Error('Invalid node id');
    this.connections.push({ from, to, weight, plasticity });
  }

  /**
   * Stimule un nœud d'entrée
   */
  public stimulate(id: NodeId, value: number): void {
    const node = this.nodes.get(id);
    if (!node || node.type !== 'input') throw new Error('Can only stimulate input nodes');
    node.activation = value;
  }

  /**
   * Propage l'activation dans le réseau (1 tick)
   */
  public propagate(): void {
    // Calcul des activations pour chaque nœud (hors input)
    const nextActivations: Map<NodeId, number> = new Map();
    for (const node of this.nodes.values()) {
      if (node.type === 'input') continue;
      let sum = node.bias;
      for (const conn of this.connections.filter(c => c.to === node.id)) {
        const fromNode = this.nodes.get(conn.from);
        if (fromNode) sum += fromNode.activation * conn.weight;
      }
      nextActivations.set(node.id, this.sigmoid(sum));
    }
    // Mise à jour des activations
    for (const [id, act] of nextActivations.entries()) {
      const node = this.nodes.get(id);
      if (node) node.activation = act;
    }
  }

  /**
   * Applique la plasticité (ajustement des poids)
   */
  public adapt(learningRate = 0.01): void {
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
  public mutate(rate = 0.05): void {
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
  public reset(): void {
    for (const node of this.nodes.values()) {
      node.activation = 0;
    }
  }

  /**
   * Récupère l'activation d'un nœud
   */
  public getActivation(id: NodeId): number {
    const node = this.nodes.get(id);
    if (!node) throw new Error('Node not found');
    return node.activation;
  }

  /**
   * Fonction d'activation (sigmoïde)
   */
  private sigmoid(x: number): number {
    return 1 / (1 + Math.exp(-x));
  }

  /**
   * Export JSON pour debug/visualisation
   */
  public toJSON() {
    return {
      nodes: Array.from(this.nodes.values()),
      connections: this.connections
    };
  }
}