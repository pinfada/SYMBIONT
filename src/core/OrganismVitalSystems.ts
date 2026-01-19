/**
 * OrganismVitalSystems
 *
 * Module d'intégration principal qui connecte toutes les couches:
 * - Métabolique (Neuromodulation, Backpressure, Cycle Circadien)
 * - Cognitive (Élagage Synaptique)
 * - Résilience (Quorum Sensing, Épigénétique)
 *
 * Ce système gère le "métabolisme digital" de l'organisme pour
 * éviter l'asphyxie et maintenir l'homéostasie.
 */

import { logger } from '@/shared/utils/secureLogger';

// Couche Métabolique
import {
  neuromodulation,
  backpressureController,
  circadianCycle,
  type CircadianPhase,
  type DigestTask
} from './metabolic';

// Couche Cognitive
import { synapticPruning, type IPrunableNeuralMesh } from './cognitive';

// Couche Résilience
import {
  softwareEpigenetics,
  type ContextType
} from './resilience';

// Storage Résilient
import { ResilientStorageManager, createResilientStorage } from '@/storage/ResilientStorageManager';

export interface VitalSystemsConfig {
  contextType: ContextType;
  enableNeuromodulation: boolean;
  enableBackpressure: boolean;
  enableCircadianCycle: boolean;
  enableSynapticPruning: boolean;
  enableEpigenetics: boolean;
  autoStart: boolean;
}

export interface VitalSystemsStatus {
  isRunning: boolean;
  circadianPhase: CircadianPhase;
  backpressureLevel: string;
  neuromodulatorLevels: {
    dopamine: number;
    adrenaline: number;
    serotonin: number;
    cortisol: number;
  };
  activeFeatures: number;
  silencedFeatures: number;
  storageHealth: {
    isHealthy: boolean;
    cacheSize: number;
    pendingWrites: number;
  };
}

/**
 * Orchestrateur des systèmes vitaux de l'organisme
 */
export class OrganismVitalSystems {
  private config: VitalSystemsConfig;
  private isRunning: boolean = false;
  private storage: ResilientStorageManager | null = null;
  private neuralMesh: IPrunableNeuralMesh | null = null;

  // Timers
  private neuromodulationTimer: ReturnType<typeof setInterval> | null = null;
  private adaptationTimer: ReturnType<typeof setInterval> | null = null;

  constructor(config?: Partial<VitalSystemsConfig>) {
    this.config = {
      contextType: 'background',
      enableNeuromodulation: true,
      enableBackpressure: true,
      enableCircadianCycle: true,
      enableSynapticPruning: true,
      enableEpigenetics: true,
      autoStart: true,
      ...config
    };

    if (this.config.autoStart) {
      this.initialize();
    }
  }

  /**
   * Initialise tous les systèmes vitaux
   */
  async initialize(): Promise<void> {
    if (this.isRunning) {
      logger.warn('[VitalSystems] Already running');
      return;
    }

    logger.info('[VitalSystems] Initializing...', this.config);

    try {
      // Initialiser le storage résilient
      this.storage = createResilientStorage(this.config.contextType);
      await this.storage.initialize();

      // Démarrer le cycle circadien
      if (this.config.enableCircadianCycle) {
        await circadianCycle.start();
        this.setupCircadianTasks();
      }

      // Démarrer les mises à jour de neuromodulation
      if (this.config.enableNeuromodulation) {
        this.startNeuromodulationLoop();
      }

      // Démarrer l'adaptation épigénétique
      if (this.config.enableEpigenetics) {
        this.startAdaptationLoop();
      }

      this.isRunning = true;
      logger.info('[VitalSystems] Initialized successfully');

      // Signaler le succès au système de neuromodulation
      neuromodulation.processEvent('success');

    } catch (error) {
      logger.error('[VitalSystems] Initialization failed', error);
      neuromodulation.processEvent('failure');
      throw error;
    }
  }

