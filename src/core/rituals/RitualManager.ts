/**
 * RitualManager.ts
 * Gestionnaire central des rituels avec patterns avancés
 * Circuit Breaker, Rate Limiting, Priority Queue
 */

import { IRitual, RitualType, RitualStatus, RitualContext, RitualResult } from './interfaces/IRitual';
import { MessageBus, MessageType } from '@/shared/messaging/MessageBus';
import { logger } from '@/shared/utils/secureLogger';
import { CircuitBreaker } from '@/shared/patterns/CircuitBreaker';
import { RateLimiter } from '@/shared/patterns/RateLimiter';

interface RitualQueueItem {
  ritual: IRitual;
  context: RitualContext;
  priority: number;
  timestamp: number;
  retries: number;
}

export class RitualManager {
  private static instance: RitualManager | null = null;
  private rituals: Map<string, IRitual> = new Map();
  private executionQueue: RitualQueueItem[] = [];
  private activeExecutions: Map<string, Promise<RitualResult>> = new Map();
  private circuitBreakers: Map<string, CircuitBreaker> = new Map();
  private rateLimiters: Map<string, RateLimiter> = new Map();
  private messageBus: MessageBus;
  private isProcessing: boolean = false;

  // Configuration
  private readonly config = {
    maxConcurrentExecutions: 3,
    maxQueueSize: 50,
    defaultTimeout: 30000,
    retryAttempts: 2,
    circuitBreakerThreshold: 5,
    circuitBreakerTimeout: 60000,
    rateLimitPerMinute: 10
  };

  private constructor() {
    this.messageBus = new MessageBus('ritual-manager');
    this.initializeEventListeners();
    this.startQueueProcessor();
  }

  /**
   * Singleton pattern avec lazy loading
   */
  public static getInstance(): RitualManager {
    if (!RitualManager.instance) {
      RitualManager.instance = new RitualManager();
    }
    return RitualManager.instance;
  }

  /**
   * Enregistre un nouveau rituel
   */
  public registerRitual(ritual: IRitual): void {
    const existingRitual = this.rituals.get(ritual.id);
    if (existingRitual) {
      logger.warn(`[RitualManager] Ritual ${ritual.id} already registered, replacing`);
    }

    this.rituals.set(ritual.id, ritual);

    // Initialiser le circuit breaker pour ce rituel
    this.circuitBreakers.set(ritual.id, new CircuitBreaker({
      failureThreshold: this.config.circuitBreakerThreshold,
      resetTimeout: this.config.circuitBreakerTimeout,
      monitoringPeriod: 60000
    }));

    // Initialiser le rate limiter
    this.rateLimiters.set(ritual.id, new RateLimiter({
      maxRequests: ritual.maxExecutionsPerHour,
      windowMs: 3600000 // 1 heure
    }));

    logger.info(`[RitualManager] Registered ritual: ${ritual.name} (${ritual.id})`);
  }

  /**
   * Déclenche un rituel si les conditions sont remplies
   */
  public async triggerRitual(
    ritualType: RitualType,
    context: RitualContext
  ): Promise<RitualResult | null> {
    try {
      // Trouver tous les rituels de ce type
      const eligibleRituals = Array.from(this.rituals.values())
        .filter(r => r.type === ritualType && r.canTrigger(context))
        .sort((a, b) => b.priority - a.priority);

      if (eligibleRituals.length === 0) {
        logger.debug(`[RitualManager] No eligible rituals for type ${ritualType}`);
        return null;
      }

      const ritual = eligibleRituals[0];

      // Vérifier le circuit breaker
      const circuitBreaker = this.circuitBreakers.get(ritual.id);
      if (circuitBreaker && !circuitBreaker.canExecute()) {
        logger.warn(`[RitualManager] Circuit breaker open for ritual ${ritual.id}`);
        return {
          success: false,
          status: RitualStatus.FAILED,
          effects: [],
          metrics: { executionTime: 0, resourcesUsed: 0, impactScore: 0 },
          message: 'Circuit breaker is open - too many recent failures'
        };
      }

      // Vérifier le rate limiting
      const rateLimiter = this.rateLimiters.get(ritual.id);
      if (rateLimiter && !rateLimiter.tryConsume()) {
        logger.warn(`[RitualManager] Rate limit exceeded for ritual ${ritual.id}`);
        return {
          success: false,
          status: RitualStatus.FAILED,
          effects: [],
          metrics: { executionTime: 0, resourcesUsed: 0, impactScore: 0 },
          message: 'Rate limit exceeded'
        };
      }

      // Ajouter à la queue d'exécution
      return await this.enqueueRitual(ritual, context);

    } catch (error) {
      logger.error('[RitualManager] Error triggering ritual:', error);
      return {
        success: false,
        status: RitualStatus.FAILED,
        effects: [],
        metrics: { executionTime: 0, resourcesUsed: 0, impactScore: 0 },
        error: error as Error
      };
    }
  }

