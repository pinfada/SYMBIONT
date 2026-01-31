import { logger } from '@/shared/utils/secureLogger';
import { SecureRandom } from '@/shared/utils/secureRandom';

/**
 * ResonanceAnalyzer - Module d'analyse de corrélation infrastructurelle
 *
 * Étend le NeuralMesh avec la capacité de détecter les signaux faibles
 * via la corrélation entre différentes sources de friction (réseau, DOM, etc.)
 */
export class ResonanceAnalyzer {
  private networkLatencyBuffer: number[] = [];
  private domJitterBuffer: number[] = [];
  private correlationHistory: Array<{
    timestamp: number;
    correlation: number;
    resonanceType: string;
  }> = [];

  private readonly MAX_BUFFER_SIZE = 100;
  private readonly CORRELATION_THRESHOLD = 0.4;
  private readonly EMA_ALPHA = 0.15;

  private smoothedNetworkStability = 1;
  private smoothedDomStability = 1;
  private lastResonanceState: ResonanceState | null = null;

  /**
   * Ajoute un échantillon de latence réseau
   */
  addNetworkLatency(latency: number): void {
    if (!Number.isFinite(latency) || latency < 0) {
      logger.warn('Invalid network latency value', { latency });
      return;
    }

    this.networkLatencyBuffer.push(latency);

    // Maintenir la taille du buffer
    if (this.networkLatencyBuffer.length > this.MAX_BUFFER_SIZE) {
      this.networkLatencyBuffer.shift();
    }
  }

  /**
   * Ajoute un échantillon de jitter DOM
   */
  addDOMJitter(jitter: number): void {
    if (!Number.isFinite(jitter) || jitter < 0) {
      logger.warn('Invalid DOM jitter value', { jitter });
      return;
    }

    this.domJitterBuffer.push(jitter);

    // Maintenir la taille du buffer
    if (this.domJitterBuffer.length > this.MAX_BUFFER_SIZE) {
      this.domJitterBuffer.shift();
    }
  }

  /**
   * Calcule la résonance entre réseau et DOM
   */
  calculateResonance(): ResonanceState | null {
    // Vérifier qu'on a assez de données
    if (this.networkLatencyBuffer.length < 10 || this.domJitterBuffer.length < 10) {
      return null;
    }

    // Calculer les métriques de stabilité
    const networkMetrics = this.calculateMetrics(this.networkLatencyBuffer);
    const domMetrics = this.calculateMetrics(this.domJitterBuffer);

    // Application du lissage EMA
    this.smoothedNetworkStability = this.EMA_ALPHA * (1 / (1 + networkMetrics.variance)) +
                                    (1 - this.EMA_ALPHA) * this.smoothedNetworkStability;

    this.smoothedDomStability = this.EMA_ALPHA * (1 / (1 + domMetrics.variance)) +
                               (1 - this.EMA_ALPHA) * this.smoothedDomStability;

    // Calcul du gap de résonance
    const resonanceGap = Math.abs(this.smoothedNetworkStability - this.smoothedDomStability);

    // Détection de résonance significative
    if (resonanceGap > this.CORRELATION_THRESHOLD) {
      const resonanceType = this.smoothedNetworkStability < this.smoothedDomStability
        ? 'NETWORK_PRESSURE'
        : 'DOM_OPPRESSION';

      const resonanceState: ResonanceState = {
        type: 'INFRASTRUCTURE_RESONANCE',
        magnitude: resonanceGap,
        signal: resonanceType,
        networkStability: this.smoothedNetworkStability,
        domStability: this.smoothedDomStability,
        confidence: this.calculateConfidence(networkMetrics, domMetrics),
        timestamp: Date.now()
      };

      // Enregistrer dans l'historique
      this.correlationHistory.push({
        timestamp: resonanceState.timestamp,
        correlation: resonanceGap,
        resonanceType
      });

      // Maintenir la taille de l'historique
      if (this.correlationHistory.length > 50) {
        this.correlationHistory.shift();
      }

      this.lastResonanceState = resonanceState;
      return resonanceState;
    }

    return null;
  }

  /**
   * Calcule les métriques statistiques d'un échantillon
   */
  private calculateMetrics(values: number[]): {
    mean: number;
    variance: number;
    stdDev: number;
    min: number;
    max: number;
  } {
    if (values.length === 0) {
      return { mean: 0, variance: 0, stdDev: 0, min: 0, max: 0 };
    }

    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const squaredDiffs = values.map(value => Math.pow(value - mean, 2));
    const variance = squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
    const stdDev = Math.sqrt(variance);
    const min = Math.min(...values);
    const max = Math.max(...values);

    return { mean, variance, stdDev, min, max };
  }

