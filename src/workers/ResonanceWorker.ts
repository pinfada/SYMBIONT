/**
 * ResonanceWorker.ts
 * Worker dédié pour l'analyse asynchrone des signaux de résonance
 * Implémente l'architecture Sentinel-Flow avec traitement hors thread principal
 */

import { PerformanceOptimizedRandom } from '@shared/utils/PerformanceOptimizedRandom';

export interface ResonanceWorkerMessage {
  type: 'INIT_RESONANCE' | 'PROCESS_JITTER' | 'PROCESS_LATENCY' | 'ANALYZE_CORRELATION' | 'GET_METRICS' | 'RESET';
  id: string;
  payload: unknown;
}

export interface ResonanceWorkerResponse {
  type: 'RESONANCE_RESULT' | 'RESONANCE_ERROR' | 'RESONANCE_METRICS';
  id: string;
  payload: unknown;
  processingTime: number;
}

interface ResonanceState {
  // Buffers de données temporelles
  jitterBuffer: number[];
  latencyBuffer: number[];
  shadowActivityBuffer: number[];

  // Métriques lissées (EMA)
  smoothedJitter: number;
  smoothedLatency: number;

  // Paramètres de configuration
  alpha: number; // Coefficient EMA
  bufferSize: number;
  correlationWindow: number;

  // Métriques de sortie
  resonanceLevel: number;
  frictionIndex: number;
  correlationCoefficient: number;
  lastAnalysisTime: number;
}

class ResonanceWorkerEngine {
  private state: ResonanceState;
  private analysisInterval: number | null = null;

  constructor() {
    this.state = {
      jitterBuffer: [],
      latencyBuffer: [],
      shadowActivityBuffer: [],
      smoothedJitter: 0,
      smoothedLatency: 0,
      alpha: 0.2,
      bufferSize: 100,
      correlationWindow: 50,
      resonanceLevel: 0,
      frictionIndex: 0,
      correlationCoefficient: 0,
      lastAnalysisTime: Date.now()
    };
  }

  /**
   * Initialise le worker avec des paramètres personnalisés
   */
  initialize(config: Partial<Pick<ResonanceState, 'alpha' | 'bufferSize' | 'correlationWindow'>>): void {
    if (config.alpha !== undefined) this.state.alpha = config.alpha;
    if (config.bufferSize !== undefined) this.state.bufferSize = config.bufferSize;
    if (config.correlationWindow !== undefined) this.state.correlationWindow = config.correlationWindow;

    // Démarrer l'analyse périodique
    if (this.analysisInterval) {
      clearInterval(this.analysisInterval);
    }

    // Analyse toutes les 500ms pour réduire la charge CPU
    this.analysisInterval = setInterval(() => {
      this.performCorrelationAnalysis();
    }, 500) as unknown as number;
  }

  /**
   * Traite un nouveau échantillon de jitter DOM
   */
  processJitter(jitter: number): void {
    // Ajouter au buffer circulaire
    this.state.jitterBuffer.push(jitter);
    if (this.state.jitterBuffer.length > this.state.bufferSize) {
      this.state.jitterBuffer.shift();
    }

    // Calculer EMA (Exponential Moving Average)
    this.state.smoothedJitter = this.state.alpha * jitter +
                                (1 - this.state.alpha) * this.state.smoothedJitter;
  }

  /**
   * Traite un nouveau échantillon de latence réseau
   */
  processLatency(latency: number): void {
    // Ajouter au buffer circulaire
    this.state.latencyBuffer.push(latency);
    if (this.state.latencyBuffer.length > this.state.bufferSize) {
      this.state.latencyBuffer.shift();
    }

    // Calculer EMA
    this.state.smoothedLatency = this.state.alpha * latency +
                                  (1 - this.state.alpha) * this.state.smoothedLatency;
  }

  /**
   * Analyse la corrélation entre les signaux
   */
  private performCorrelationAnalysis(): void {
    const jitterLen = this.state.jitterBuffer.length;
    const latencyLen = this.state.latencyBuffer.length;

    if (jitterLen < this.state.correlationWindow ||
        latencyLen < this.state.correlationWindow) {
      return; // Pas assez de données
    }

    // Prendre les derniers échantillons
    const jitterWindow = this.state.jitterBuffer.slice(-this.state.correlationWindow);
    const latencyWindow = this.state.latencyBuffer.slice(-this.state.correlationWindow);

    // Calculer la corrélation de Pearson
    const correlation = this.calculatePearsonCorrelation(jitterWindow, latencyWindow);
    this.state.correlationCoefficient = correlation;

    // Calculer l'indice de friction (variance du jitter normalisée)
    const jitterVariance = this.calculateVariance(jitterWindow);
    const jitterMean = jitterWindow.reduce((a, b) => a + b, 0) / jitterWindow.length;
    this.state.frictionIndex = jitterMean > 0 ? jitterVariance / jitterMean : 0;

    // Calculer le niveau de résonance global
    // Haute corrélation + haute friction = forte résonance
    const correlationFactor = Math.abs(correlation);
    const frictionFactor = Math.min(1, this.state.frictionIndex / 100);

    // Formule de résonance pondérée
    this.state.resonanceLevel = 0.4 * correlationFactor +
                                 0.3 * frictionFactor +
                                 0.15 * (this.state.smoothedJitter / 100) +
                                 0.15 * (this.state.smoothedLatency / 1000);

    // Borner entre 0 et 1
    this.state.resonanceLevel = Math.max(0, Math.min(1, this.state.resonanceLevel));

    this.state.lastAnalysisTime = Date.now();
  }

