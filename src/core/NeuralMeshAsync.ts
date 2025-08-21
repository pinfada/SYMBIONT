// Version asynchrone de NeuralMesh utilisant Web Workers
// Décharge les calculs intensifs vers un thread séparé

import { INeuralMesh } from './interfaces/INeuralMesh';
import { WorkerMessage, WorkerResponse } from '../workers/NeuralWorker';
import { errorHandler } from './utils/ErrorHandler';
import { SecureRandom } from '../shared/utils/secureRandom';
import { logger } from '@shared/utils/secureLogger';

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

interface NeuralMeshAsyncConfig {
  useWorker?: boolean;
  fallbackToMainThread?: boolean;
  maxRetries?: number;
  timeoutMs?: number;
}

export class NeuralMeshAsync implements INeuralMesh {
  private nodes: Map<string, NeuralNode> = new Map();
  private connections: Map<string, NeuralConnection[]> = new Map();
  private activations: Map<string, number> = new Map();
  // @ts-expect-error Taux réservé pour usage futur
  private learningRate: number = 0.01;
  
  // Worker management
  private worker: Worker | null = null;
  private networkId: string;
  private workerReady = false;
  private pendingOperations = new Map<string, {
    resolve: (value: unknown) => void;
    reject: (error: Error) => void;
    timeout: NodeJS.Timeout;
  }>();

  // Performance tracking
  private lastPropagationTime = 0;
  private averageProcessingTime = 0;
  private operationCount = 0;

  // @ts-expect-error Configuration réservée pour usage futur
  private config: Record<string, unknown>;

  constructor(config: NeuralMeshAsyncConfig = {}) {
    this.config = {
      useWorker: true,
      fallbackToMainThread: true,
      maxRetries: 3,
      timeoutMs: 5000,
      ...config
    };
    this.networkId = `network_${Date.now()}_${SecureRandom.random().toString(36).substr(2, 9)}`;
    this.initializeWorker();
  }

  /**
   * Initialise le Web Worker
   */
  private initializeWorker(): void {
    try {
      // Dans un environnement de navigateur, nous devons créer le worker différemment
      const workerBlob = new Blob([
        // Contenu du worker en tant que string (pour contourner les limitations)
        `
        // Worker code sera injecté ici lors du build
        importScripts('./workers/NeuralWorker.js');
        `
      ], { type: 'application/javascript' });
      
      this.worker = new Worker(URL.createObjectURL(workerBlob));
      this.worker.onmessage = this.handleWorkerMessage.bind(this);
      this.worker.onerror = this.handleWorkerError.bind(this);
      
    } catch (error) {
      errorHandler.logSimpleError('NeuralMeshAsync', 'initializeWorker', error, 'warning');
      // Fallback : mode synchrone
      this.worker = null;
    }
  }

  /**
   * Gère les messages du worker
   */
  private handleWorkerMessage(event: MessageEvent<WorkerResponse>): void {
    const { type, id, payload, processingTime } = event.data;
    
    const operation = this.pendingOperations.get(id);
    if (!operation) {
      errorHandler.logSimpleError('NeuralMeshAsync', 'handleWorkerMessage', 
        `Unknown operation ID: ${id}`, 'warning');
      return;
    }

    // Clear timeout et remove operation
    clearTimeout(operation.timeout);
    this.pendingOperations.delete(id);

    // Update performance metrics
    this.updatePerformanceMetrics(processingTime);

    if (type === 'NEURAL_RESULT') {
      operation.resolve(payload);
    } else if (type === 'NEURAL_ERROR') {
      operation.reject(new Error((payload as { message: string }).message));
    }
  }

  /**
   * Gère les erreurs du worker
   */
  private handleWorkerError(event: ErrorEvent): void {
    errorHandler.logSimpleError('NeuralMeshAsync', 'handleWorkerError', 
      `Worker error: ${event.message}`, 'error');
    
    // Reject all pending operations
    this.pendingOperations.forEach(({ reject, timeout }) => {
      clearTimeout(timeout);
      reject(new Error('Worker error occurred'));
    });
    this.pendingOperations.clear();
  }

