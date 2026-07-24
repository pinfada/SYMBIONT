/**
 * CognitiveTelemetry — Journal local chiffré des décisions cognitives (F-09)
 *
 * Stockage local uniquement. Aucune transmission réseau.
 * Les entrées sont bufferisées puis flushées par batch chiffré.
 */

import {
  CognitiveLogEntry,
  CognitiveEventType,
  CortexMetrics,
  CortexState,
  ResourceBudget,
} from '../CortexTypes';
import { generateSecureUUID } from '@shared/utils/uuid';

const BUFFER_FLUSH_SIZE = 20;
const MAX_TOTAL_ENTRIES = 1000;
const MAX_AGE_MS = 604_800_000; // 7 jours
const STORE_KEY_PREFIX = 'cortex_telemetry_';

interface RunningMetrics {
  totalSignals: number;
  draftCount: number;
  oracleCount: number;
  draftLatencySum: number;
  oracleLatencySum: number;
  falsePositives: number;
  truePositives: number;
  hibernationCount: number;
  anomalyScoreSum: number;
  startTime: number;
}

interface StorageLike {
  store(key: string, data: unknown): Promise<void>;
  retrieve(key: string): Promise<unknown>;
}

interface EncryptorLike {
  encryptSensitiveData(data: unknown): Promise<string>;
}

export class CognitiveTelemetry {
  private encryptor: EncryptorLike;
  private storage: StorageLike;
  private buffer: CognitiveLogEntry[] = [];
  private batchIndex = 0;
  private totalEntries = 0;
  private metrics: RunningMetrics;

  constructor(encryptor: EncryptorLike, storage: StorageLike) {
    this.encryptor = encryptor;
    this.storage = storage;
    this.metrics = {
      totalSignals: 0,
      draftCount: 0,
      oracleCount: 0,
      draftLatencySum: 0,
      oracleLatencySum: 0,
      falsePositives: 0,
      truePositives: 0,
      hibernationCount: 0,
      anomalyScoreSum: 0,
      startTime: Date.now(),
    };
  }

  async log(
    type: CognitiveEventType,
    details?: Record<string, unknown>,
  ): Promise<void> {
    const stateTransition = details?.stateTransition as
      | { from: CortexState; to: CortexState }
      | undefined;

    const entry: CognitiveLogEntry = {
      id: generateSecureUUID(),
      timestamp: Date.now(),
      type,
      durationMs: (details?.durationMs as number) ?? 0,
      ...(details?.signalId !== undefined ? { signalId: details.signalId as string } : {}),
      ...(details?.tabId !== undefined ? { tabId: details.tabId as number } : {}),
      ...(details?.diagnosticSummary !== undefined
        ? { diagnosticSummary: details.diagnosticSummary as string }
        : {}),
      ...(details?.resourceSnapshot !== undefined
        ? { resourceSnapshot: details.resourceSnapshot as ResourceBudget }
        : {}),
      ...(details?.decision !== undefined ? { decision: details.decision as string } : {}),
      ...(stateTransition !== undefined ? { stateTransition } : {}),
      ...(details !== undefined ? { metadata: details } : {}),
    };

    this.updateRunningMetrics(type, details);
    this.buffer.push(entry);

    if (this.buffer.length >= BUFFER_FLUSH_SIZE) {
      await this.flushBuffer();
    }
  }

  private updateRunningMetrics(
    type: CognitiveEventType,
    details?: Record<string, unknown>,
  ): void {
    switch (type) {
      case 'trivial_decision':
      case 'ambiguity_detected':
        this.metrics.totalSignals++;
        if (details?.score !== undefined) {
          this.metrics.anomalyScoreSum += details.score as number;
        }
        break;

      case 'draft_result':
        this.metrics.draftCount++;
        this.metrics.totalSignals++;
        if (details?.processingTimeMs !== undefined) {
          this.metrics.draftLatencySum += details.processingTimeMs as number;
        }
        break;

      case 'oracle_result':
        this.metrics.oracleCount++;
        if (details?.processingTimeMs !== undefined) {
          this.metrics.oracleLatencySum += details.processingTimeMs as number;
        }
        break;

      case 'hibernation_entered':
        this.metrics.hibernationCount++;
        break;

      case 'signature_deprecated':
        this.metrics.falsePositives++;
        break;

      case 'signature_promoted':
        this.metrics.truePositives++;
        break;
    }
  }

