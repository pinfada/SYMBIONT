/**
 * RitualBootstrap.ts
 * Initialisation et intégration complète du système de rituels
 * Point d'entrée unique pour les rituels de décodage
 */

import { RitualManager } from './RitualManager';
import { RitualVisualEffectsManager } from './RitualVisualEffects';
import { TemporalDephasingRitual } from './implementations/TemporalDephasingRitual';
import { SimplifiedFrequencyCommunionRitual } from './implementations/SimplifiedFrequencyCommunionRitual';
import { StructureInstinctRitual } from './implementations/StructureInstinctRitual';
import { MurmureService } from '@/background/services/MurmureService';
import { MessageBus, MessageType } from '@/shared/messaging/MessageBus';
import { logger } from '@/shared/utils/secureLogger';
import { RitualType, RitualContext } from './interfaces/IRitual';

export class RitualBootstrap {
  private static instance: RitualBootstrap | null = null;
  private ritualManager: RitualManager;
  private visualEffectsManager: RitualVisualEffectsManager;
  private murmureService: MurmureService;
  private messageBus: MessageBus;
  private isInitialized: boolean = false;

  // Configuration des messages de feedback
  private readonly ritualMessages = {
    [RitualType.TEMPORAL_DEPHASING]: {
      start: "Initiation du déphasage temporel... Les trackers perdent votre signal.",
      success: "Déphasage réussi. Vous êtes devenu vaporeux dans le flux des données.",
      failure: "Le déphasage a échoué. Les structures de surveillance résistent."
    },
    [RitualType.FREQUENCY_COMMUNION]: {
      start: "Établissement de la communion de fréquence... Connexion au réseau P2P.",
      success: "Communion établie. Vos données transitent par la maille collective.",
      failure: "La communion a échoué. Le réseau P2P n'est pas accessible."
    },
    [RitualType.STRUCTURE_INSTINCT]: {
      start: "Éveil de l'instinct de structure... Analyse sémantique profonde en cours.",
      success: "Instinct éveillé. Des connexions cachées ont été révélées.",
      failure: "L'éveil a échoué. La structure reste opaque."
    }
  };

  private constructor() {
    this.ritualManager = RitualManager.getInstance();
    this.visualEffectsManager = RitualVisualEffectsManager.getInstance();
    this.murmureService = new MurmureService();
    this.messageBus = new MessageBus('ritual-bootstrap');
  }

  /**
   * Singleton pattern
   */
  public static getInstance(): RitualBootstrap {
    if (!RitualBootstrap.instance) {
      RitualBootstrap.instance = new RitualBootstrap();
    }
    return RitualBootstrap.instance;
  }

  /**
   * Initialise le système de rituels
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      logger.warn('[RitualBootstrap] Already initialized');
      return;
    }

    try {
      logger.info('[RitualBootstrap] Initializing ritual system...');

      // 1. Enregistrer les rituels
      await this.registerRituals();

      // 2. Configurer les listeners
      this.setupEventListeners();

      // 3. Configurer l'intégration avec les murmures
      this.setupMurmureIntegration();

      // 4. Configurer le monitoring
      this.setupMonitoring();

      // 5. Charger la configuration sauvegardée
      await this.loadConfiguration();

      this.isInitialized = true;
      logger.info('[RitualBootstrap] Ritual system initialized successfully');

      // Envoyer un murmure de bienvenue
      this.sendMurmure(
        "Les rituels de décodage sont maintenant actifs. L'organisme peut voir au-delà du voile.",
        'SUCCESS'
      );

    } catch (error) {
      logger.error('[RitualBootstrap] Initialization failed:', error);
      throw error;
    }
  }

  /**
   * Enregistre tous les rituels disponibles
   */
  private async registerRituals(): Promise<void> {
    // Rituels de base
    const rituals = [
      new TemporalDephasingRitual(),
      new SimplifiedFrequencyCommunionRitual(),
      new StructureInstinctRitual()
    ];

    for (const ritual of rituals) {
      this.ritualManager.registerRitual(ritual);
      logger.info(`[RitualBootstrap] Registered ritual: ${ritual.name}`);
    }
  }

  /**
   * Configure les listeners d'événements
   */
  private setupEventListeners(): void {
    // Écouter les demandes de déclenchement manuel
    this.messageBus.on('TRIGGER_DECODING_RITUAL' as MessageType, async (message: any) => {
      const { type, reason } = message.payload;
      await this.triggerRitual(type, reason);
    });

    // Écouter les mises à jour de résonance pour déclenchement automatique
    this.messageBus.on(MessageType.RESONANCE_UPDATE, async (message: any) => {
      const context = this.buildRitualContext(message.payload);
      await this.checkAutomaticTriggers(context);
    });

    // Écouter les résultats des rituels
    this.messageBus.on('RITUAL_COMPLETED' as MessageType, (message: any) => {
      this.handleRitualCompletion(message.payload);
    });

    this.messageBus.on('RITUAL_FAILED' as MessageType, (message: any) => {
      this.handleRitualFailure(message.payload);
    });
  }