  /**
   * Configure les tâches pour le cycle circadien
   */
  private setupCircadianTasks(): void {
    // Tâche de pruning synaptique (en mode rêve)
    if (this.config.enableSynapticPruning) {
      circadianCycle.registerPeriodicTask(
        'synaptic_pruning',
        3600000, // 1 heure
        {
          type: 'pruning',
          priority: 5,
          estimatedDuration: 5000,
          execute: async () => {
            if (this.neuralMesh) {
              await synapticPruning.prune(this.neuralMesh);
            }
          }
        }
      );
    }

    // Tâche de consolidation mémoire (en mode sommeil)
    circadianCycle.registerPeriodicTask(
      'memory_consolidation',
      1800000, // 30 minutes
      {
        type: 'consolidation',
        priority: 7,
        estimatedDuration: 3000,
        execute: async () => {
          if (this.storage) {
            await this.storage.forceFlush();
          }
        }
      }
    );

    // Tâche de cleanup (en mode rêve)
    circadianCycle.registerPeriodicTask(
      'cache_cleanup',
      7200000, // 2 heures
      {
        type: 'cleanup',
        priority: 3,
        estimatedDuration: 2000,
        execute: async () => {
          // Le LRU du storage gère automatiquement le cleanup
          logger.info('[VitalSystems] Cache cleanup task executed');
        }
      }
    );

    // Écouter les changements de phase
    circadianCycle.onPhaseChange((newPhase, previousPhase) => {
      this.onCircadianPhaseChange(newPhase, previousPhase);
    });
  }

  /**
   * Gère les changements de phase circadienne
   */
  private onCircadianPhaseChange(newPhase: CircadianPhase, previousPhase: CircadianPhase): void {
    logger.info('[VitalSystems] Circadian phase change', { from: previousPhase, to: newPhase });

    switch (newPhase) {
      case 'active':
        // Réveiller tous les systèmes
        neuromodulation.processEvent('novelty', 0.3);
        break;

      case 'idle':
        // Commencer à économiser de l'énergie
        neuromodulation.processEvent('relaxation', 0.3);
        break;

      case 'sleep':
        // Mode économie d'énergie
        neuromodulation.processEvent('relaxation', 0.6);
        softwareEpigenetics.adapt();
        break;

      case 'dream':
        // Mode consolidation maximale
        neuromodulation.processEvent('relaxation', 1.0);
        this.triggerDreamProcessing();
        break;
    }
  }

  /**
   * Déclenche le traitement en mode rêve
   */
  private async triggerDreamProcessing(): Promise<void> {
    if (!circadianCycle.canPerformArchival()) return;

    logger.info('[VitalSystems] Dream processing started');

    // Élagage synaptique intensif
    if (this.neuralMesh && this.config.enableSynapticPruning) {
      await synapticPruning.prune(this.neuralMesh);
    }

    // Flush du storage
    if (this.storage) {
      await this.storage.forceFlush();
    }

    logger.info('[VitalSystems] Dream processing completed');
  }

  /**
   * Démarre la boucle de neuromodulation
   */
  private startNeuromodulationLoop(): void {
    // Mise à jour toutes les secondes
    this.neuromodulationTimer = setInterval(() => {
      neuromodulation.update();

      // Vérifier si on doit passer en mode crise
      if (neuromodulation.isStressed() && backpressureController.getLevel() === 'critical') {
        neuromodulation.processEvent('resource_crisis');
      }
    }, 1000);
  }

  /**
   * Démarre la boucle d'adaptation épigénétique
   */
  private startAdaptationLoop(): void {
    // Adaptation toutes les 30 secondes
    this.adaptationTimer = setInterval(() => {
      softwareEpigenetics.adapt();
    }, 30000);
  }

  /**
   * Enregistre le NeuralMesh pour le pruning
   */
  setNeuralMesh(mesh: IPrunableNeuralMesh): void {
    this.neuralMesh = mesh;
  }

  /**
   * Signale une activité utilisateur
   */
  recordUserActivity(): void {
    circadianCycle.recordActivity();
    neuromodulation.processEvent('novelty', 0.1);
  }

  /**
   * Signale un événement positif
   */
  recordPositiveEvent(type: 'reward' | 'success' | 'social' = 'success'): void {
    neuromodulation.processEvent(type);
  }

  /**
   * Signale un événement négatif
   */
  recordNegativeEvent(type: 'failure' | 'stress' | 'punishment' = 'failure'): void {
    neuromodulation.processEvent(type);
  }

  /**
   * Retourne le storage résilient
   */
  getStorage(): ResilientStorageManager | null {
    return this.storage;
  }