  /**
   * Envoie un message au worker avec timeout
   */
  private sendWorkerMessage<T>(
    type: WorkerMessage['type'], 
    payload: any, 
    timeoutMs: number = 5000
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      if (!this.worker) {
        reject(new Error('Worker not available, using fallback'));
        return;
      }

      const id = `${type}_${Date.now()}_${SecureRandom.random().toString(36).substr(2, 9)}`;
      
      const timeout = setTimeout(() => {
        this.pendingOperations.delete(id);
        reject(new Error(`Worker operation timeout: ${type}`));
      }, timeoutMs);

      this.pendingOperations.set(id, { 
        resolve: resolve as (value: unknown) => void, 
        reject, 
        timeout 
      });

      const message: WorkerMessage = { type, id, payload };
      this.worker.postMessage(message);
    });
  }

  /**
   * Met à jour les métriques de performance
   */
  private updatePerformanceMetrics(processingTime: number): void {
    this.operationCount++;
    this.lastPropagationTime = processingTime;
    
    // Moving average
    const weight = 0.1;
    this.averageProcessingTime = this.averageProcessingTime * (1 - weight) + processingTime * weight;
  }

  /**
   * Ajoute un nœud au réseau
   */
  addNode(id: string, type: 'input' | 'hidden' | 'output', bias: number = 0): void {
    const node: NeuralNode = { id, type, activation: 0, bias };
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

    const connection: NeuralConnection = { from: fromId, to: toId, weight, active: true };

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
      errorHandler.logSimpleError('NeuralMeshAsync', 'stimulate', 
        `Cannot stimulate non-input node: ${nodeId}`, 'warning');
      return;
    }
    this.activations.set(nodeId, value);
  }

  /**
   * Propagation des signaux dans le réseau
   */
  async propagate(): Promise<void> {
    const startTime = performance.now();
    
    errorHandler.safeExecute(
      () => {
        // Increment operation count
        this.operationCount++;
        
        // Try worker first if available
        if (this.worker && this.workerReady) {
          this.sendWorkerMessage('NEURAL_PROPAGATE', {
            networkId: this.networkId,
            activations: Object.fromEntries(this.activations)
          }).catch(error => {
            errorHandler.logSimpleError('NeuralMeshAsync', 'propagate', error, 'warning');
            // Fallback to sync
            this.propagateSync();
          });
        } else {
          // Fallback to synchronous propagation
          this.propagateSync();
        }
        
        // Update performance metrics
        const processingTime = performance.now() - startTime;
        this.updatePerformanceMetrics(processingTime);
      },
      undefined,
      { component: 'NeuralMeshAsync', method: 'propagate' }
    );
  }

  /**
   * Propagation synchrone (fallback)
   */
  private propagateSync(): void {
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
   * Applique une mutation aléatoire au réseau (version async)
   */
  async mutate(rate: number = 0.05): Promise<void> {
    try {
      if (this.worker && this.workerReady) {
        await this.sendWorkerMessage('NEURAL_MUTATE', {
          networkId: this.networkId,
          rate
        });
        
        // Sync back the mutations to local state
        await this.syncNetworkFromWorker();
      } else {
        this.mutateSync(rate);
      }
    } catch (error) {
      errorHandler.logSimpleError('NeuralMeshAsync', 'mutate', error, 'warning');
      this.mutateSync(rate);
    }
  }

  /**
   * Mutation synchrone (fallback)
   */
  private mutateSync(rate: number): void {
    // Mutate connection weights
    for (const connections of this.connections.values()) {
      for (const connection of connections) {
        if (SecureRandom.random() < rate) {
          connection.weight += (SecureRandom.random() - 0.5) * 0.2;
          connection.weight = Math.max(-2, Math.min(2, connection.weight));
        }
      }
    }

    // Mutate node biases
    for (const node of this.nodes.values()) {
      if (SecureRandom.random() < rate) {
        node.bias += (SecureRandom.random() - 0.5) * 0.1;
        node.bias = Math.max(-1, Math.min(1, node.bias));
      }
    }
  }

  /**
   * Synchronise l'état du réseau depuis le worker
   */
  private async syncNetworkFromWorker(): Promise<void> {
    // Implementation would sync worker state back to local state
    // For now, we'll skip this complex synchronization
  }

  /**
   * Mesure l'activité neurale globale - implémentation unifiée
   */
  getNeuralActivity(): number {
    // Synchronous fallback implementation
    let totalActivity = 0;
    let nodeCount = 0;

    for (const activation of this.activations.values()) {
      totalActivity += Math.abs(activation);
      nodeCount++;
    }

    return nodeCount > 0 ? totalActivity / nodeCount : 0;
  }

  /**
   * Version asynchrone de getNeuralActivity pour calculs avancés
   */
  async getNeuralActivityAsync(): Promise<number> {
    try {
      if (this.worker && this.workerReady) {
        const result = await this.sendWorkerMessage<{
          activity: number;
          connectionStrength: number;
          nodeCount: number;
          connectionCount: number;
        }>('NEURAL_ACTIVITY', { networkId: this.networkId });
        
        return result.activity;
      }
    } catch (error) {
      errorHandler.logSimpleError('NeuralMeshAsync', 'getNeuralActivityAsync', error, 'warning');
    }

    // Fallback synchrone
    return this.getNeuralActivity();
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
  toJSON(): any {
    return {
      nodes: Array.from(this.nodes.values()),
      connections: Array.from(this.connections.values()).flat(),
      activations: Object.fromEntries(this.activations),
      performance: {
        lastPropagationTime: this.lastPropagationTime,
        averageProcessingTime: this.averageProcessingTime,
        operationCount: this.operationCount,
        workerReady: this.workerReady
      }
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

    // Initialize worker network
    if (this.worker) {
      try {
        await this.sendWorkerMessage('NEURAL_INIT', {
          networkId: this.networkId,
          nodes: Array.from(this.nodes.values()),
          connections: Array.from(this.connections.values()).flat()
        });
        this.workerReady = true;
      } catch (error) {
        errorHandler.logSimpleError('NeuralMeshAsync', 'initialize', error, 'warning');
        this.workerReady = false;
      }
    }
    
    // Perform initial propagation
    await this.propagate();
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
    
    // Terminate worker if needed
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
      this.workerReady = false;
    }
    
    logger.info('Neural mesh suspended');
  }

  /**
   * Get CPU usage estimation
   */
  async getCPUUsage(): Promise<number> {
    // Calculate based on processing time and operation frequency
    const baseLoad = this.averageProcessingTime / 16.67; // Compare to 60fps frame time
    return Math.min(1, baseLoad);
  }

  /**
   * Get memory usage estimation
   */
  async getMemoryUsage(): Promise<number> {
    const localMemory = (this.nodes.size + Array.from(this.connections.values()).length) * 64;
    
    // Add worker memory if available
    let workerMemory = 0;
    if (this.worker && this.workerReady) {
      try {
        // Would get actual worker stats, simplified for now
        workerMemory = localMemory; // Estimate
      } catch (_error) {
        // Ignore worker memory calculation error
      }
    }
    
    const totalMemory = localMemory + workerMemory;
    return Math.min(1, totalMemory / (1024 * 1024)); // Convert to MB ratio
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics(): {
    lastPropagationTime: number;
    averageProcessingTime: number;
    operationCount: number;
    workerReady: boolean;
  } {
    return {
      lastPropagationTime: this.lastPropagationTime,
      averageProcessingTime: this.averageProcessingTime,
      operationCount: this.operationCount,
      workerReady: this.workerReady
    };
  }

  /**
   * Save current state for persistence
   */
  saveState(): any {
    return {
      nodes: Array.from(this.nodes.entries()),
      connections: Array.from(this.connections.entries()).map(([key, connections]) => [
        key,
        connections
      ]),
      activations: Object.fromEntries(this.activations),
      performance: this.getPerformanceMetrics()
    };
  }

  /**
   * Load state from saved data
   */
  loadState(state: any): void {
    if (state.nodes) {
      this.nodes.clear();
      for (const [id, node] of state.nodes) {
        this.nodes.set(id, node as NeuralNode);
      }
    }
    
    if (state.connections) {
      this.connections.clear();
      for (const [fromId, connections] of state.connections) {
        this.connections.set(fromId, connections as NeuralConnection[]);
      }
    }
    
    if (state.activations) {
      this.activations.clear();
      for (const [id, activation] of Object.entries(state.activations)) {
        this.activations.set(id, activation as number);
      }
    }

    if (state.performance) {
      this.lastPropagationTime = state.performance.lastPropagationTime || 0;
      this.averageProcessingTime = state.performance.averageProcessingTime || 0;
      this.operationCount = state.performance.operationCount || 0;
    }
  }

  /**
   * Reset neural mesh to initial state
   */
  reset(): void {
    this.nodes.clear();
    this.connections.clear();
    this.activations.clear();
    this.lastPropagationTime = 0;
    this.averageProcessingTime = 0;
    this.operationCount = 0;
    this.setupDefaultNetwork();
  }

  /**
   * Health check for neural mesh
   */
  healthCheck(): { healthy: boolean; issues: string[] } {
    const issues: string[] = [];
    
    if (this.nodes.size === 0) {
      issues.push('No nodes in neural mesh');
    }
    
    if (this.connections.size === 0) {
      issues.push('No connections in neural mesh');
    }

    if (this.pendingOperations.size > 10) {
      issues.push(`Too many pending operations: ${this.pendingOperations.size}`);
    }

    if (this.worker && !this.workerReady) {
      issues.push('Worker is not ready');
    }
    
    // Check for orphaned nodes
    const connectedNodes = new Set<string>();
    for (const [fromId, connections] of this.connections) {
      connectedNodes.add(fromId);
      for (const connection of connections) {
        connectedNodes.add(connection.to);
      }
    }
    
    const orphanedNodes = Array.from(this.nodes.keys()).filter(
      nodeId => !connectedNodes.has(nodeId)
    );
    
    if (orphanedNodes.length > 0) {
      issues.push(`Orphaned nodes: ${orphanedNodes.join(', ')}`);
    }
    
    return {
      healthy: issues.length === 0,
      issues
    };
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    // Clean up pending operations
    this.pendingOperations.forEach(({ timeout }) => {
      clearTimeout(timeout);
    });
    this.pendingOperations.clear();

    // Terminate worker
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }

    // Clear all data
    this.nodes.clear();
    this.connections.clear();
    this.activations.clear();
    this.workerReady = false;
  }
} 