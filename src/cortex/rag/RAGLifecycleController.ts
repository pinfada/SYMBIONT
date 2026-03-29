/**
 * RAGLifecycleController — Gestion du cycle de vie des signatures (F-07)
 *
 * Cycle : candidate → probation → confirmed → deprecated
 * Avec protection anti-empoisonnement et quarantaine.
 * Revue périodique (LOOP du diagramme de séquence).
 */

import {
  CandidateSignature,
  SignatureStatus,
  ThreatSignature,
} from '../CortexTypes';
import { ActiveRAGStore } from './ActiveRAGStore';
import { CognitiveTelemetry } from '../telemetry/CognitiveTelemetry';
import { AdversarialDefense } from '../detection/AdversarialDefense';

const DEFAULT_REVIEW_INTERVAL_MS = 300_000; // 5 min
const CANDIDATE_TO_PROBATION_MIN_OCCURRENCES = 3;
const CANDIDATE_TO_PROBATION_MAX_FP_RATE = 0.30;
const PROBATION_TO_CONFIRMED_MIN_OCCURRENCES = 7;
const PROBATION_TO_CONFIRMED_MAX_FP_RATE = 0.15;
const PROBATION_TO_CONFIRMED_MIN_AGE_MS = 86_400_000; // 24h
const CONFIRMED_DEPRECATION_FP_RATE = 0.40;
const CONFIRMED_DEPRECATION_STALE_MS = 2_592_000_000; // 30 jours
const CANDIDATE_STALE_MS = 172_800_000; // 48h
const PROBATION_STALE_MS = 259_200_000; // 72h
const QUARANTINE_EXPIRY_MS = 604_800_000; // 7 jours
const REHABILITATION_MIN_CONFIDENCE = 0.85;

export class RAGLifecycleController {
  private store: ActiveRAGStore;
  private telemetry: CognitiveTelemetry;
  private adversarial: AdversarialDefense;
  private reviewTimer: ReturnType<typeof setInterval> | null = null;

  constructor(
    store: ActiveRAGStore,
    telemetry: CognitiveTelemetry,
    adversarial: AdversarialDefense,
  ) {
    this.store = store;
    this.telemetry = telemetry;
    this.adversarial = adversarial;
  }

  async registerCandidate(sig: CandidateSignature): Promise<void> {
    await this.store.addCandidate(sig);
    await this.telemetry.log('signature_candidate_created', {
      category: sig.pattern.dominantCategory,
      confidence: sig.initialConfidence,
    });
  }

  startPeriodicReview(intervalMs: number = DEFAULT_REVIEW_INTERVAL_MS): void {
    this.stopPeriodicReview();
    this.reviewTimer = setInterval(() => {
      this.performReview().catch(() => {
        // Silencieux — la revue n'est pas critique
      });
    }, intervalMs);
  }

  stopPeriodicReview(): void {
    if (this.reviewTimer !== null) {
      clearInterval(this.reviewTimer);
      this.reviewTimer = null;
    }
  }

  async recordOccurrence(signatureId: string): Promise<void> {
    await this.store.recordOccurrence(signatureId);
  }

  async recordFalsePositive(signatureId: string): Promise<void> {
    await this.store.recordFalsePositive(signatureId);
  }

  async recordTruePositive(signatureId: string): Promise<void> {
    await this.store.recordTruePositive(signatureId);
  }

  async performReview(): Promise<void> {
    const candidates = await this.store.getCandidatesForReview();

    // Vérification anti-empoisonnement globale
    const recentCandidates = await this.store.getRecentCandidates(3600_000);
    const candidateSignatures = recentCandidates.map((c) => ({
      pattern: c.pattern,
      sourceSignalId: c.id,
      generatedBy: 'oracle' as const,
      initialConfidence: c.confidence,
      contextSnapshot: {
        urlHash: c.sourceContext.urlHash,
        tabId: 0,
        timestamp: c.createdAt,
        relatedSignalCount: 0,
      },
    }));

    const poisoningAlert = this.adversarial.detectPoisoning(candidateSignatures);
    if (poisoningAlert) {
      // Mettre en quarantaine les signatures suspectes
      for (const sigId of poisoningAlert.suspectedSignatureIds) {
        const match = recentCandidates.find(
          (c) => c.id === sigId || c.sourceContext.generatedByOracleId === sigId,
        );
        if (match) {
          await this.store.updateStatus(match.id, 'quarantined', 'poisoning_detected');
          await this.telemetry.log('signature_quarantined', {
            signatureId: match.id,
            similarity: poisoningAlert.similarity,
          });
        }
      }
    }

    // Revue individuelle
    for (const sig of candidates) {
      if (sig.status === 'quarantined') continue; // Déjà traité

      const newStatus = this.evaluateMaturity(sig);
      if (newStatus !== sig.status) {
        await this.store.updateStatus(sig.id, newStatus, this.getTransitionReason(sig.status, newStatus, sig));

        if (newStatus === 'confirmed') {
          await this.telemetry.log('signature_promoted', {
            signatureId: sig.id,
            from: sig.status,
            to: newStatus,
          });
        } else if (newStatus === 'deprecated') {
          await this.telemetry.log('signature_deprecated', {
            signatureId: sig.id,
            from: sig.status,
            to: newStatus,
            falsePositiveRate: this.getFPRate(sig),
          });
        }
      }
    }

    // Purger les signatures dépréciées anciennes (> 30 jours)
    await this.store.pruneDeprecated(CONFIRMED_DEPRECATION_STALE_MS);
  }