  /**
   * Calcule le niveau de confiance de la détection
   */
  private calculateConfidence(networkMetrics: any, domMetrics: any): number {
    // Plus la variance est faible, plus la confiance est élevée
    const networkConfidence = 1 / (1 + networkMetrics.variance);
    const domConfidence = 1 / (1 + domMetrics.variance);

    // La confiance globale est la moyenne harmonique
    const confidence = 2 * (networkConfidence * domConfidence) /
                      (networkConfidence + domConfidence);

    return Math.min(1, Math.max(0, confidence));
  }

  /**
   * Analyse la corrélation temporelle entre les signaux
   */
  analyzeTemporalCorrelation(): {
    correlation: number;
    lag: number;
    significance: number;
  } {
    if (this.networkLatencyBuffer.length < 30 || this.domJitterBuffer.length < 30) {
      return { correlation: 0, lag: 0, significance: 0 };
    }

    // Calcul de la corrélation croisée avec différents décalages temporels
    let maxCorrelation = 0;
    let optimalLag = 0;

    for (let lag = -10; lag <= 10; lag++) {
      const correlation = this.calculateCrossCorrelation(
        this.networkLatencyBuffer,
        this.domJitterBuffer,
        lag
      );

      if (Math.abs(correlation) > Math.abs(maxCorrelation)) {
        maxCorrelation = correlation;
        optimalLag = lag;
      }
    }

    // Calcul de la significativité statistique
    const significance = this.calculateSignificance(maxCorrelation, this.networkLatencyBuffer.length);

    return {
      correlation: maxCorrelation,
      lag: optimalLag,
      significance
    };
  }

  /**
   * Calcule la corrélation croisée avec décalage
   */
  private calculateCrossCorrelation(series1: number[], series2: number[], lag: number): number {
    const n = Math.min(series1.length, series2.length - Math.abs(lag));
    if (n < 10) return 0;

    const startIndex1 = lag > 0 ? 0 : -lag;
    const startIndex2 = lag > 0 ? lag : 0;

    let sum1 = 0, sum2 = 0;
    for (let i = 0; i < n; i++) {
      sum1 += series1[startIndex1 + i];
      sum2 += series2[startIndex2 + i];
    }
    const mean1 = sum1 / n;
    const mean2 = sum2 / n;

    let covariance = 0;
    let variance1 = 0;
    let variance2 = 0;

    for (let i = 0; i < n; i++) {
      const diff1 = series1[startIndex1 + i] - mean1;
      const diff2 = series2[startIndex2 + i] - mean2;
      covariance += diff1 * diff2;
      variance1 += diff1 * diff1;
      variance2 += diff2 * diff2;
    }

    if (variance1 === 0 || variance2 === 0) return 0;

    return covariance / Math.sqrt(variance1 * variance2);
  }

  /**
   * Calcule la significativité statistique d'une corrélation
   */
  private calculateSignificance(correlation: number, sampleSize: number): number {
    // Test de Student pour la corrélation
    const t = correlation * Math.sqrt(sampleSize - 2) / Math.sqrt(1 - correlation * correlation);

    // Approximation de la p-value (simplifiée)
    const pValue = 2 * (1 - this.normalCDF(Math.abs(t)));

    // Conversion en score de significativité (0-1)
    return 1 - pValue;
  }

  /**
   * Fonction de distribution cumulative normale (approximation)
   */
  private normalCDF(x: number): number {
    const a1 = 0.254829592;
    const a2 = -0.284496736;
    const a3 = 1.421413741;
    const a4 = -1.453152027;
    const a5 = 1.061405429;
    const p = 0.3275911;

    const sign = x < 0 ? -1 : 1;
    x = Math.abs(x) / Math.sqrt(2.0);

    const t = 1.0 / (1.0 + p * x);
    const t2 = t * t;
    const t3 = t2 * t;
    const t4 = t3 * t;
    const t5 = t4 * t;

    const y = 1.0 - (((((a5 * t5 + a4 * t4) + a3 * t3) + a2 * t2) + a1 * t) * Math.exp(-x * x));

    return 0.5 * (1.0 + sign * y);
  }