  /**
   * Retourne le statut de tous les systèmes
   */
  getStatus(): VitalSystemsStatus {
    const levels = neuromodulation.getLevels();
    const profile = softwareEpigenetics.getProfile();
    const storageHealth = this.storage?.getHealth();

    return {
      isRunning: this.isRunning,
      circadianPhase: circadianCycle.getPhase(),
      backpressureLevel: backpressureController.getLevel(),
      neuromodulatorLevels: {
        dopamine: levels.dopamine,
        adrenaline: levels.adrenaline,
        serotonin: levels.serotonin,
        cortisol: levels.cortisol
      },
      activeFeatures: profile.activeGenes.length,
      silencedFeatures: profile.silencedGenes.length,
      storageHealth: {
        isHealthy: storageHealth?.isHealthy ?? false,
        cacheSize: storageHealth?.cacheSize ?? 0,
        pendingWrites: storageHealth?.pendingWrites ?? 0
      }
    };
  }

  /**
   * Vérifie si une feature est active
   */
  isFeatureActive(featureId: string): boolean {
    return softwareEpigenetics.isFeatureActive(featureId);
  }

  /**
   * Obtient le multiplicateur de fréquence pour les opérations périodiques
   */
  getFrequencyMultiplier(): number {
    const circadianMultiplier = circadianCycle.getFrequencyMultiplier();
    const backpressureMultiplier = 1 / backpressureController.getThrottleMultiplier();

    return Math.min(circadianMultiplier, backpressureMultiplier);
  }

  /**
   * Arrête tous les systèmes vitaux
   */
  async shutdown(): Promise<void> {
    if (!this.isRunning) return;

    logger.info('[VitalSystems] Shutting down...');

    // Arrêter les timers
    if (this.neuromodulationTimer) {
      clearInterval(this.neuromodulationTimer);
      this.neuromodulationTimer = null;
    }

    if (this.adaptationTimer) {
      clearInterval(this.adaptationTimer);
      this.adaptationTimer = null;
    }

    // Arrêter le cycle circadien
    circadianCycle.stop();

    // Arrêter le storage
    if (this.storage) {
      await this.storage.destroy();
      this.storage = null;
    }

    // Nettoyer le backpressure
    backpressureController.reset();

    this.isRunning = false;
    logger.info('[VitalSystems] Shutdown complete');
  }

  /**
   * Sérialise l'état pour la persistance
   */
  serialize(): {
    neuromodulation: ReturnType<typeof neuromodulation.serialize>;
    circadianCycle: ReturnType<typeof circadianCycle.serialize>;
    synapticPruning: ReturnType<typeof synapticPruning.serialize>;
    epigenetics: ReturnType<typeof softwareEpigenetics.serialize>;
  } {
    return {
      neuromodulation: neuromodulation.serialize(),
      circadianCycle: circadianCycle.serialize(),
      synapticPruning: synapticPruning.serialize(),
      epigenetics: softwareEpigenetics.serialize()
    };
  }

  /**
   * Restaure l'état depuis la persistance
   */
  deserialize(state: {
    neuromodulation?: ReturnType<typeof neuromodulation.serialize>;
    circadianCycle?: ReturnType<typeof circadianCycle.serialize>;
    synapticPruning?: ReturnType<typeof synapticPruning.serialize>;
    epigenetics?: ReturnType<typeof softwareEpigenetics.serialize>;
  }): void {
    if (state.neuromodulation) {
      neuromodulation.deserialize(state.neuromodulation);
    }
    if (state.circadianCycle) {
      circadianCycle.deserialize(state.circadianCycle);
    }
    if (state.synapticPruning) {
      synapticPruning.deserialize(state.synapticPruning);
    }
    if (state.epigenetics) {
      softwareEpigenetics.deserialize(state.epigenetics);
    }
  }
}

// Singleton par défaut pour le contexte background
let defaultInstance: OrganismVitalSystems | null = null;

export function getVitalSystems(config?: Partial<VitalSystemsConfig>): OrganismVitalSystems {
  if (!defaultInstance) {
    defaultInstance = new OrganismVitalSystems(config);
  }
  return defaultInstance;
}

export function resetVitalSystems(): void {
  if (defaultInstance) {
    defaultInstance.shutdown();
    defaultInstance = null;
  }
}
