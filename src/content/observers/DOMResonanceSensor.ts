import { logger } from '@/shared/utils/secureLogger';
import { SecureRandom } from '@/shared/utils/secureRandom';

/**
 * DOMResonanceSensor - Détection de signaux faibles via l'analyse de friction DOM
 *
 * Architecture Sentinel-Flow: Ce module mesure la "friction" du DOM en analysant
 * les mutations qui surviennent sans activité utilisateur explicite, révélant
 * potentiellement des activités invisibles (tracking, exfiltration, etc.)
 */
export class DOMResonanceSensor {
  private observer: MutationObserver | null = null;
  private jitterBuffer: number[] = [];
  private lastFrameTime: number = 0;
  private shadowActivityBuffer: Array<{ intensity: number; timestamp: number }> = [];
  private isMonitoring: boolean = false;
  private emaAlpha: number = 0.2; // Facteur de lissage EMA
  private smoothedResonance: number = 0;
  private idleCallbackId: number | null = null;

  // Métriques de performance
  private metrics = {
    totalMutations: 0,
    shadowMutations: 0,
    averageJitter: 0,
    peakResonance: 0
  };

  constructor() {
    this.lastFrameTime = performance.now();
  }

  /**
   * Démarre la détection de résonance DOM avec impact minimal sur les performances
   */
  start(): void {
    if (this.isMonitoring) {
      logger.warn('DOMResonanceSensor already monitoring');
      return;
    }

    this.isMonitoring = true;

    // Configuration optimisée du MutationObserver
    this.observer = new MutationObserver(this.handleMutations.bind(this));

    // Observer avec configuration granulaire pour minimiser l'overhead
    this.observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeOldValue: false,
      characterData: false
    });

    // Démarrer la mesure du jitter frame
    this.measureFrameJitter();

    logger.info('DOMResonanceSensor started', { timestamp: Date.now() });
  }

  /**
   * Arrête la détection de résonance
   */
  stop(): void {
    if (!this.isMonitoring) return;

    this.isMonitoring = false;

    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }

    if (this.idleCallbackId !== null) {
      cancelIdleCallback(this.idleCallbackId);
      this.idleCallbackId = null;
    }

    logger.info('DOMResonanceSensor stopped', { metrics: this.metrics });
  }

  /**
   * Mesure le jitter entre frames pour détecter la pression structurelle
   */
  private measureFrameJitter(): void {
    if (!this.isMonitoring) return;

    const now = performance.now();
    const delta = now - this.lastFrameTime;
    this.lastFrameTime = now;

    // Détection de jitter significatif (écart par rapport au 16.67ms idéal)
    const idealFrameTime = 16.67;
    const jitter = Math.abs(delta - idealFrameTime);

    if (jitter > 2) { // Seuil de 2ms pour filtrer le bruit
      this.jitterBuffer.push(jitter);

      // Maintenir un buffer circulaire de 50 échantillons
      if (this.jitterBuffer.length > 50) {
        this.jitterBuffer.shift();
      }

      this.updateJitterMetrics();
    }

    // Utilisation de requestIdleCallback pour minimiser l'impact
    this.idleCallbackId = requestIdleCallback(
      () => this.measureFrameJitter(),
      { timeout: 1000 }
    );
  }

  /**
   * Traite les mutations DOM détectées
   */
  private handleMutations(mutations: MutationRecord[]): void {
    this.metrics.totalMutations += mutations.length;

    // Analyse uniquement pendant les phases d'inactivité utilisateur
    const userIsActive = this.detectUserActivity();

    if (!userIsActive && mutations.length > 0) {
      // Activité d'ombre détectée: mutations sans interaction utilisateur
      const shadowIntensity = this.calculateShadowIntensity(mutations);

      if (shadowIntensity > 0) {
        this.metrics.shadowMutations += mutations.length;

        const shadowEvent = {
          intensity: shadowIntensity,
          timestamp: Date.now()
        };

        this.shadowActivityBuffer.push(shadowEvent);

        // Maintenir un buffer de 100 événements max
        if (this.shadowActivityBuffer.length > 100) {
          this.shadowActivityBuffer.shift();
        }

        // Calculer et émettre la résonance
        this.emitResonanceSignal(shadowIntensity);
      }
    }
  }

  /**
   * Détecte si l'utilisateur est actif
   */
  private detectUserActivity(): boolean {
    // Utilisation de l'API User Activation si disponible
    if ('userActivation' in navigator) {
      return (navigator as any).userActivation.isActive;
    }

    // Fallback: détection basique via les événements récents
    const recentActivity = document.hidden === false &&
                          document.hasFocus();

    return recentActivity;
  }

  /**
   * Calcule l'intensité de l'activité d'ombre
   */
  private calculateShadowIntensity(mutations: MutationRecord[]): number {
    let intensity = 0;

    for (const mutation of mutations) {
      // Pondération selon le type de mutation
      switch (mutation.type) {
        case 'childList':
          // Les ajouts/suppressions de nœuds sont plus significatifs
          intensity += (mutation.addedNodes.length + mutation.removedNodes.length) * 2;
          break;
        case 'attributes':
          // Les changements d'attributs sont modérément significatifs
          intensity += 1;

          // Certains attributs sont plus suspects
          if (mutation.attributeName === 'src' ||
              mutation.attributeName === 'href' ||
              mutation.attributeName === 'data-tracking') {
            intensity += 3;
          }
          break;
      }
    }

    // Normalisation logarithmique pour éviter les pics extrêmes
    return Math.log(1 + intensity);
  }

  /**
   * Met à jour les métriques de jitter
   */
  private updateJitterMetrics(): void {
    if (this.jitterBuffer.length === 0) return;

    const sum = this.jitterBuffer.reduce((a, b) => a + b, 0);
    this.metrics.averageJitter = sum / this.jitterBuffer.length;
  }

  /**
   * Émet un signal de résonance vers le système principal
   * @param intensity - Intensité de l'activité d'ombre détectée (logarithmique)
   * @throws {Error} Si l'intensité est négative
   * @since 1.1.0
   * @see ISO/IEC 25010:2011 - Performance efficiency
   */
  private emitResonanceSignal(intensity: number): void {
    // Validation des paramètres selon Clean Code principles
    if (intensity < 0) {
      logger.error('Invalid negative intensity', { intensity });
      throw new Error('Resonance intensity must be non-negative');
    }

    // Application du lissage EMA (Exponential Moving Average)
    // Formula: S(t) = α × X(t) + (1 - α) × S(t-1)
    this.smoothedResonance = this.emaAlpha * intensity +
                             (1 - this.emaAlpha) * this.smoothedResonance;

    // Mise à jour du pic de résonance avec validation
    if (this.smoothedResonance > this.metrics.peakResonance) {
      this.metrics.peakResonance = this.smoothedResonance;
    }

    // Configuration du seuil selon proposition_amelioration.md Phase 1.1
    const RESONANCE_THRESHOLD = 0.4; // Augmenté de 0.3 à 0.4 pour réduire les faux positifs

    // Émission uniquement si le signal dépasse le seuil de bruit
    if (this.smoothedResonance > RESONANCE_THRESHOLD) {
      // CORRECTION: Utilisation de timestamps absolus pour synchronisation cross-context
      // performance.now() n'est PAS comparable entre content script et background !
      const detectionTime = Date.now(); // Moment exact de détection (absolu)
      const preSendTime = Date.now();   // Juste avant l'envoi

      const resonanceData = {
        type: 'DOM_RESONANCE_DETECTED',
        payload: {
          resonance: this.smoothedResonance,
          jitter: this.metrics.averageJitter,
          shadowActivity: this.shadowActivityBuffer.length,

          // Timestamps corrigés - uniquement des valeurs absolues comparables
          timestamps: {
            detected: detectionTime,      // Moment de détection DOM
            emitted: preSendTime,        // Moment d'émission du message
            // Pas de performance.now() - non comparable entre contextes !
          },

          metrics: this.getMetrics(),
          state: this.getResonanceState() // État pour feedback visuel
        }
      };

      // Envoi asynchrone avec gestion d'erreur robuste
      chrome.runtime.sendMessage(resonanceData)
        .catch((err: Error) => {
          // Log structuré selon les best practices
          logger.warn('Failed to send resonance signal', {
            error: err.message,
            stack: err.stack,
            resonance: this.smoothedResonance,
            threshold: RESONANCE_THRESHOLD
          });
        });

      // Log de métrique pour monitoring (ISO/IEC 25010 - Maintainability)
      logger.debug('Resonance signal emitted', {
        resonance: this.smoothedResonance,
        threshold: RESONANCE_THRESHOLD,
        state: this.getResonanceState().level
      });
    }
  }

  /**
   * Calcule la corrélation entre jitter DOM et latence réseau
   */
  calculateCorrelation(networkLatency: number[]): number {
    if (this.jitterBuffer.length < 10 || networkLatency.length < 10) {
      return 0; // Pas assez de données pour une corrélation significative
    }

    // Calcul de la covariance normalisée
    const jitterMean = this.metrics.averageJitter;
    const latencyMean = networkLatency.reduce((a, b) => a + b, 0) / networkLatency.length;

    let covariance = 0;
    const minLength = Math.min(this.jitterBuffer.length, networkLatency.length);

    for (let i = 0; i < minLength; i++) {
      covariance += (this.jitterBuffer[i] - jitterMean) *
                   (networkLatency[i] - latencyMean);
    }

    covariance /= minLength;

    // Normalisation pour obtenir un coefficient entre -1 et 1
    const jitterStdDev = this.calculateStandardDeviation(this.jitterBuffer);
    const latencyStdDev = this.calculateStandardDeviation(networkLatency);

    if (jitterStdDev === 0 || latencyStdDev === 0) {
      return 0;
    }

    return covariance / (jitterStdDev * latencyStdDev);
  }

  /**
   * Calcule l'écart-type d'un échantillon
   */
  private calculateStandardDeviation(values: number[]): number {
    if (values.length === 0) return 0;

    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const squaredDiffs = values.map(value => Math.pow(value - mean, 2));
    const variance = squaredDiffs.reduce((a, b) => a + b, 0) / values.length;

    return Math.sqrt(variance);
  }

  /**
   * Retourne les métriques actuelles du capteur
   */
  getMetrics(): typeof this.metrics & {
    smoothedResonance: number;
    bufferSizes: { jitter: number; shadow: number };
  } {
    return {
      ...this.metrics,
      smoothedResonance: this.smoothedResonance,
      bufferSizes: {
        jitter: this.jitterBuffer.length,
        shadow: this.shadowActivityBuffer.length
      }
    };
  }

  /**
   * Réinitialise les métriques et buffers
   */
  reset(): void {
    this.jitterBuffer = [];
    this.shadowActivityBuffer = [];
    this.smoothedResonance = 0;
    this.lastFrameTime = performance.now();

    this.metrics = {
      totalMutations: 0,
      shadowMutations: 0,
      averageJitter: 0,
      peakResonance: 0
    };

    logger.info('DOMResonanceSensor reset');
  }

  /**
   * Retourne l'état de résonance actuel pour la visualisation
   */
  getResonanceState(): {
    level: 'quiet' | 'normal' | 'active' | 'critical';
    value: number;
    description: string;
  } {
    const value = this.smoothedResonance;

    if (value < 0.2) {
      return {
        level: 'quiet',
        value,
        description: 'Environnement DOM stable, aucune friction détectée'
      };
    } else if (value < 0.5) {
      return {
        level: 'normal',
        value,
        description: 'Activité DOM normale, légère friction observée'
      };
    } else if (value < 0.8) {
      return {
        level: 'active',
        value,
        description: 'Friction significative détectée, possible surveillance'
      };
    } else {
      return {
        level: 'critical',
        value,
        description: 'Friction critique, forte probabilité d\'interférence externe'
      };
    }
  }
}