  async getAggregatedMetrics(): Promise<CortexMetrics> {
    const m = this.metrics;
    return {
      totalSignalsProcessed: m.totalSignals,
      draftAnalysesCount: m.draftCount,
      oracleAnalysesCount: m.oracleCount,
      averageDraftLatencyMs:
        m.draftCount > 0 ? m.draftLatencySum / m.draftCount : 0,
      averageOracleLatencyMs:
        m.oracleCount > 0 ? m.oracleLatencySum / m.oracleCount : 0,
      falsePositiveRate:
        m.totalSignals > 0 ? m.falsePositives / m.totalSignals : 0,
      escalationRate:
        m.totalSignals > 0 ? m.oracleCount / m.totalSignals : 0,
      hibernationCount: m.hibernationCount,
      averageAnomalyScore:
        m.totalSignals > 0 ? m.anomalyScoreSum / m.totalSignals : 0,
      signatureStats: {
        candidates: 0,
        probation: 0,
        confirmed: 0,
        deprecated: 0,
        quarantined: 0,
      },
      uptime: Date.now() - m.startTime,
    };
  }

  getRecentConfidence(): number {
    const total = this.metrics.truePositives + this.metrics.falsePositives;
    if (total === 0) return 0.5; // Neutre au cold start
    return this.metrics.truePositives / total;
  }

  getEscalationRate(): number {
    if (this.metrics.totalSignals === 0) return 0;
    return this.metrics.oracleCount / this.metrics.totalSignals;
  }

  getFalsePositiveRate(): number {
    const total = this.metrics.truePositives + this.metrics.falsePositives;
    if (total === 0) return 0;
    return this.metrics.falsePositives / total;
  }

  private async flushBuffer(): Promise<void> {
    if (this.buffer.length === 0) return;

    const batch = this.buffer.splice(0, BUFFER_FLUSH_SIZE);
    const batchId = `${STORE_KEY_PREFIX}${this.batchIndex++}`;

    try {
      const encrypted = await this.encryptor.encryptSensitiveData(batch);
      await this.storage.store(batchId, encrypted);
      this.totalEntries += batch.length;

      if (this.totalEntries > MAX_TOTAL_ENTRIES) {
        await this.pruneOldBatches();
      }
    } catch {
      // Si le chiffrement ou le stockage échoue, les entrées sont perdues.
      // Acceptable car la télémétrie n'est pas critique pour le fonctionnement.
    }
  }

  private async pruneOldBatches(): Promise<void> {
    const oldestBatchToKeep = Math.max(
      0,
      this.batchIndex - Math.ceil(MAX_TOTAL_ENTRIES / BUFFER_FLUSH_SIZE),
    );
    for (let i = 0; i < oldestBatchToKeep; i++) {
      try {
        await this.storage.store(`${STORE_KEY_PREFIX}${i}`, null);
      } catch {
        // Ignorer les erreurs de purge
      }
    }
    this.totalEntries = Math.min(this.totalEntries, MAX_TOTAL_ENTRIES);
  }

  async forceFlush(): Promise<void> {
    await this.flushBuffer();
  }

  resetMetrics(): void {
    this.metrics = {
      totalSignals: 0,
      draftCount: 0,
      oracleCount: 0,
      draftLatencySum: 0,
      oracleLatencySum: 0,
      falsePositives: 0,
      truePositives: 0,
      hibernationCount: 0,
      anomalyScoreSum: 0,
      startTime: Date.now(),
    };
  }
}
