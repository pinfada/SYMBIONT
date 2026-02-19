/**
 * TemporalDephasingRitual.ts
 * Rituel de Déphasage Temporel - Counter-Tracking
 * Injecte des micro-latences et du bruit structurel pour protéger la vie privée
 */

import {
  IRitual,
  RitualType,
  RitualStatus,
  RitualTriggerCondition,
  RitualContext,
  RitualResult,
  RitualMetrics,
  RitualHealth
} from '../interfaces/IRitual';
import { logger } from '@/shared/utils/secureLogger';
import { SecureRandom } from '@/shared/utils/secureRandom';
import { MessageBus, MessageType } from '@/shared/messaging/MessageBus';

interface TrackerPattern {
  domain: string;
  selector?: string;
  method: 'xhr' | 'fetch' | 'img' | 'script';
  confidence: number;
}

export class TemporalDephasingRitual implements IRitual {
  public readonly id = 'temporal-dephasing-001';
  public readonly type = RitualType.TEMPORAL_DEPHASING;
  public readonly name = 'Déphasage Temporel';
  public readonly description = 'Protection contre le tracking par injection de latences et bruit structurel';

  public readonly triggers: RitualTriggerCondition[] = [
    {
      type: 'THRESHOLD',
      metric: 'frictionIndex',
      operator: '>',
      value: 0.7,
      cooldownMs: 300000 // 5 minutes
    },
    {
      type: 'PATTERN',
      metric: 'shadowActivity',
      operator: '>',
      value: 10,
      cooldownMs: 300000
    }
  ];

  public readonly priority = 8;
  public readonly maxExecutionsPerHour = 12;
  public readonly requiresUserConsent = false;

  public status: RitualStatus = RitualStatus.IDLE;
  public lastExecutionTime = 0;
  public executionCount = 0;

  private messageBus: MessageBus;
  private activeInterceptors: Map<string, any> = new Map();
  private metrics = {
    totalInterceptions: 0,
    totalLatencyInjected: 0,
    totalNoiseInjected: 0,
    trackersPoisoned: new Set<string>()
  };

  constructor() {
    this.messageBus = new MessageBus('temporal-dephasing-ritual');
  }