  /**
   * Ajoute un rituel à la queue d'exécution
   */
  private async enqueueRitual(
    ritual: IRitual,
    context: RitualContext
  ): Promise<RitualResult> {
    // Vérifier si déjà en cours d'exécution
    const existingExecution = this.activeExecutions.get(ritual.id);
    if (existingExecution) {
      logger.info(`[RitualManager] Ritual ${ritual.id} already executing, waiting...`);
      return existingExecution;
    }

    // Vérifier la taille de la queue
    if (this.executionQueue.length >= this.config.maxQueueSize) {
      logger.warn('[RitualManager] Execution queue full, dropping oldest item');
      this.executionQueue.shift();
    }

    // Créer une promesse pour l'exécution
    const executionPromise = new Promise<RitualResult>((resolve, reject) => {
      const queueItem: RitualQueueItem = {
        ritual,
        context,
        priority: ritual.priority,
        timestamp: Date.now(),
        retries: 0
      };

      // Ajouter un timeout
      const timeoutId = setTimeout(() => {
        const index = this.executionQueue.findIndex(item => item === queueItem);
        if (index !== -1) {
          this.executionQueue.splice(index, 1);
          reject(new Error(`Ritual ${ritual.id} timed out`));
        }
      }, this.config.defaultTimeout);

      // Stocker la résolution pour usage ultérieur
      (queueItem as any).resolve = resolve;
      (queueItem as any).reject = reject;
      (queueItem as any).timeoutId = timeoutId;

      this.executionQueue.push(queueItem);
      this.executionQueue.sort((a, b) => b.priority - a.priority);
    });

    this.activeExecutions.set(ritual.id, executionPromise);

    // Nettoyer après exécution
    executionPromise.finally(() => {
      this.activeExecutions.delete(ritual.id);
    });

    return executionPromise;
  }

  /**
   * Processeur de queue asynchrone
   */
  private async startQueueProcessor(): Promise<void> {
    setInterval(async () => {
      if (this.isProcessing || this.executionQueue.length === 0) {
        return;
      }

      this.isProcessing = true;

      try {
        // Traiter jusqu'à maxConcurrentExecutions rituels
        const concurrentExecutions = Math.min(
          this.config.maxConcurrentExecutions,
          this.executionQueue.length
        );

        const itemsToProcess = this.executionQueue.splice(0, concurrentExecutions);

        await Promise.all(
          itemsToProcess.map(item => this.executeQueueItem(item))
        );

      } catch (error) {
        logger.error('[RitualManager] Queue processor error:', error);
      } finally {
        this.isProcessing = false;
      }
    }, 100); // Check every 100ms
  }

  /**
   * Exécute un élément de la queue
   */
  private async executeQueueItem(item: RitualQueueItem): Promise<void> {
    const { ritual, context } = item;
    const { resolve, reject, timeoutId } = item as any;

    try {
      clearTimeout(timeoutId);

      logger.info(`[RitualManager] Executing ritual: ${ritual.name}`);

      // Mettre à jour le statut
      ritual.status = RitualStatus.EXECUTING;

      // Notifier le début
      this.messageBus.send({
        type: MessageType.MURMUR,
        payload: {
          text: `Rituel "${ritual.name}" activé...`,
          severity: 'INFO',
          ritualId: ritual.id,
          timestamp: Date.now()
        }
      });

      // Exécuter le rituel
      const startTime = performance.now();
      const result = await ritual.execute(context);
      const executionTime = performance.now() - startTime;

      // Enrichir les métriques
      result.metrics.executionTime = executionTime;

      // Mettre à jour le circuit breaker
      const circuitBreaker = this.circuitBreakers.get(ritual.id);
      if (circuitBreaker) {
        if (result.success) {
          circuitBreaker.recordSuccess();
        } else {
          circuitBreaker.recordFailure();
        }
      }

      // Mettre à jour le rituel
      ritual.status = result.success ? RitualStatus.COMPLETED : RitualStatus.FAILED;
      ritual.lastExecutionTime = Date.now();
      ritual.executionCount++;

      // Notifier la fin
      this.messageBus.send({
        type: MessageType.MURMUR,
        payload: {
          text: result.message || `Rituel "${ritual.name}" ${result.success ? 'complété' : 'échoué'}`,
          severity: result.success ? 'SUCCESS' : 'ERROR',
          ritualId: ritual.id,
          timestamp: Date.now()
        }
      });

      // Enregistrer les métriques
      this.recordMetrics(ritual, result);

      resolve(result);

    } catch (error) {
      logger.error(`[RitualManager] Ritual ${ritual.id} execution failed:`, error);

      // Gérer les retry
      if (item.retries < this.config.retryAttempts) {
        logger.info(`[RitualManager] Retrying ritual ${ritual.id} (attempt ${item.retries + 1})`);
        item.retries++;
        this.executionQueue.unshift(item);
      } else {
        const result: RitualResult = {
          success: false,
          status: RitualStatus.FAILED,
          effects: [],
          metrics: { executionTime: 0, resourcesUsed: 0, impactScore: 0 },
          error: error as Error
        };

        ritual.status = RitualStatus.FAILED;
        reject(error);
      }
    }
  }