  /**
   * Calcule le coefficient de corrélation de Pearson
   */
  private calculatePearsonCorrelation(x: number[], y: number[]): number {
    const n = x.length;
    if (n !== y.length || n === 0) return 0;

    const meanX = x.reduce((a, b) => a + b, 0) / n;
    const meanY = y.reduce((a, b) => a + b, 0) / n;

    let numerator = 0;
    let denomX = 0;
    let denomY = 0;

    for (let i = 0; i < n; i++) {
      const dx = x[i] - meanX;
      const dy = y[i] - meanY;
      numerator += dx * dy;
      denomX += dx * dx;
      denomY += dy * dy;
    }

    const denominator = Math.sqrt(denomX * denomY);
    return denominator === 0 ? 0 : numerator / denominator;
  }

  /**
   * Calcule la variance d'un échantillon
   */
  private calculateVariance(data: number[]): number {
    if (data.length === 0) return 0;

    const mean = data.reduce((a, b) => a + b, 0) / data.length;
    const squaredDiffs = data.map(x => Math.pow(x - mean, 2));
    return squaredDiffs.reduce((a, b) => a + b, 0) / data.length;
  }

  /**
   * Analyse manuelle de corrélation (appelée à la demande)
   */
  analyzeCorrelation(): {
    resonanceLevel: number;
    frictionIndex: number;
    correlationCoefficient: number;
    jitterStats: { mean: number; variance: number; smoothed: number };
    latencyStats: { mean: number; variance: number; smoothed: number };
  } {
    this.performCorrelationAnalysis();

    const jitterMean = this.state.jitterBuffer.length > 0 ?
      this.state.jitterBuffer.reduce((a, b) => a + b, 0) / this.state.jitterBuffer.length : 0;
    const jitterVariance = this.calculateVariance(this.state.jitterBuffer);

    const latencyMean = this.state.latencyBuffer.length > 0 ?
      this.state.latencyBuffer.reduce((a, b) => a + b, 0) / this.state.latencyBuffer.length : 0;
    const latencyVariance = this.calculateVariance(this.state.latencyBuffer);

    return {
      resonanceLevel: this.state.resonanceLevel,
      frictionIndex: this.state.frictionIndex,
      correlationCoefficient: this.state.correlationCoefficient,
      jitterStats: {
        mean: jitterMean,
        variance: jitterVariance,
        smoothed: this.state.smoothedJitter
      },
      latencyStats: {
        mean: latencyMean,
        variance: latencyVariance,
        smoothed: this.state.smoothedLatency
      }
    };
  }

  /**
   * Récupère les métriques actuelles
   */
  getMetrics(): ResonanceState {
    return { ...this.state };
  }

  /**
   * Réinitialise l'analyseur
   */
  reset(): void {
    this.state.jitterBuffer = [];
    this.state.latencyBuffer = [];
    this.state.shadowActivityBuffer = [];
    this.state.smoothedJitter = 0;
    this.state.smoothedLatency = 0;
    this.state.resonanceLevel = 0;
    this.state.frictionIndex = 0;
    this.state.correlationCoefficient = 0;
    this.state.lastAnalysisTime = Date.now();
  }

  /**
   * Nettoie les ressources
   */
  cleanup(): void {
    if (this.analysisInterval) {
      clearInterval(this.analysisInterval);
      this.analysisInterval = null;
    }
  }
}

// Instance du moteur de résonance pour ce worker
const resonanceEngine = new ResonanceWorkerEngine();

// Gestionnaire de messages du worker
self.onmessage = (event: MessageEvent<ResonanceWorkerMessage>) => {
  const startTime = performance.now();
  const { type, id, payload } = event.data;

  try {
    let result: unknown;

    switch (type) {
      case 'INIT_RESONANCE':
        resonanceEngine.initialize(payload as any);
        result = { success: true };
        break;

      case 'PROCESS_JITTER':
        resonanceEngine.processJitter((payload as any).jitter);
        result = { success: true };
        break;

      case 'PROCESS_LATENCY':
        resonanceEngine.processLatency((payload as any).latency);
        result = { success: true };
        break;

      case 'ANALYZE_CORRELATION':
        result = resonanceEngine.analyzeCorrelation();
        break;

      case 'GET_METRICS':
        result = resonanceEngine.getMetrics();
        break;

      case 'RESET':
        resonanceEngine.reset();
        result = { success: true };
        break;

      default:
        throw new Error(`Unknown message type: ${type}`);
    }

    const processingTime = performance.now() - startTime;

    const response: ResonanceWorkerResponse = {
      type: 'RESONANCE_RESULT',
      id,
      payload: result,
      processingTime
    };

    self.postMessage(response);

  } catch (error) {
    const processingTime = performance.now() - startTime;

    const errorResponse: ResonanceWorkerResponse = {
      type: 'RESONANCE_ERROR',
      id,
      payload: {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      },
      processingTime
    };

    self.postMessage(errorResponse);
  }
};

// Cleanup on termination
self.addEventListener('beforeunload', () => {
  resonanceEngine.cleanup();
});

// Export pour TypeScript (ne sera pas utilisé dans le contexte worker)
export default resonanceEngine;