  /**
   * Configure l'intégration avec le système de murmures
   */
  private setupMurmureIntegration(): void {
    // Intercepter les événements de rituels pour générer des murmures contextuels
    const originalTrigger = this.ritualManager.triggerRitual.bind(this.ritualManager);

    (this.ritualManager as any).triggerRitual = async (type: RitualType, context: RitualContext) => {
      // Murmure de début
      this.sendRitualMurmure(type, 'start');

      const result = await originalTrigger(type, context);

      // Murmure de résultat
      if (result) {
        this.sendRitualMurmure(type, result.success ? 'success' : 'failure');
      }

      return result;
    };
  }

  /**
   * Configure le monitoring et les métriques
   */
  private setupMonitoring(): void {
    // Rapport périodique des métriques
    setInterval(() => {
      const metrics = this.ritualManager.getGlobalMetrics();

      if (metrics.activeExecutions > 0 || metrics.queueSize > 0) {
        logger.info('[RitualBootstrap] Ritual metrics:', metrics);
      }

      // Alerter si le système est surchargé
      if (metrics.queueSize > 10) {
        this.sendMurmure(
          "Le système de rituels est surchargé. Certaines protections peuvent être retardées.",
          'WARNING'
        );
      }

      // Vérifier la santé des circuit breakers
      const openBreakers = Object.entries(metrics.circuitBreakerStatus)
        .filter(([_, isHealthy]) => !isHealthy)
        .map(([id]) => id);

      if (openBreakers.length > 0) {
        logger.warn('[RitualBootstrap] Circuit breakers open:', openBreakers);
      }

    }, 60000); // Toutes les minutes
  }

  /**
   * Charge la configuration sauvegardée
   */
  private async loadConfiguration(): Promise<void> {
    try {
      const config = await chrome.storage.local.get('ritualConfig');

      if (config.ritualConfig) {
        logger.info('[RitualBootstrap] Loaded saved configuration:', config.ritualConfig);
        // Appliquer la configuration
        // TODO: Implémenter la configuration personnalisée
      }
    } catch (error) {
      logger.error('[RitualBootstrap] Failed to load configuration:', error);
    }
  }

  /**
   * Déclenche un rituel manuellement
   */
  public async triggerRitual(type: RitualType, reason?: string): Promise<void> {
    logger.info(`[RitualBootstrap] Manual trigger requested for ${type}`, { reason });

    // Construire le contexte actuel
    const context = await this.getCurrentContext();

    // Déclencher via le manager
    const result = await this.ritualManager.triggerRitual(type, context);

    if (result) {
      logger.info(`[RitualBootstrap] Ritual ${type} triggered successfully`);
    } else {
      logger.warn(`[RitualBootstrap] Ritual ${type} could not be triggered`);
    }
  }

  /**
   * Vérifie les déclencheurs automatiques
   */
  private async checkAutomaticTriggers(context: RitualContext): Promise<void> {
    // Le RitualManager gère déjà la vérification automatique
    // Cette méthode peut être étendue pour des logiques supplémentaires

    // Conditions spéciales combinées
    if (context.frictionIndex > 0.8 && context.networkPressure > 0.7) {
      logger.info('[RitualBootstrap] Critical conditions detected, forcing ritual cascade');

      // Déclencher les rituels en cascade
      await this.ritualManager.triggerRitual(RitualType.TEMPORAL_DEPHASING, context);

      setTimeout(async () => {
        await this.ritualManager.triggerRitual(RitualType.FREQUENCY_COMMUNION, context);
      }, 5000);
    }
  }

  /**
   * Construit le contexte actuel pour les rituels
   */
  private async getCurrentContext(): Promise<RitualContext> {
    // Récupérer l'organisme actuel
    const organismData = await chrome.storage.local.get('currentOrganism');
    const organism = organismData.currentOrganism || this.createDefaultOrganism();

    // Récupérer les métriques de résonance
    const resonanceData = await chrome.storage.local.get('resonanceMetrics');
    const resonance = resonanceData.resonanceMetrics || {};

    return {
      organism,
      resonanceLevel: resonance.level || 0,
      networkPressure: resonance.networkPressure || 0,
      domOppression: resonance.domOppression || 0,
      frictionIndex: resonance.frictionIndex || 0,
      timestamp: Date.now(),
      metadata: {
        source: 'manual_trigger',
        ...resonance
      }
    };
  }

  /**
   * Construit le contexte depuis les données de résonance
   */
  private buildRitualContext(resonanceData: any): RitualContext {
    return {
      organism: resonanceData.organism || this.createDefaultOrganism(),
      resonanceLevel: resonanceData.resonanceLevel || 0,
      networkPressure: resonanceData.networkPressure || 0,
      domOppression: resonanceData.domOppression || 0,
      frictionIndex: resonanceData.frictionIndex || 0,
      timestamp: Date.now(),
      metadata: resonanceData
    };
  }

