/**
 * Backpressure Logistique
 *
 * Mécanisme d'auto-limitation qui réduit l'échantillonnage des stimuli
 * (scroll, clics, etc.) lorsque la file d'attente de stockage dépasse
 * un seuil de latence critique.
 *
 * Évite l'asphyxie du système en régulant dynamiquement le débit d'entrée.
 */

import { logger } from '@/shared/utils/secureLogger';
import { neuromodulation } from './Neuromodulation';

export interface BackpressureMetrics {
  queueDepth: number;           // Nombre d'opérations en attente
  averageLatency: number;       // Latence moyenne (ms)
  maxLatency: number;           // Latence maximale observée (ms)
  throughput: number;           // Opérations par seconde
  rejectedOperations: number;   // Opérations rejetées
  samplingRate: number;         // Taux d'échantillonnage actuel (0-1)
}

export interface BackpressureConfig {
  maxQueueDepth: number;        // Profondeur max de la file (défaut: 100)
  latencyThreshold: number;     // Seuil de latence critique (ms, défaut: 500)
  minSamplingRate: number;      // Taux d'échantillonnage minimum (défaut: 0.1)
  maxSamplingRate: number;      // Taux d'échantillonnage maximum (défaut: 1.0)
  recoveryRate: number;         // Vitesse de récupération (défaut: 0.1)
  degradationRate: number;      // Vitesse de dégradation (défaut: 0.2)
  memoryThresholdMB: number;    // Seuil mémoire avant throttle (défaut: 500)
}

export type BackpressureLevel = 'nominal' | 'elevated' | 'critical' | 'emergency';

interface PendingOperation {
  id: string;
  type: 'read' | 'write';
  startTime: number;
  key: string;
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
}

/**
 * Contrôleur de backpressure pour régulation du flux de données
 */
export class BackpressureController {
  private config: BackpressureConfig;
  private metrics: BackpressureMetrics;
  private pendingOperations: Map<string, PendingOperation> = new Map();
  private completedLatencies: number[] = [];
  private level: BackpressureLevel = 'nominal';
  private operationCounter: number = 0;
  private lastAdjustment: number = Date.now();
  private throttleMultiplier: number = 1;

  // Debounce timers pour différents types d'opérations
  private debounceTimers: Map<string, NodeJS.Timeout> = new Map();
  private coalescedWrites: Map<string, { key: string; value: unknown; timestamp: number }> = new Map();

  constructor(config?: Partial<BackpressureConfig>) {
    this.config = {
      maxQueueDepth: 100,
      latencyThreshold: 500,
      minSamplingRate: 0.1,
      maxSamplingRate: 1.0,
      recoveryRate: 0.1,
      degradationRate: 0.2,
      memoryThresholdMB: 500,
      ...config
    };

    this.metrics = {
      queueDepth: 0,
      averageLatency: 0,
      maxLatency: 0,
      throughput: 0,
      rejectedOperations: 0,
      samplingRate: this.config.maxSamplingRate
    };

    logger.info('[BackpressureController] Initialized', this.config);
  }

  /**
   * Évalue si une opération peut être acceptée ou doit être rejetée/différée
   */
  canAcceptOperation(type: 'read' | 'write', key: string): boolean {
    // Lecture toujours acceptée (pas de risque de saturation)
    if (type === 'read') {
      return true;
    }

    // Vérification du niveau de pression
    this.updateLevel();

    switch (this.level) {
      case 'emergency':
        // Mode urgence: rejeter toutes les écritures non critiques
        this.metrics.rejectedOperations++;
        logger.warn('[BackpressureController] Operation rejected - emergency mode', { key });
        return false;

      case 'critical':
        // Mode critique: accepter seulement les clés critiques
        if (!this.isCriticalKey(key)) {
          this.metrics.rejectedOperations++;
          return false;
        }
        return true;

      case 'elevated':
        // Mode élevé: appliquer l'échantillonnage
        return Math.random() < this.metrics.samplingRate;

      case 'nominal':
      default:
        return true;
    }
  }