  /**
   * Enregistre les métriques d'exécution
   */
  private recordMetrics(ritual: IRitual, result: RitualResult): void {
    // Envoyer les métriques au système de monitoring
    this.messageBus.send({
      type: 'RITUAL_METRICS' as MessageType,
      payload: {
        ritualId: ritual.id,
        ritualType: ritual.type,
        success: result.success,
        executionTime: result.metrics.executionTime,
        resourcesUsed: result.metrics.resourcesUsed,
        impactScore: result.metrics.impactScore,
        timestamp: Date.now()
      }
    });
  }

  /**
   * Initialise les listeners d'événements
   */
  private initializeEventListeners(): void {
    // Écouter les demandes de déclenchement de rituels
    this.messageBus.on('TRIGGER_RITUAL' as MessageType, async (message: any) => {
      const { type, context } = message.payload;
      await this.triggerRitual(type, context);
    });

    // Écouter les changements de contexte pour auto-trigger
    this.messageBus.on('RESONANCE_UPDATE' as MessageType, async (message: any) => {
      const context = this.buildContextFromResonance(message.payload);

      // Vérifier tous les rituels pour auto-déclenchement
      for (const ritual of this.rituals.values()) {
        if (ritual.canTrigger(context)) {
          await this.triggerRitual(ritual.type, context);
        }
      }
    });
  }

  /**
   * Construit le contexte depuis les données de résonance
   */
  private buildContextFromResonance(resonanceData: any): RitualContext {
    return {
      organism: resonanceData.organism || {} as any,
      resonanceLevel: resonanceData.resonanceLevel || 0,
      networkPressure: resonanceData.networkPressure || 0,
      domOppression: resonanceData.domOppression || 0,
      frictionIndex: resonanceData.frictionIndex || 0,
      timestamp: Date.now(),
      metadata: resonanceData
    };
  }

  /**
   * Obtient les métriques globales
   */
  public getGlobalMetrics(): {
    totalRituals: number;
    activeExecutions: number;
    queueSize: number;
    successRate: number;
    circuitBreakerStatus: Record<string, boolean>;
  } {
    let totalSuccess = 0;
    let totalExecutions = 0;
    const circuitBreakerStatus: Record<string, boolean> = {};

    for (const [id, ritual] of this.rituals) {
      const metrics = ritual.getMetrics();
      totalSuccess += metrics.successRate * ritual.executionCount;
      totalExecutions += ritual.executionCount;

      const breaker = this.circuitBreakers.get(id);
      if (breaker) {
        circuitBreakerStatus[id] = breaker.getState() === 'CLOSED';
      }
    }

    return {
      totalRituals: this.rituals.size,
      activeExecutions: this.activeExecutions.size,
      queueSize: this.executionQueue.length,
      successRate: totalExecutions > 0 ? totalSuccess / totalExecutions : 0,
      circuitBreakerStatus
    };
  }

  /**
   * Arrête tous les rituels en cours
   */
  public async shutdown(): Promise<void> {
    logger.info('[RitualManager] Shutting down...');

    // Annuler tous les rituels en queue
    this.executionQueue = [];

    // Annuler les rituels actifs
    for (const [id, ritual] of this.rituals) {
      if (ritual.status === RitualStatus.EXECUTING) {
        await ritual.cancel();
      }
    }

    // Attendre que toutes les exécutions se terminent
    await Promise.allSettled(Array.from(this.activeExecutions.values()));

    logger.info('[RitualManager] Shutdown complete');
  }
}