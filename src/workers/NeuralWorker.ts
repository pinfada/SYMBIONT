// Web Worker pour les calculs neuraux intensifs
// Évite de bloquer le thread principal du navigateur

import { NeuralNode, NeuralConnection } from '../core/interfaces/INeuralMesh';
import { SecureRandom } from '@shared/utils/secureRandom';

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

class NeuralWorkerEngine {
  private networks: Map<string, NeuralNetworkState> = new Map();

  /**
   * Initialise un réseau neuronal dans le worker
   */
  initializeNetwork(networkId: string, nodes: NeuralNode[], connections: NeuralConnection[]): void {
    const nodeMap = new Map<string, NeuralNode>();
    const connectionMap = new Map<string, NeuralConnection[]>();
    const activationMap = new Map<string, number>();

    // Setup nodes
    nodes.forEach(node => {
      nodeMap.set(node.id, { ...node });
      activationMap.set(node.id, 0);
    });

    // Setup connections
    connections.forEach(conn => {
      if (!connectionMap.has(conn.from)) {
        connectionMap.set(conn.from, []);
      }
      connectionMap.get(conn.from)!.push({ ...conn });
    });

    this.networks.set(networkId, {
      nodes: nodeMap,
      connections: connectionMap,
      activations: activationMap
    });
  }

  /**
   * Propage les activations dans le réseau (opération intensive)
   */
  propagateNetwork(networkId: string, inputs: Record<string, number>): Record<string, number> {
    const network = this.networks.get(networkId);
    if (!network) {
      throw new Error(`Network ${networkId} not found`);
    }

    // Set input activations
    Object.entries(inputs).forEach(([nodeId, value]) => {
      if (network.nodes.has(nodeId)) {
        network.activations.set(nodeId, value);
      }
    });

    // Reset non-input activations
    for (const [nodeId, node] of network.nodes) {
      if (node.type !== 'input') {
        network.activations.set(nodeId, node.bias);
      }
    }

    // Propagate through connections
    for (const [fromId, connections] of network.connections) {
      const fromActivation = network.activations.get(fromId) || 0;
      
      for (const connection of connections) {
        if (!connection.active) continue;
        
        const currentActivation = network.activations.get(connection.to) || 0;
        const newActivation = currentActivation + (fromActivation * connection.weight);
        network.activations.set(connection.to, this.sigmoid(newActivation));
      }
    }

    // Return all activations
    return Object.fromEntries(network.activations);
  }

  /**
   * Applique des mutations au réseau
   */
  mutateNetwork(networkId: string, rate: number): boolean {
    const network = this.networks.get(networkId);
    if (!network) {
      throw new Error(`Network ${networkId} not found`);
    }

    let mutationApplied = false;

    // Mutate connection weights
    for (const connections of network.connections.values()) {
      for (const connection of connections) {
        if (SecureRandom.random() < rate) {
          connection.weight += (SecureRandom.random() - 0.5) * 0.2;
          connection.weight = Math.max(-2, Math.min(2, connection.weight));
          mutationApplied = true;
        }
      }
    }

    // Mutate node biases
    for (const node of network.nodes.values()) {
      if (SecureRandom.random() < rate) {
        node.bias += (SecureRandom.random() - 0.5) * 0.1;
        node.bias = Math.max(-1, Math.min(1, node.bias));
        mutationApplied = true;
      }
    }

    return mutationApplied;
  }

  /**
   * Calcule les métriques d'activité neurale
   */
  calculateNeuralActivity(networkId: string): {
    activity: number;
    connectionStrength: number;
    nodeCount: number;
    connectionCount: number;
  } {
    const network = this.networks.get(networkId);
    if (!network) {
      throw new Error(`Network ${networkId} not found`);
    }

    // Neural activity
    let totalActivity = 0;
    let nodeCount = 0;
    for (const activation of network.activations.values()) {
      totalActivity += Math.abs(activation);
      nodeCount++;
    }
    const activity = nodeCount > 0 ? totalActivity / nodeCount : 0;

    // Connection strength
    let totalWeight = 0;
    let connectionCount = 0;
    for (const connections of network.connections.values()) {
      for (const connection of connections) {
        if (connection.active) {
          totalWeight += Math.abs(connection.weight);
          connectionCount++;
        }
      }
    }
    const connectionStrength = connectionCount > 0 ? totalWeight / connectionCount : 0;

    return {
      activity,
      connectionStrength,
      nodeCount,
      connectionCount
    };
  }

  /**
   * Fonction d'activation sigmoïde optimisée
   */
  private sigmoid(x: number): number {
    // Optimisation : clamp extreme values pour éviter overflow
    if (x > 10) return 1;
    if (x < -10) return 0;
    return 1 / (1 + Math.exp(-x));
  }

  /**
   * Nettoie un réseau de la mémoire
   */
  cleanupNetwork(networkId: string): boolean {
    return this.networks.delete(networkId);
  }

  /**
   * Retourne les stats du worker
   */
  getWorkerStats(): {
    networkCount: number;
    memoryUsage: number;
  } {
    let totalNodes = 0;
    let totalConnections = 0;

    this.networks.forEach(network => {
      totalNodes += network.nodes.size;
      totalConnections += Array.from(network.connections.values())
        .reduce((sum, conns) => sum + conns.length, 0);
    });

    return {
      networkCount: this.networks.size,
      memoryUsage: (totalNodes + totalConnections) * 64 // bytes estimation
    };
  }
}

// Instance du moteur neural pour ce worker
const neuralEngine = new NeuralWorkerEngine();

// Gestionnaire de messages du worker
self.onmessage = (event: MessageEvent<WorkerMessage>) => {
  const startTime = performance.now();
  const { type, id, payload } = event.data;
  
  try {
    let result: any;

    switch (type) {
      case 'NEURAL_INIT':
        neuralEngine.initializeNetwork(
          payload.networkId,
          payload.nodes,
          payload.connections
        );
        result = { success: true };
        break;

      case 'NEURAL_PROPAGATE':
        result = neuralEngine.propagateNetwork(
          payload.networkId,
          payload.inputs
        );
        break;

      case 'NEURAL_MUTATE':
        result = neuralEngine.mutateNetwork(
          payload.networkId,
          payload.rate
        );
        break;

      case 'NEURAL_ACTIVITY':
        result = neuralEngine.calculateNeuralActivity(payload.networkId);
        break;

      default:
        throw new Error(`Unknown message type: ${type}`);
    }

    const processingTime = performance.now() - startTime;

    const response: WorkerResponse = {
      type: 'NEURAL_RESULT',
      id,
      payload: result,
      processingTime
    };

    self.postMessage(response);

  } catch (error) {
    const processingTime = performance.now() - startTime;
    
    const errorResponse: WorkerResponse = {
      type: 'NEURAL_ERROR',
      id,
      payload: {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      },
      processingTime
    };

    self.postMessage(errorResponse);
  }
};

// Export pour TypeScript (ne sera pas utilisé dans le contexte worker)
export default neuralEngine; 