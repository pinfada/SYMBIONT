/**
 * OracleModel — Analyse cognitive profonde via Web Worker (F-04)
 *
 * Exécute l'analyse dans un CortexWorker dédié avec :
 * - CircuitBreaker pour gérer les crashes worker
 * - Fallback sur le thread principal si le worker est indisponible
 * - Budget strict (timeout, rate limiting via DeepReasoningGuard)
 */

import {
  CortexSignal,
  DiagnosticResult,
  ResourceBudget,
  OracleInput,
  CortexWorkerMessage,
  CortexWorkerResponse,
  SiteHistoryEntry,
  ThreatSignature,
} from '../CortexTypes';
import { CircuitBreaker } from '@shared/patterns/CircuitBreaker';

const CIRCUIT_BREAKER_FAILURE_THRESHOLD = 3;
const CIRCUIT_BREAKER_RESET_TIMEOUT = 60_000;

export class OracleModel {
  private worker: Worker | null = null;
  private workerReady = false;
  private circuitBreaker: CircuitBreaker;
  private pendingRequests: Map<
    string,
    {
      resolve: (result: DiagnosticResult) => void;
      reject: (error: Error) => void;
      timeout: ReturnType<typeof setTimeout>;
    }
  > = new Map();

  constructor() {
    this.circuitBreaker = new CircuitBreaker({
      failureThreshold: CIRCUIT_BREAKER_FAILURE_THRESHOLD,
      resetTimeout: CIRCUIT_BREAKER_RESET_TIMEOUT,
      monitoringPeriod: CIRCUIT_BREAKER_RESET_TIMEOUT * 2,
    });
  }

  async analyze(
    signal: CortexSignal,
    draftResult: DiagnosticResult,
    budget: ResourceBudget,
    recentSignals: CortexSignal[] = [],
    siteHistory: SiteHistoryEntry[] = [],
    confirmedSignatures: ThreatSignature[] = [],
  ): Promise<DiagnosticResult> {
    const input: OracleInput = {
      signal,
      draftResult,
      recentSignals: recentSignals.slice(-10),
      siteHistory,
      confirmedSignatures,
      budget,
    };

    // Essayer le worker si le circuit breaker le permet
    if (this.circuitBreaker.canExecute()) {
      try {
        const worker = this.ensureWorker();
        if (worker) {
          const result = await this.analyzeViaWorker(input, budget.maxAllowedDurationMs);
          this.circuitBreaker.recordSuccess();
          return result;
        }
      } catch (e) {
        this.circuitBreaker.recordFailure();
      }
    }

    // Fallback : exécution sur le thread principal avec budget réduit
    return this.analyzeOnMainThread(input);
  }

  private analyzeViaWorker(
    input: OracleInput,
    timeoutMs: number,
  ): Promise<DiagnosticResult> {
    return new Promise((resolve, reject) => {
      const requestId = `oracle_${Date.now()}_${Math.random().toString(36).slice(2)}`;

      const timeout = setTimeout(() => {
        this.pendingRequests.delete(requestId);
        // Envoyer un abort au worker
        if (this.worker) {
          const abortMsg: CortexWorkerMessage = { type: 'ABORT', id: requestId };
          this.worker.postMessage(abortMsg);
        }
        reject(new Error(`Oracle analysis timed out after ${timeoutMs}ms`));
      }, timeoutMs);

      this.pendingRequests.set(requestId, { resolve, reject, timeout });

      const msg: CortexWorkerMessage = {
        type: 'ORACLE_ANALYZE',
        id: requestId,
        payload: this.serializeInput(input),
      };

      this.worker!.postMessage(msg);
    });
  }

  private serializeInput(input: OracleInput): OracleInput {
    // Les Float32Array ne se sérialisent pas via postMessage structuré,
    // il faut les convertir en tableaux simples pour le transfer
    return {
      ...input,
      confirmedSignatures: input.confirmedSignatures.map((sig) => ({
        ...sig,
        pattern: {
          ...sig.pattern,
          featureVector: Array.from(sig.pattern.featureVector) as unknown as Float32Array,
        },
      })),
    };
  }

  private analyzeOnMainThread(input: OracleInput): DiagnosticResult {
    const startTime = performance.now();

    // Analyse simplifiée sur le thread principal
    let score = 0;
    let confidence = 0.4;

    // Utiliser le draft result comme base
    if (input.draftResult.verdict === 'suspicious') { score += 0.4; confidence += 0.1; }
    if (input.draftResult.verdict === 'malicious') { score += 0.6; confidence += 0.2; }

    // Facteurs structurels rapides
    const signal = input.signal;
    if (signal.resonanceSnapshot.shadowMutationRatio > 0.7) { score += 0.2; }
    if (signal.source === 'script_injection') { score += 0.2; }
    if (signal.payload.timeSinceLastUserAction && signal.payload.timeSinceLastUserAction > 5000) { score += 0.15; }

    score = Math.min(1, score);
    confidence = Math.min(0.75, confidence); // Confiance plafonnée en mode fallback

    const verdict = score > 0.7 ? 'malicious' as const :
                    score > 0.4 ? 'suspicious' as const :
                    score > 0.2 ? 'inconclusive' as const : 'benign' as const;

    const processingTimeMs = performance.now() - startTime;

    return {
      level: 'oracle',
      signalId: signal.id,
      verdict,
      confidence,
      explanation: `Fallback main-thread analysis (worker unavailable). Score: ${score.toFixed(2)}`,
      recommendedAction: verdict === 'malicious' ? 'block' :
                         verdict === 'suspicious' ? 'monitor' : 'ignore',
      processingTimeMs,
      resourceCost: {
        cpuTimeMs: processingTimeMs,
        peakMemoryDeltaBytes: 0,
        workerUsed: false,
      },
    };
  }

  private ensureWorker(): Worker | null {
    if (this.worker && this.workerReady) return this.worker;

    try {
      this.worker = new Worker(
        new URL('./CortexWorker', import.meta.url),
        { type: 'module' },
      );

      this.worker.onmessage = (event: MessageEvent<CortexWorkerResponse>) => {
        this.handleWorkerResponse(event.data);
      };

      this.worker.onerror = () => {
        this.workerReady = false;
        this.circuitBreaker.recordFailure();
        // Rejeter toutes les requêtes pendantes
        for (const [, req] of this.pendingRequests) {
          clearTimeout(req.timeout);
          req.reject(new Error('Worker crashed'));
        }
        this.pendingRequests.clear();
      };

      this.workerReady = true;
      return this.worker;
    } catch {
      this.workerReady = false;
      return null;
    }
  }

  private handleWorkerResponse(response: CortexWorkerResponse): void {
    const pending = this.pendingRequests.get(response.id);
    if (!pending) return;

    clearTimeout(pending.timeout);
    this.pendingRequests.delete(response.id);

    switch (response.type) {
      case 'ORACLE_RESULT':
        pending.resolve(response.payload);
        break;
      case 'ERROR':
        pending.reject(new Error(response.error));
        break;
      case 'TIMEOUT':
        pending.reject(new Error('Worker reported timeout'));
        break;
    }
  }

  async shutdown(): Promise<void> {
    for (const [, req] of this.pendingRequests) {
      clearTimeout(req.timeout);
      req.reject(new Error('OracleModel shutting down'));
    }
    this.pendingRequests.clear();

    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
      this.workerReady = false;
    }
  }
}