  /**
   * Génère un rapport de diagnostic complet
   */
  generateDiagnosticReport(): DiagnosticReport {
    const networkMetrics = this.calculateMetrics(this.networkLatencyBuffer);
    const domMetrics = this.calculateMetrics(this.domJitterBuffer);
    const temporalAnalysis = this.analyzeTemporalCorrelation();

    return {
      timestamp: Date.now(),
      bufferSizes: {
        network: this.networkLatencyBuffer.length,
        dom: this.domJitterBuffer.length
      },
      networkMetrics,
      domMetrics,
      stability: {
        network: this.smoothedNetworkStability,
        dom: this.smoothedDomStability
      },
      resonance: this.lastResonanceState,
      temporalCorrelation: temporalAnalysis,
      correlationHistory: this.correlationHistory.slice(-10), // Last 10 entries
      healthStatus: this.evaluateHealthStatus()
    };
  }

  /**
   * Évalue l'état de santé du système
   */
  private evaluateHealthStatus(): HealthStatus {
    if (!this.lastResonanceState) {
      return {
        level: 'healthy',
        score: 1.0,
        description: 'Aucune résonance détectée, système stable'
      };
    }

    const magnitude = this.lastResonanceState.magnitude;
    const age = Date.now() - this.lastResonanceState.timestamp;

    // La résonance s'atténue avec le temps
    const ageDecay = Math.exp(-age / 60000); // Décroissance sur 1 minute
    const effectiveMagnitude = magnitude * ageDecay;

    if (effectiveMagnitude < 0.3) {
      return {
        level: 'healthy',
        score: 1.0 - effectiveMagnitude,
        description: 'Système globalement stable avec fluctuations mineures'
      };
    } else if (effectiveMagnitude < 0.6) {
      return {
        level: 'warning',
        score: 0.7 - effectiveMagnitude * 0.5,
        description: 'Friction modérée détectée, surveillance recommandée'
      };
    } else {
      return {
        level: 'critical',
        score: Math.max(0.1, 0.4 - effectiveMagnitude * 0.3),
        description: 'Résonance critique détectée, interférence probable'
      };
    }
  }

  /**
   * Réinitialise l'analyseur
   */
  reset(): void {
    this.networkLatencyBuffer = [];
    this.domJitterBuffer = [];
    this.correlationHistory = [];
    this.smoothedNetworkStability = 1;
    this.smoothedDomStability = 1;
    this.lastResonanceState = null;

    logger.info('ResonanceAnalyzer reset');
  }

  /**
   * Retourne l'état actuel pour sérialisation
   */
  getState(): any {
    return {
      networkLatencyBuffer: this.networkLatencyBuffer,
      domJitterBuffer: this.domJitterBuffer,
      correlationHistory: this.correlationHistory,
      smoothedNetworkStability: this.smoothedNetworkStability,
      smoothedDomStability: this.smoothedDomStability,
      lastResonanceState: this.lastResonanceState
    };
  }

  /**
   * Restore l'état depuis des données sérialisées
   */
  loadState(state: any): void {
    if (state.networkLatencyBuffer) {
      this.networkLatencyBuffer = state.networkLatencyBuffer;
    }
    if (state.domJitterBuffer) {
      this.domJitterBuffer = state.domJitterBuffer;
    }
    if (state.correlationHistory) {
      this.correlationHistory = state.correlationHistory;
    }
    if (typeof state.smoothedNetworkStability === 'number') {
      this.smoothedNetworkStability = state.smoothedNetworkStability;
    }
    if (typeof state.smoothedDomStability === 'number') {
      this.smoothedDomStability = state.smoothedDomStability;
    }
    if (state.lastResonanceState) {
      this.lastResonanceState = state.lastResonanceState;
    }
  }
}

// Types
export interface ResonanceState {
  type: string;
  magnitude: number;
  signal: 'NETWORK_PRESSURE' | 'DOM_OPPRESSION';
  networkStability: number;
  domStability: number;
  confidence: number;
  timestamp: number;
}

export interface DiagnosticReport {
  timestamp: number;
  bufferSizes: {
    network: number;
    dom: number;
  };
  networkMetrics: any;
  domMetrics: any;
  stability: {
    network: number;
    dom: number;
  };
  resonance: ResonanceState | null;
  temporalCorrelation: {
    correlation: number;
    lag: number;
    significance: number;
  };
  correlationHistory: Array<any>;
  healthStatus: HealthStatus;
}

export interface HealthStatus {
  level: 'healthy' | 'warning' | 'critical';
  score: number;
  description: string;
}