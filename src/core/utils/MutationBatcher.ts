// Système de batching et debouncing pour optimiser les mutations
// Évite les mutations trop fréquentes qui peuvent dégrader les performances

import { errorHandler } from './ErrorHandler';
import { SecureRandom } from '../../shared/utils/secureRandom';

export interface MutationRequest {
  id: string;
  rate: number;
  timestamp: number;
  priority: 'low' | 'normal' | 'high';
}

export interface BatchedMutation {
  combinedRate: number;
  requestCount: number;
  timespan: number;
  priority: 'low' | 'normal' | 'high';
}

export interface MutationBatcherConfig {
  debounceMs: number;
  maxBatchSize: number;
  maxWaitTimeMs: number;
  combinationStrategy: 'average' | 'max' | 'sum' | 'weighted';
}

export class MutationBatcher {
  private pendingMutations: Map<string, MutationRequest> = new Map();
  private debounceTimer: NodeJS.Timeout | null = null;
  private config: MutationBatcherConfig;
  private onBatchReady: (batch: BatchedMutation) => Promise<void>;
  
  // Statistics
  private totalRequests = 0;
  private totalBatches = 0;
  private averageBatchSize = 0;
  private lastBatchTime = 0;

  constructor(
    onBatchReady: (batch: BatchedMutation) => Promise<void>,
    config: Partial<MutationBatcherConfig> = {}
  ) {
    this.onBatchReady = onBatchReady;
    this.config = {
      debounceMs: 50, // 50ms debounce by default
      maxBatchSize: 10,
      maxWaitTimeMs: 200, // Max 200ms wait
      combinationStrategy: 'weighted',
      ...config
    };
  }

  /**
   * Ajoute une requête de mutation au batch
   */
  public addMutation(rate: number, priority: 'low' | 'normal' | 'high' = 'normal'): string {
    const mutationId = `mutation_${Date.now()}_${SecureRandom.random().toString(36).substr(2, 9)}`;
    
    const request: MutationRequest = {
      id: mutationId,
      rate: Math.max(0, Math.min(1, rate)), // Clamp to 0-1
      timestamp: Date.now(),
      priority
    };

    this.pendingMutations.set(mutationId, request);
    this.totalRequests++;

    // Schedule batch processing
    this.scheduleBatchProcessing();

    return mutationId;
  }

  /**
   * Annule une mutation en attente
   */
  public cancelMutation(mutationId: string): boolean {
    return this.pendingMutations.delete(mutationId);
  }

  /**
   * Force le traitement immédiat du batch
   */
  public async flushBatch(): Promise<void> {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }

