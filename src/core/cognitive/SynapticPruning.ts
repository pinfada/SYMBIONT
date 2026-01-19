/**
 * Élagage Synaptique (Synaptic Pruning)
 *
 * Algorithme supprimant les connexions du NeuralMesh dont le poids
 * ou la fréquence d'activation est trop faible, libérant ainsi la RAM.
 *
 * Inspiré de la biologie:
 * - Les synapses non utilisées sont éliminées
 * - Les connexions fortes sont renforcées
 * - L'élagage optimise l'efficacité du réseau
 */

import { logger } from '@/shared/utils/secureLogger';
import { circadianCycle } from '../metabolic/CircadianCycle';
import { neuromodulation } from '../metabolic/Neuromodulation';

export interface PruningConfig {
  weightThreshold: number;          // Poids minimum pour survivre (défaut: 0.1)
  activationThreshold: number;      // Activation minimum (défaut: 0.05)
  maxPrunePercentage: number;       // Max % de connexions à élaguer par cycle (défaut: 0.2)
  minConnections: number;           // Nombre minimum de connexions à garder (défaut: 10)
  consolidationFactor: number;      // Facteur de renforcement des survivants (défaut: 1.1)
  dormancyPeriod: number;           // Période avant considérer dormant (ms, défaut: 3600000)
}

export interface ConnectionStats {
  fromId: string;
  toId: string;
  weight: number;
  activationCount: number;
  lastActivation: number;
  age: number;                      // ms depuis création
}

export interface PruningResult {
  prunedConnections: number;
  survivingConnections: number;
  consolidatedConnections: number;
  memoryFreed: number;              // Estimation en bytes
  pruningDuration: number;          // ms
  newNetworkEfficiency: number;     // 0-1
}

export interface NeuralMeshState {
  nodes: Map<string, { type: string; activation: number; bias: number }>;
  connections: Map<string, Map<string, number>>;
  activations: Map<string, number>;
}

/**
 * Interface pour le NeuralMesh (pour découplage)
 */
export interface IPrunableNeuralMesh {
  getState(): NeuralMeshState;
  removeConnection(fromId: string, toId: string): void;
  setConnectionWeight(fromId: string, toId: string, weight: number): void;
  getConnectionWeight(fromId: string, toId: string): number | undefined;
  getNodeCount(): number;
  getConnectionCount(): number;
}

/**
 * Gestionnaire d'élagage synaptique
 */
export class SynapticPruningManager {
  private config: PruningConfig;
  private connectionStats: Map<string, ConnectionStats> = new Map();
  private lastPruning: number = 0;
  private totalPruned: number = 0;
  private totalConsolidated: number = 0;

  constructor(config?: Partial<PruningConfig>) {
    this.config = {
      weightThreshold: 0.1,
      activationThreshold: 0.05,
      maxPrunePercentage: 0.2,
      minConnections: 10,
      consolidationFactor: 1.1,
      dormancyPeriod: 3600000, // 1 heure
      ...config
    };

    logger.info('[SynapticPruning] Initialized', this.config);
  }

  /**
   * Enregistre une activation de connexion (pour tracking)
   */
  recordActivation(fromId: string, toId: string, weight: number): void {
    const key = `${fromId}->${toId}`;
    const now = Date.now();

    const existing = this.connectionStats.get(key);
    if (existing) {
      existing.activationCount++;
      existing.lastActivation = now;
      existing.weight = weight;
    } else {
      this.connectionStats.set(key, {
        fromId,
        toId,
        weight,
        activationCount: 1,
        lastActivation: now,
        age: now
      });
    }
  }