  /**
   * Vérifie si le rituel peut être déclenché
   */
  public canTrigger(context: RitualContext): boolean {
    // Vérifier le cooldown
    const now = Date.now();
    const timeSinceLastExecution = now - this.lastExecutionTime;
    const minCooldown = Math.min(...this.triggers.map(t => t.cooldownMs || 0));

    if (timeSinceLastExecution < minCooldown) {
      return false;
    }

    // Vérifier les conditions
    for (const trigger of this.triggers) {
      if (this.evaluateTrigger(trigger, context)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Exécute le rituel
   */
  public async execute(context: RitualContext): Promise<RitualResult> {
    try {
      this.status = RitualStatus.EXECUTING;
      const startTime = performance.now();

      logger.info('[TemporalDephasing] Starting ritual execution', {
        frictionIndex: context.frictionIndex,
        domOppression: context.domOppression
      });

      // Phase 1: Identifier les trackers
      const trackers = await this.identifyTrackers();
      logger.info(`[TemporalDephasing] Identified ${trackers.length} potential trackers`);

      // Phase 2: Injecter les contre-mesures
      const interceptorResults = await Promise.all([
        this.injectNetworkLatency(trackers),
        this.injectDOMNoise(),
        this.poisonFingerprinting()
      ]);

      // Phase 3: Activer l'effet visuel
      await this.activateVisualEffect(context);

      // Calculer les métriques
      const executionTime = performance.now() - startTime;
      const impactScore = this.calculateImpactScore(trackers.length);

      this.status = RitualStatus.COMPLETED;
      this.lastExecutionTime = Date.now();
      this.executionCount++;

      return {
        success: true,
        status: RitualStatus.COMPLETED,
        effects: [
          {
            type: 'NETWORK',
            target: 'trackers',
            duration: 300000, // 5 minutes
            intensity: 0.8,
            reversible: true
          },
          {
            type: 'DOM',
            target: 'mutation_observers',
            duration: 300000,
            intensity: 0.6,
            reversible: true
          },
          {
            type: 'VISUAL',
            target: 'organism',
            duration: 10000,
            intensity: 0.7,
            reversible: true
          }
        ],
        metrics: {
          executionTime,
          resourcesUsed: trackers.length * 10,
          impactScore
        },
        message: `Déphasage temporel activé : ${trackers.length} trackers neutralisés`
      };

    } catch (error) {
      logger.error('[TemporalDephasing] Ritual execution failed:', error);
      this.status = RitualStatus.FAILED;

      return {
        success: false,
        status: RitualStatus.FAILED,
        effects: [],
        metrics: {
          executionTime: 0,
          resourcesUsed: 0,
          impactScore: 0
        },
        error: error as Error
      };
    }
  }

  /**
   * Identifie les trackers potentiels
   */
  private async identifyTrackers(): Promise<TrackerPattern[]> {
    const knownTrackers: TrackerPattern[] = [
      { domain: 'google-analytics.com', method: 'script', confidence: 0.95 },
      { domain: 'googletagmanager.com', method: 'script', confidence: 0.95 },
      { domain: 'doubleclick.net', method: 'img', confidence: 0.9 },
      { domain: 'facebook.com/tr', method: 'img', confidence: 0.9 },
      { domain: 'analytics', method: 'xhr', confidence: 0.8 },
      { domain: 'telemetry', method: 'fetch', confidence: 0.8 },
      { domain: 'tracking', method: 'xhr', confidence: 0.85 },
      { domain: 'metrics', method: 'fetch', confidence: 0.7 }
    ];

    // Envoyer un message au content script pour analyser la page
    return new Promise((resolve) => {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]?.id) {
          chrome.tabs.sendMessage(
            tabs[0].id,
            { type: 'ANALYZE_TRACKERS' },
            (response) => {
              const detectedTrackers = response?.trackers || [];
              resolve([...knownTrackers, ...detectedTrackers]);
            }
          );
        } else {
          resolve(knownTrackers);
        }
      });
    });
  }

  /**
   * Injecte des latences aléatoires dans les requêtes réseau
   */
  private async injectNetworkLatency(trackers: TrackerPattern[]): Promise<void> {
    // Envoyer les patterns de trackers au content script
    const trackerPatterns = trackers.map(t => t.domain);

    // Envoyer un message au content script pour activer les contre-mesures
    const tabs = await chrome.tabs.query({ active: true });
    for (const tab of tabs) {
      if (tab.id && !tab.url?.startsWith('chrome://')) {
        chrome.tabs.sendMessage(tab.id, {
          type: MessageType.INJECT_COUNTERMEASURE,
          payload: {
            countermeasure: 'NETWORK_LATENCY',
            trackerPatterns,
            config: {
              minDelay: 500,
              maxDelay: 2500,
              duration: 300000 // 5 minutes
            }
          }
        }).catch(error => {
          logger.warn(`[TemporalDephasing] Could not inject latency in tab ${tab.id}:`, error);
        });
      }
    }

    this.metrics.totalInterceptions += trackers.length;
  }

  /**
   * Injecte du bruit dans les MutationObservers
   */
  private async injectDOMNoise(): Promise<void> {
    // Envoyer un message au content script pour activer le bruit DOM
    const tabs = await chrome.tabs.query({ active: true });
    for (const tab of tabs) {
      if (tab.id && !tab.url?.startsWith('chrome://')) {
        chrome.tabs.sendMessage(tab.id, {
          type: MessageType.INJECT_COUNTERMEASURE,
          payload: {
            countermeasure: 'DOM_NOISE',
            config: {
              minInterval: 1000,
              maxInterval: 4000,
              duration: 300000, // 5 minutes
              noiseIntensity: 0.7
            }
          }
        }).catch(error => {
          logger.warn(`[TemporalDephasing] Could not inject DOM noise in tab ${tab.id}:`, error);
        });
      }
    }

    this.metrics.totalNoiseInjected++;
  }

  /**
   * Activates fingerprint protection.
   *
   * Uses the new deterministic FINGERPRINT_PROTECTION (session-scoped
   * noise, much harder to detect) instead of the legacy FINGERPRINT_POISON
   * (random noise per call, easily detected via repeated comparison).
   */
  private async poisonFingerprinting(): Promise<void> {
    const tabs = await chrome.tabs.query({ active: true });
    for (const tab of tabs) {
      if (tab.id && !tab.url?.startsWith('chrome://')) {
        // Use the new deterministic protection by default
        chrome.tabs.sendMessage(tab.id, {
          type: MessageType.INJECT_COUNTERMEASURE,
          payload: {
            countermeasure: 'FINGERPRINT_PROTECTION',
            config: {
              duration: 300000 // 5 minutes
            }
          }
        }).catch(error => {
          logger.warn(`[TemporalDephasing] Could not activate fingerprint protection in tab ${tab.id}:`, error);
        });
      }
    }
  }

  /**
   * Active l'effet visuel sur l'organisme
   */
  private async activateVisualEffect(context: RitualContext): Promise<void> {
    // Envoyer un message pour rendre l'organisme "vaporeux"
    this.messageBus.send({
      type: 'RITUAL_VISUAL_EFFECT' as MessageType,
      payload: {
        ritualType: this.type,
        effect: 'VAPORIZE',
        duration: 10000,
        intensity: 0.7,
        organismId: context.organism.id
      }
    });

    // Augmenter la conscience de l'organisme
    this.messageBus.send({
      type: MessageType.ORGANISM_MUTATE,
      payload: {
        organismId: context.organism.id,
        mutation: {
          type: 'cognitive',
          traits: {
            consciousness: Math.min(100, (context.organism.consciousness || 0) + 15),
            intuition: Math.min(100, (context.organism.traits?.intuition || 0) + 10)
          },
          trigger: 'temporal_dephasing',
          magnitude: 0.7,
          timestamp: Date.now()
        }
      }
    });
  }

  /**
   * Évalue une condition de déclenchement
   */
  private evaluateTrigger(trigger: RitualTriggerCondition, context: RitualContext): boolean {
    const value = (context as any)[trigger.metric];
    if (value === undefined) return false;

    switch (trigger.operator) {
      case '>': return value > trigger.value;
      case '<': return value < trigger.value;
      case '>=': return value >= trigger.value;
      case '<=': return value <= trigger.value;
      case '==': return value === trigger.value;
      default: return false;
    }
  }

  /**
   * Calcule le score d'impact
   */
  private calculateImpactScore(trackersNeutralized: number): number {
    const baseScore = 50;
    const trackerBonus = Math.min(trackersNeutralized * 5, 40);
    const noiseBonus = 10;
    return Math.min(100, baseScore + trackerBonus + noiseBonus);
  }

  /**
   * Annule le rituel
   */
  public async cancel(): Promise<void> {
    this.status = RitualStatus.CANCELLED;

    // Nettoyer les intercepteurs
    for (const [id, interceptor] of this.activeInterceptors) {
      try {
        if (typeof interceptor.cleanup === 'function') {
          interceptor.cleanup();
        }
      } catch (error) {
        logger.error(`[TemporalDephasing] Failed to cleanup interceptor ${id}:`, error);
      }
    }

    this.activeInterceptors.clear();
  }

  /**
   * Annule les effets du rituel
   */
  public async rollback(): Promise<void> {
    await this.cancel();

    // Réinitialiser les métriques
    this.metrics = {
      totalInterceptions: 0,
      totalLatencyInjected: 0,
      totalNoiseInjected: 0,
      trackersPoisoned: new Set<string>()
    };
  }

  /**
   * Obtient les métriques
   */
  public getMetrics(): RitualMetrics {
    const successCount = this.executionCount > 0 ?
      this.metrics.totalInterceptions : 0;

    return {
      successRate: this.executionCount > 0 ?
        successCount / this.executionCount : 0,
      averageExecutionTime: 2500, // Estimation
      resourceConsumption: 0.15, // 15% CPU/memory
      userBenefit: 0.85 // 85% de protection estimée
    };
  }

  /**
   * Obtient l'état de santé
   */
  public getHealthStatus(): RitualHealth {
    const issues: string[] = [];
    const recommendations: string[] = [];

    if (this.executionCount > 50) {
      issues.push('High execution count may indicate excessive tracking');
      recommendations.push('Consider using a dedicated privacy extension');
    }

    if (this.metrics.trackersPoisoned.size > 100) {
      issues.push('Large number of unique trackers detected');
      recommendations.push('Review browsing habits and site trustworthiness');
    }

    return {
      isHealthy: issues.length === 0,
      issues,
      recommendations
    };
  }
}