    await this.processPendingMutations();
  }

  /**
   * Planifie le traitement du batch avec debouncing
   */
  private scheduleBatchProcessing(): void {
    // Clear existing timer
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    // Check if we should process immediately
    const shouldProcessImmediately = 
      this.pendingMutations.size >= this.config.maxBatchSize ||
      this.hasHighPriorityMutation() ||
      this.hasOldestMutationExceededMaxWait();

    if (shouldProcessImmediately) {
      this.processPendingMutations().catch(error => {
        errorHandler.logSimpleError('MutationBatcher', 'scheduleBatchProcessing', error);
      });
      return;
    }

    // Schedule debounced processing
    this.debounceTimer = setTimeout(() => {
      this.processPendingMutations().catch(error => {
        errorHandler.logSimpleError('MutationBatcher', 'debounceTimer', error);
      });
    }, this.config.debounceMs);
  }

  /**
   * Vérifie s'il y a des mutations haute priorité
   */
  private hasHighPriorityMutation(): boolean {
    return Array.from(this.pendingMutations.values()).some(m => m.priority === 'high');
  }

  /**
   * Vérifie si la mutation la plus ancienne dépasse le temps d'attente max
   */
  private hasOldestMutationExceededMaxWait(): boolean {
    const now = Date.now();
    const oldestMutation = Array.from(this.pendingMutations.values())
      .reduce((oldest, current) => 
        current.timestamp < oldest.timestamp ? current : oldest
      );

    return oldestMutation && (now - oldestMutation.timestamp) > this.config.maxWaitTimeMs;
  }

  /**
   * Traite toutes les mutations en attente
   */
  private async processPendingMutations(): Promise<void> {
    if (this.pendingMutations.size === 0) {
      return;
    }

    const mutations = Array.from(this.pendingMutations.values());
    this.pendingMutations.clear();

    try {
      const batchedMutation = this.combineMutations(mutations);
      await this.onBatchReady(batchedMutation);
      
      this.updateStatistics(mutations.length);
      this.lastBatchTime = Date.now();

    } catch (error) {
      errorHandler.logSimpleError('MutationBatcher', 'processPendingMutations', error);
      
      // Re-add mutations if processing failed
      mutations.forEach(mutation => {
        this.pendingMutations.set(mutation.id, mutation);
      });
    }
  }

  /**
   * Combine plusieurs mutations en une seule selon la stratégie configurée
   */
  private combineMutations(mutations: MutationRequest[]): BatchedMutation {
    if (mutations.length === 0) {
      throw new Error('Cannot combine empty mutations array');
    }

    const rates = mutations.map(m => m.rate);
    const priorities = mutations.map(m => m.priority);
    const timestamps = mutations.map(m => m.timestamp);
    
    let combinedRate: number;

    switch (this.config.combinationStrategy) {
      case 'average':
        combinedRate = rates.reduce((sum, rate) => sum + rate, 0) / rates.length;
        break;

      case 'max':
        combinedRate = Math.max(...rates);
        break;

      case 'sum':
        combinedRate = Math.min(1, rates.reduce((sum, rate) => sum + rate, 0));
        break;

      case 'weighted':
        combinedRate = this.calculateWeightedRate(mutations);
        break;

      default:
        combinedRate = rates.reduce((sum, rate) => sum + rate, 0) / rates.length;
    }

    // Determine overall priority
    const hasCritical = priorities.includes('high');
    const hasNormal = priorities.includes('normal');
    const overallPriority = hasCritical ? 'high' : hasNormal ? 'normal' : 'low';

    const timespan = Math.max(...timestamps) - Math.min(...timestamps);

    return {
      combinedRate: Math.max(0, Math.min(1, combinedRate)),
      requestCount: mutations.length,
      timespan,
      priority: overallPriority
    };
  }

  /**
   * Calcule un taux pondéré basé sur la priorité et le timing
   */
  private calculateWeightedRate(mutations: MutationRequest[]): number {
    let totalWeight = 0;
    let weightedSum = 0;
    const now = Date.now();

    mutations.forEach(mutation => {
      // Weight based on priority
      let priorityWeight = 1;
      switch (mutation.priority) {
        case 'high': priorityWeight = 3; break;
        case 'normal': priorityWeight = 2; break;
        case 'low': priorityWeight = 1; break;
      }

      // Weight based on recency (more recent = higher weight)
      const age = now - mutation.timestamp;
      const recencyWeight = Math.exp(-age / 1000); // Exponential decay

      const totalMutationWeight = priorityWeight * recencyWeight;
      
      weightedSum += mutation.rate * totalMutationWeight;
      totalWeight += totalMutationWeight;
    });

    return totalWeight > 0 ? weightedSum / totalWeight : 0;
  }

  /**
   * Met à jour les statistiques
   */
  private updateStatistics(batchSize: number): void {
    this.totalBatches++;
    
    // Moving average for batch size
    const alpha = 0.1;
    this.averageBatchSize = this.averageBatchSize * (1 - alpha) + batchSize * alpha;
  }

  /**
   * Récupère les statistiques de performance
   */
  public getStatistics(): {
    totalRequests: number;
    totalBatches: number;
    averageBatchSize: number;
    compressionRatio: number;
    pendingMutations: number;
    lastBatchTime: number;
    config: MutationBatcherConfig;
  } {
    const compressionRatio = this.totalBatches > 0 ? this.totalRequests / this.totalBatches : 1;

    return {
      totalRequests: this.totalRequests,
      totalBatches: this.totalBatches,
      averageBatchSize: this.averageBatchSize,
      compressionRatio,
      pendingMutations: this.pendingMutations.size,
      lastBatchTime: this.lastBatchTime,
      config: { ...this.config }
    };
  }

  /**
   * Met à jour la configuration
   */
  public updateConfig(newConfig: Partial<MutationBatcherConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Nettoie les ressources
   */
  public dispose(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    this.pendingMutations.clear();
  }
} 