  /**
   * Exécute l'élagage synaptique sur le réseau neuronal
   */
  async prune(neuralMesh: IPrunableNeuralMesh): Promise<PruningResult> {
    const startTime = Date.now();

    // Vérifier si on peut faire de l'élagage (mode rêve préféré)
    if (!circadianCycle.canPerformIntensiveProcessing()) {
      // En mode actif, élagage minimal
      if (neuromodulation.isStressed()) {
        // Ne pas élaguer si l'organisme est stressé
        return {
          prunedConnections: 0,
          survivingConnections: neuralMesh.getConnectionCount(),
          consolidatedConnections: 0,
          memoryFreed: 0,
          pruningDuration: 0,
          newNetworkEfficiency: 1
        };
      }
    }

    const state = neuralMesh.getState();
    const connectionsToPrune: Array<{ fromId: string; toId: string }> = [];
    const connectionsToConsolidate: Array<{ fromId: string; toId: string; newWeight: number }> = [];

    let totalConnections = 0;
    const now = Date.now();

    // Analyser chaque connexion
    for (const [fromId, connections] of state.connections) {
      for (const [toId, weight] of connections) {
        totalConnections++;
        const key = `${fromId}->${toId}`;
        const stats = this.connectionStats.get(key);

        // Calculer le score de la connexion
        const score = this.calculateConnectionScore(weight, stats, now);

        if (score < this.config.weightThreshold) {
          // Marquer pour élagage
          connectionsToPrune.push({ fromId, toId });
        } else if (score > 0.7) {
          // Marquer pour consolidation (renforcement)
          const newWeight = Math.min(2, weight * this.config.consolidationFactor);
          connectionsToConsolidate.push({ fromId, toId, newWeight });
        }
      }
    }

    // Limiter l'élagage au pourcentage maximum
    const maxToPrune = Math.floor(totalConnections * this.config.maxPrunePercentage);
    const actualToPrune = connectionsToPrune.slice(0, maxToPrune);

    // Vérifier qu'on garde le minimum de connexions
    const remainingConnections = totalConnections - actualToPrune.length;
    if (remainingConnections < this.config.minConnections) {
      const toKeep = totalConnections - this.config.minConnections;
      actualToPrune.splice(toKeep);
    }

    // Exécuter l'élagage
    for (const { fromId, toId } of actualToPrune) {
      try {
        neuralMesh.removeConnection(fromId, toId);
        this.connectionStats.delete(`${fromId}->${toId}`);
      } catch (error) {
        logger.warn('[SynapticPruning] Failed to prune connection', { fromId, toId, error });
      }
    }

    // Exécuter la consolidation
    for (const { fromId, toId, newWeight } of connectionsToConsolidate) {
      try {
        neuralMesh.setConnectionWeight(fromId, toId, newWeight);
      } catch (error) {
        logger.warn('[SynapticPruning] Failed to consolidate connection', { fromId, toId, error });
      }
    }

    // Calculer les métriques
    const prunedConnections = actualToPrune.length;
    const survivingConnections = totalConnections - prunedConnections;
    const consolidatedConnections = connectionsToConsolidate.length;

    // Estimation mémoire libérée (approximation)
    const memoryFreed = prunedConnections * 64; // ~64 bytes par connexion

    this.totalPruned += prunedConnections;
    this.totalConsolidated += consolidatedConnections;
    this.lastPruning = now;

    const pruningDuration = Date.now() - startTime;
    const newNetworkEfficiency = this.calculateNetworkEfficiency(neuralMesh);

    const result: PruningResult = {
      prunedConnections,
      survivingConnections,
      consolidatedConnections,
      memoryFreed,
      pruningDuration,
      newNetworkEfficiency
    };

    logger.info('[SynapticPruning] Pruning completed', result);

    // Notifier le système de neuromodulation
    if (prunedConnections > 0) {
      neuromodulation.processEvent('success', 0.2);
    }

    return result;
  }

  /**
   * Calcule le score d'une connexion (0-1)
   */
  private calculateConnectionScore(
    weight: number,
    stats: ConnectionStats | undefined,
    now: number
  ): number {
    // Score basé sur le poids (normalisé entre -2 et 2)
    const weightScore = (Math.abs(weight) + 2) / 4;

    if (!stats) {
      // Pas de stats = connexion jamais activée, score bas
      return weightScore * 0.5;
    }

    // Score basé sur la fréquence d'activation
    const activationScore = Math.min(1, stats.activationCount / 100);

    // Pénalité pour dormance
    const dormancyTime = now - stats.lastActivation;
    const dormancyPenalty = dormancyTime > this.config.dormancyPeriod
      ? Math.min(0.5, (dormancyTime - this.config.dormancyPeriod) / this.config.dormancyPeriod * 0.5)
      : 0;

    // Score combiné
    const combinedScore = (weightScore * 0.4 + activationScore * 0.6) - dormancyPenalty;

    return Math.max(0, Math.min(1, combinedScore));
  }