  private evaluateMaturity(sig: ThreatSignature): SignatureStatus {
    const fpRate = this.getFPRate(sig);
    const age = Date.now() - sig.createdAt;

    switch (sig.status) {
      case 'candidate':
        if (
          sig.occurrenceCount >= CANDIDATE_TO_PROBATION_MIN_OCCURRENCES &&
          fpRate < CANDIDATE_TO_PROBATION_MAX_FP_RATE
        ) {
          return 'probation';
        }
        if (age > CANDIDATE_STALE_MS && sig.occurrenceCount < 2) {
          return 'deprecated';
        }
        return 'candidate';

      case 'probation':
        if (
          sig.occurrenceCount >= PROBATION_TO_CONFIRMED_MIN_OCCURRENCES &&
          fpRate < PROBATION_TO_CONFIRMED_MAX_FP_RATE &&
          age > PROBATION_TO_CONFIRMED_MIN_AGE_MS
        ) {
          return 'confirmed';
        }
        if (fpRate > 0.50 || (sig.truePositiveCount < 2 && age > PROBATION_STALE_MS)) {
          return 'deprecated';
        }
        return 'probation';

      case 'confirmed':
        if (fpRate > CONFIRMED_DEPRECATION_FP_RATE) {
          return 'deprecated';
        }
        if (Date.now() - sig.lastSeenAt > CONFIRMED_DEPRECATION_STALE_MS) {
          return 'deprecated';
        }
        return 'confirmed';

      case 'deprecated':
        // Réhabilitation possible
        if (sig.confidence > REHABILITATION_MIN_CONFIDENCE) {
          return 'candidate';
        }
        return 'deprecated';

      case 'quarantined':
        if (age > QUARANTINE_EXPIRY_MS) {
          return 'deprecated';
        }
        return 'quarantined';

      default:
        return sig.status;
    }
  }

  private getFPRate(sig: ThreatSignature): number {
    return sig.occurrenceCount > 0
      ? sig.falsePositiveCount / sig.occurrenceCount
      : 0;
  }

  private getTransitionReason(
    from: SignatureStatus,
    to: SignatureStatus,
    sig: ThreatSignature,
  ): string {
    const fpRate = this.getFPRate(sig);

    if (to === 'probation')
      return `Occurrences (${sig.occurrenceCount}) >= ${CANDIDATE_TO_PROBATION_MIN_OCCURRENCES}, FP rate (${fpRate.toFixed(2)}) < ${CANDIDATE_TO_PROBATION_MAX_FP_RATE}`;
    if (to === 'confirmed')
      return `Occurrences (${sig.occurrenceCount}) >= ${PROBATION_TO_CONFIRMED_MIN_OCCURRENCES}, FP rate (${fpRate.toFixed(2)}) < ${PROBATION_TO_CONFIRMED_MAX_FP_RATE}`;
    if (to === 'deprecated' && from === 'confirmed')
      return `FP rate (${fpRate.toFixed(2)}) > ${CONFIRMED_DEPRECATION_FP_RATE} or stale`;
    if (to === 'deprecated' && from === 'candidate')
      return `Stale candidate: ${sig.occurrenceCount} occurrences in ${Math.round((Date.now() - sig.createdAt) / 3600000)}h`;
    if (to === 'deprecated' && from === 'probation')
      return `FP rate too high or insufficient true positives`;
    if (to === 'quarantined')
      return 'Poisoning detected';
    if (to === 'candidate' && from === 'deprecated')
      return `Rehabilitation: confidence (${sig.confidence.toFixed(2)}) > ${REHABILITATION_MIN_CONFIDENCE}`;

    return `Transition ${from} → ${to}`;
  }
}