  /**
   * Enregistre le début d'une opération
   */
  startOperation(type: 'read' | 'write', key: string): string {
    const id = `op_${++this.operationCounter}_${Date.now()}`;

    const operation: PendingOperation = {
      id,
      type,
      startTime: Date.now(),
      key,
      resolve: () => { },
      reject: () => { }
    };

    this.pendingOperations.set(id, operation);
    this.metrics.queueDepth = this.pendingOperations.size;

    return id;
  }

  /**
   * Enregistre la fin d'une opération
   */
  completeOperation(operationId: string, success: boolean = true): void {
    const operation = this.pendingOperations.get(operationId);
    if (!operation) return;

    const latency = Date.now() - operation.startTime;

    // Enregistrer la latence (garder les 100 dernières)
    this.completedLatencies.push(latency);
    if (this.completedLatencies.length > 100) {
      this.completedLatencies.shift();
    }

    // Mettre à jour les métriques
    this.metrics.maxLatency = Math.max(this.metrics.maxLatency, latency);
    this.metrics.averageLatency = this.completedLatencies.reduce((a, b) => a + b, 0) /
      this.completedLatencies.length;

    this.pendingOperations.delete(operationId);
    this.metrics.queueDepth = this.pendingOperations.size;

    // Notifier le système de neuromodulation si latence élevée
    if (latency > this.config.latencyThreshold) {
      neuromodulation.processEvent('stress', latency / this.config.latencyThreshold);
    } else if (success && this.level === 'nominal') {
      neuromodulation.processEvent('success', 0.1);
    }

    // Ajuster le taux d'échantillonnage
    this.adjustSamplingRate();
  }

  /**
   * Coalesce plusieurs écritures en une seule
   */
  coalesceWrite(key: string, value: unknown, debounceMs: number = 1000): Promise<void> {
    return new Promise((resolve) => {
      // Stocker la valeur la plus récente
      this.coalescedWrites.set(key, {
        key,
        value,
        timestamp: Date.now()
      });

      // Annuler le timer précédent pour cette clé
      const existingTimer = this.debounceTimers.get(key);
      if (existingTimer) {
        clearTimeout(existingTimer);
      }

      // Créer un nouveau timer
      const timer = setTimeout(() => {
        this.debounceTimers.delete(key);
        this.coalescedWrites.delete(key);
        resolve();
      }, debounceMs);

      this.debounceTimers.set(key, timer);
    });
  }

  /**
   * Récupère toutes les écritures coalescées prêtes à être exécutées
   */
  getCoalescedWrites(): Array<{ key: string; value: unknown }> {
    const writes: Array<{ key: string; value: unknown }> = [];

    for (const [key, data] of this.coalescedWrites) {
      // Ne retourner que les écritures qui ont attendu au moins 500ms
      if (Date.now() - data.timestamp >= 500) {
        writes.push({ key, value: data.value });
        this.coalescedWrites.delete(key);
        const timer = this.debounceTimers.get(key);
        if (timer) {
          clearTimeout(timer);
          this.debounceTimers.delete(key);
        }
      }
    }

    return writes;
  }

  /**
   * Met à jour le niveau de backpressure
   */
  private updateLevel(): void {
    const queueRatio = this.metrics.queueDepth / this.config.maxQueueDepth;
    const latencyRatio = this.metrics.averageLatency / this.config.latencyThreshold;
    const memoryPressure = this.getMemoryPressure();

    // Score combiné (0-1+)
    const pressureScore = Math.max(queueRatio, latencyRatio, memoryPressure);

    const previousLevel = this.level;

    if (pressureScore > 0.9 || memoryPressure > 0.95) {
      this.level = 'emergency';
      neuromodulation.processEvent('resource_crisis');
    } else if (pressureScore > 0.7) {
      this.level = 'critical';
      neuromodulation.processEvent('stress', 0.8);
    } else if (pressureScore > 0.5) {
      this.level = 'elevated';
    } else {
      this.level = 'nominal';
    }

    if (previousLevel !== this.level) {
      logger.info('[BackpressureController] Level changed', {
        from: previousLevel,
        to: this.level,
        pressureScore,
        metrics: this.metrics
      });
    }
  }