  /**
   * Calcule l'efficacité du réseau
   */
  private calculateNetworkEfficiency(neuralMesh: IPrunableNeuralMesh): number {
    const nodeCount = neuralMesh.getNodeCount();
    const connectionCount = neuralMesh.getConnectionCount();

    if (nodeCount === 0) return 0;

    // Ratio optimal: environ 3-5 connexions par nœud
    const optimalRatio = 4;
    const actualRatio = connectionCount / nodeCount;

    // Score de densité (trop ou trop peu de connexions = moins efficace)
    const densityScore = 1 - Math.abs(actualRatio - optimalRatio) / optimalRatio;

    return Math.max(0, Math.min(1, densityScore));
  }

  /**
   * Analyse le réseau et retourne des recommandations
   */
  analyze(neuralMesh: IPrunableNeuralMesh): {
    totalConnections: number;
    candidatesForPruning: number;
    candidatesForConsolidation: number;
    dormantConnections: number;
    recommendedAction: 'prune' | 'consolidate' | 'none';
  } {
    const state = neuralMesh.getState();
    const now = Date.now();

    let totalConnections = 0;
    let candidatesForPruning = 0;
    let candidatesForConsolidation = 0;
    let dormantConnections = 0;

    for (const [fromId, connections] of state.connections) {
      for (const [toId, weight] of connections) {
        totalConnections++;
        const key = `${fromId}->${toId}`;
        const stats = this.connectionStats.get(key);

        const score = this.calculateConnectionScore(weight, stats, now);

        if (score < this.config.weightThreshold) {
          candidatesForPruning++;
        } else if (score > 0.7) {
          candidatesForConsolidation++;
        }

        if (stats && (now - stats.lastActivation) > this.config.dormancyPeriod) {
          dormantConnections++;
        }
      }
    }

    // Recommandation
    let recommendedAction: 'prune' | 'consolidate' | 'none' = 'none';

    if (candidatesForPruning > totalConnections * 0.3) {
      recommendedAction = 'prune';
    } else if (candidatesForConsolidation > totalConnections * 0.2) {
      recommendedAction = 'consolidate';
    }

    return {
      totalConnections,
      candidatesForPruning,
      candidatesForConsolidation,
      dormantConnections,
      recommendedAction
    };
  }

  /**
   * Retourne les statistiques globales
   */
  getStats(): {
    totalPruned: number;
    totalConsolidated: number;
    lastPruning: number;
    trackedConnections: number;
  } {
    return {
      totalPruned: this.totalPruned,
      totalConsolidated: this.totalConsolidated,
      lastPruning: this.lastPruning,
      trackedConnections: this.connectionStats.size
    };
  }

  /**
   * Nettoie les stats des connexions obsolètes
   */
  cleanupStats(validConnectionKeys: Set<string>): void {
    for (const key of this.connectionStats.keys()) {
      if (!validConnectionKeys.has(key)) {
        this.connectionStats.delete(key);
      }
    }
  }

  /**
   * Sérialise l'état
   */
  serialize(): {
    connectionStats: Array<[string, ConnectionStats]>;
    totalPruned: number;
    totalConsolidated: number;
  } {
    return {
      connectionStats: Array.from(this.connectionStats.entries()),
      totalPruned: this.totalPruned,
      totalConsolidated: this.totalConsolidated
    };
  }

  /**
   * Restaure l'état
   */
  deserialize(state: {
    connectionStats: Array<[string, ConnectionStats]>;
    totalPruned: number;
    totalConsolidated: number;
  }): void {
    this.connectionStats = new Map(state.connectionStats);
    this.totalPruned = state.totalPruned;
    this.totalConsolidated = state.totalConsolidated;
  }
}

// Export singleton
export const synapticPruning = new SynapticPruningManager();