  /**
   * Crée un organisme par défaut
   */
  private createDefaultOrganism(): any {
    return {
      id: 'default',
      generation: 1,
      dna: '',
      traits: {
        curiosity: 50,
        focus: 50,
        rhythm: 50,
        empathy: 50,
        creativity: 50,
        resilience: 50,
        adaptability: 50,
        memory: 50,
        intuition: 50
      },
      consciousness: 50,
      energy: 75,
      lastMutation: Date.now()
    };
  }

  /**
   * Gère la complétion d'un rituel
   */
  private handleRitualCompletion(payload: any): void {
    const { ritualType, result } = payload;

    logger.info(`[RitualBootstrap] Ritual ${ritualType} completed`, result);

    // Sauvegarder les statistiques
    this.updateRitualStatistics(ritualType, true, result.metrics);

    // Déclencher des actions post-rituel si nécessaire
    if (result.effects.some((e: any) => e.type === 'ORGANISM')) {
      this.messageBus.send({
        type: MessageType.ORGANISM_UPDATE,
        payload: { updateType: 'ritual_mutation' }
      });
    }
  }

  /**
   * Gère l'échec d'un rituel
   */
  private handleRitualFailure(payload: any): void {
    const { ritualType, error } = payload;

    logger.error(`[RitualBootstrap] Ritual ${ritualType} failed`, error);

    // Sauvegarder les statistiques
    this.updateRitualStatistics(ritualType, false, {});

    // Envoyer une alerte
    this.sendMurmure(
      `Le rituel "${this.getRitualName(ritualType)}" a échoué. L'organisme reste vulnérable.`,
      'ERROR'
    );
  }

  /**
   * Met à jour les statistiques des rituels
   */
  private async updateRitualStatistics(
    type: RitualType,
    success: boolean,
    metrics: any
  ): Promise<void> {
    try {
      const stats = await chrome.storage.local.get('ritualStatistics') || {};
      const ritualStats = stats.ritualStatistics || {};

      if (!ritualStats[type]) {
        ritualStats[type] = {
          executions: 0,
          successes: 0,
          failures: 0,
          totalExecutionTime: 0,
          lastExecution: 0
        };
      }

      ritualStats[type].executions++;
      if (success) {
        ritualStats[type].successes++;
      } else {
        ritualStats[type].failures++;
      }
      ritualStats[type].totalExecutionTime += metrics.executionTime || 0;
      ritualStats[type].lastExecution = Date.now();

      await chrome.storage.local.set({ ritualStatistics: ritualStats });

    } catch (error) {
      logger.error('[RitualBootstrap] Failed to update statistics:', error);
    }
  }

  /**
   * Envoie un murmure contextuel pour un rituel
   */
  private sendRitualMurmure(type: RitualType, phase: 'start' | 'success' | 'failure'): void {
    const messages = this.ritualMessages[type];
    if (messages) {
      const message = messages[phase];
      const severity = phase === 'success' ? 'SUCCESS' :
                       phase === 'failure' ? 'ERROR' : 'INFO';
      this.sendMurmure(message, severity);
    }
  }

  /**
   * Envoie un murmure
   */
  private sendMurmure(text: string, severity: string = 'INFO'): void {
    const murmure = this.murmureService.generateMurmur();

    // Combiner avec le message spécifique si pertinent
    const finalMessage = severity === 'INFO' ? murmure : text;

    this.messageBus.send({
      type: MessageType.MURMUR,
      payload: {
        text: finalMessage,
        severity,
        source: 'ritual_system',
        timestamp: Date.now()
      }
    });
  }

  /**
   * Obtient le nom d'un rituel
   */
  private getRitualName(type: RitualType): string {
    const names = {
      [RitualType.TEMPORAL_DEPHASING]: 'Déphasage Temporel',
      [RitualType.FREQUENCY_COMMUNION]: 'Communion de Fréquence',
      [RitualType.STRUCTURE_INSTINCT]: 'Instinct de Structure'
    };
    return names[type] || 'Rituel Inconnu';
  }

  /**
   * Obtient les statistiques globales
   */
  public async getStatistics(): Promise<any> {
    const managerMetrics = this.ritualManager.getGlobalMetrics();
    const stats = await chrome.storage.local.get('ritualStatistics');

    return {
      manager: managerMetrics,
      rituals: stats.ritualStatistics || {},
      activeEffects: this.visualEffectsManager.getActiveEffects().size
    };
  }

  /**
   * Arrête le système de rituels
   */
  public async shutdown(): Promise<void> {
    logger.info('[RitualBootstrap] Shutting down ritual system...');

    await this.ritualManager.shutdown();
    this.visualEffectsManager.clearAllEffects();

    this.sendMurmure(
      "Les rituels de décodage sont désactivés. L'organisme retourne à son état naturel.",
      'INFO'
    );

    this.isInitialized = false;
    logger.info('[RitualBootstrap] Ritual system shut down');
  }
}

// Export pour utilisation globale
export const initializeRituals = async (): Promise<RitualBootstrap> => {
  const bootstrap = RitualBootstrap.getInstance();
  await bootstrap.initialize();
  return bootstrap;
};