  /**
   * Ajuste le taux d'échantillonnage dynamiquement
   */
  private adjustSamplingRate(): void {
    const now = Date.now();

    // Ne pas ajuster trop fréquemment
    if (now - this.lastAdjustment < 1000) return;
    this.lastAdjustment = now;

    if (this.level === 'nominal') {
      // Récupération graduelle
      this.metrics.samplingRate = Math.min(
        this.config.maxSamplingRate,
        this.metrics.samplingRate + this.config.recoveryRate
      );
    } else {
      // Dégradation proportionnelle au niveau
      const degradation = this.level === 'emergency' ? 0.5 :
        this.level === 'critical' ? this.config.degradationRate * 2 :
          this.config.degradationRate;

      this.metrics.samplingRate = Math.max(
        this.config.minSamplingRate,
        this.metrics.samplingRate - degradation
      );
    }
  }

  /**
   * Estime la pression mémoire (0-1)
   */
  private getMemoryPressure(): number {
    // Utiliser l'API Performance si disponible
    if (typeof performance !== 'undefined' && (performance as any).memory) {
      const memory = (performance as any).memory;
      const usedMB = memory.usedJSHeapSize / (1024 * 1024);
      return Math.min(1, usedMB / this.config.memoryThresholdMB);
    }

    // Fallback: estimation basée sur les opérations en cours
    return this.pendingOperations.size / (this.config.maxQueueDepth * 2);
  }

  /**
   * Détermine si une clé est critique (ne doit jamais être rejetée)
   */
  private isCriticalKey(key: string): boolean {
    const criticalPatterns = [
      'organism_state',
      'neural_mesh_state',
      'consciousness_state',
      'security_key',
      'encryption_key'
    ];

    return criticalPatterns.some(pattern => key.includes(pattern));
  }

  /**
   * Retourne le délai recommandé avant la prochaine opération (ms)
   */
  getRecommendedDelay(): number {
    switch (this.level) {
      case 'emergency':
        return 5000; // 5 secondes
      case 'critical':
        return 2000; // 2 secondes
      case 'elevated':
        return 500;  // 500ms
      case 'nominal':
      default:
        return 0;    // Pas de délai
    }
  }

  /**
   * Retourne le multiplicateur de throttle pour les intervalles
   */
  getThrottleMultiplier(): number {
    switch (this.level) {
      case 'emergency':
        return 10;
      case 'critical':
        return 5;
      case 'elevated':
        return 2;
      case 'nominal':
      default:
        return 1;
    }
  }

  /**
   * Retourne les métriques actuelles
   */
  getMetrics(): BackpressureMetrics {
    return { ...this.metrics };
  }

  /**
   * Retourne le niveau de backpressure actuel
   */
  getLevel(): BackpressureLevel {
    return this.level;
  }

  /**
   * Force le passage en mode urgence (appelé par le quorum sensing)
   */
  forceEmergencyMode(): void {
    this.level = 'emergency';
    this.metrics.samplingRate = this.config.minSamplingRate;
    logger.warn('[BackpressureController] Emergency mode forced');
  }

  /**
   * Réinitialise les métriques (après récupération)
   */
  reset(): void {
    this.level = 'nominal';
    this.metrics = {
      queueDepth: 0,
      averageLatency: 0,
      maxLatency: 0,
      throughput: 0,
      rejectedOperations: 0,
      samplingRate: this.config.maxSamplingRate
    };
    this.pendingOperations.clear();
    this.completedLatencies = [];
    this.coalescedWrites.clear();

    for (const timer of this.debounceTimers.values()) {
      clearTimeout(timer);
    }
    this.debounceTimers.clear();

    logger.info('[BackpressureController] Reset to nominal state');
  }

  /**
   * Sérialise l'état pour la persistance
   */
  serialize(): { metrics: BackpressureMetrics; level: BackpressureLevel } {
    return {
      metrics: { ...this.metrics },
      level: this.level
    };
  }

  /**
   * Cleanup
   */
  destroy(): void {
    for (const timer of this.debounceTimers.values()) {
      clearTimeout(timer);
    }
    this.debounceTimers.clear();
    this.pendingOperations.clear();
    this.coalescedWrites.clear();
  }
}

// Export singleton
export const backpressureController = new BackpressureController();
