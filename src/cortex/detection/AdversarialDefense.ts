/**
 * AdversarialDefense — Détection de contournement et d'empoisonnement (F-11)
 *
 * Protège le moteur Cortex contre les techniques d'évasion,
 * l'empoisonnement du RAG, et les attaques ciblant le moteur lui-même.
 */

import {
  CortexSignal,
  AdversarialAssessment,
  AdversarialTechnique,
  PoisoningAlert,
  CandidateSignature,
  cosineSimilarity,
} from '../CortexTypes';
import { SecureRandom } from '@shared/utils/secureRandom';

const WINDOW_SIZE = 200;
const POISONING_SIMILARITY_THRESHOLD = 0.80;
const POISONING_MIN_COUNT = 5;
const DEFENSIVE_JITTER_RANGE = 0.15;

export class AdversarialDefense {
  private recentSignals: CortexSignal[] = [];
  private defensiveMode = false;

  evaluateSignal(signal: CortexSignal): AdversarialAssessment {
    this.pushSignal(signal);

    const techniques: AdversarialTechnique[] = [];
    let score = 0;

    // Delayed execution: mutation longtemps après la dernière interaction
    if (
      signal.payload.timeSinceLastUserAction !== undefined &&
      signal.payload.timeSinceLastUserAction > 5000
    ) {
      techniques.push('delayed_execution');
      score += 0.15;
    }

    // Conditional execution: metadata indiquant une vérification d'environnement
    if (signal.payload.metadata?.environmentCheck) {
      techniques.push('conditional_execution');
      score += 0.20;
    }

    // Anti-debug: détection de tentatives anti-debug
    if (signal.payload.metadata?.antiDebug) {
      techniques.push('anti_debug');
      score += 0.25;
    }

    // Micro-mutations: mutations très fréquentes de petite taille
    if (
      signal.payload.mutationCount !== undefined &&
      signal.payload.mutationCount > 100 &&
      signal.resonanceSnapshot.shadowMutationRatio > 0.8
    ) {
      techniques.push('micro_mutation');
      score += 0.15;
    }

    // Noise flooding: ratio de shadow mutations élevé avec jitter bas
    // (beaucoup de mutations mais pas de stress visible = bruit intentionnel)
    if (
      signal.resonanceSnapshot.shadowMutationRatio > 0.9 &&
      signal.resonanceSnapshot.jitter < 1
    ) {
      techniques.push('noise_flooding');
      score += 0.15;
    }

    // Timing evasion: exécution à intervalles réguliers (pattern setInterval)
    const timingScore = this.detectTimingPattern();
    if (timingScore > 0.5) {
      techniques.push('timing_evasion');
      score += 0.10;
    }

    // Progressive obfuscation: séquences de mutations de scripts
    if (signal.payload.metadata?.obfuscationDepth) {
      const depth = signal.payload.metadata.obfuscationDepth as number;
      if (depth > 2) {
        techniques.push('progressive_obfuscation');
        score += 0.15;
      }
    }

    // Polymorphic code: hash de script qui change à chaque occurrence
    if (this.detectPolymorphicBehavior(signal)) {
      techniques.push('polymorphic_code');
      score += 0.20;
    }

    score = Math.min(1, score);

    const poisoningRisk = this.estimatePoisoningRisk();

    return {
      score,
      detectedTechniques: techniques,
      poisoningRisk,
      recommendDefensiveMode: score > 0.6 || poisoningRisk > 0.5,
    };
  }

  detectPoisoning(
    recentCandidates: CandidateSignature[],
  ): PoisoningAlert | null {
    if (recentCandidates.length < POISONING_MIN_COUNT) return null;

    const suspectedPairs: Array<{ i: number; j: number; sim: number }> = [];

    for (let i = 0; i < recentCandidates.length; i++) {
      for (let j = i + 1; j < recentCandidates.length; j++) {
        const sim = cosineSimilarity(
          recentCandidates[i].pattern.featureVector,
          recentCandidates[j].pattern.featureVector,
        );
        if (sim > POISONING_SIMILARITY_THRESHOLD) {
          suspectedPairs.push({ i, j, sim });
        }
      }
    }

    if (suspectedPairs.length < 3) return null;

    const suspectedIdSet = new Set<string>();
    for (const pair of suspectedPairs) {
      suspectedIdSet.add(recentCandidates[pair.i].sourceSignalId);
      suspectedIdSet.add(recentCandidates[pair.j].sourceSignalId);
    }

    const avgSimilarity =
      suspectedPairs.reduce((sum, p) => sum + p.sim, 0) /
      suspectedPairs.length;

    return {
      suspectedSignatureIds: Array.from(suspectedIdSet),
      commonPatternHash: `poisoning_${Date.now()}`,
      occurrenceCount: suspectedPairs.length,
      similarity: avgSimilarity,
      recommendation: suspectedPairs.length > 5 ? 'reject' : 'quarantine',
    };
  }

  activateDefensiveMode(): void {
    this.defensiveMode = true;
  }

  deactivateDefensiveMode(): void {
    this.defensiveMode = false;
  }

  isDefensiveMode(): boolean {
    return this.defensiveMode;
  }

  applyDefensiveJitter(baseIntervalMs: number): number {
    const jitter =
      (SecureRandom.random() * 2 - 1) * DEFENSIVE_JITTER_RANGE;
    return Math.round(baseIntervalMs * (1 + jitter));
  }

  // ─── Internal detection helpers ───────────────────────────────────

  private pushSignal(signal: CortexSignal): void {
    this.recentSignals.push(signal);
    if (this.recentSignals.length > WINDOW_SIZE) {
      this.recentSignals.shift();
    }
  }

  private detectTimingPattern(): number {
    if (this.recentSignals.length < 5) return 0;

    const recent = this.recentSignals.slice(-20);
    if (recent.length < 3) return 0;

    const intervals: number[] = [];
    for (let i = 1; i < recent.length; i++) {
      intervals.push(recent[i].timestamp - recent[i - 1].timestamp);
    }

    if (intervals.length < 2) return 0;

    const mean =
      intervals.reduce((sum, v) => sum + v, 0) / intervals.length;
    if (mean === 0) return 0;

    const variance =
      intervals.reduce((sum, v) => sum + (v - mean) ** 2, 0) /
      intervals.length;
    const cv = Math.sqrt(variance) / mean; // Coefficient of variation

    // CV bas = intervalles très réguliers = suspect
    if (cv < 0.1) return 0.8;
    if (cv < 0.2) return 0.5;
    if (cv < 0.3) return 0.2;
    return 0;
  }

  private detectPolymorphicBehavior(signal: CortexSignal): boolean {
    if (!signal.payload.scriptHash) return false;

    const sameSource = this.recentSignals.filter(
      (s) =>
        s.source === signal.source &&
        s.payload.elementSelector === signal.payload.elementSelector &&
        s.payload.scriptHash &&
        s.payload.scriptHash !== signal.payload.scriptHash,
    );

    // ≥ 3 hash différents pour la même source = comportement polymorphique
    const uniqueHashes = new Set(sameSource.map((s) => s.payload.scriptHash));
    return uniqueHashes.size >= 3;
  }

  private estimatePoisoningRisk(): number {
    if (this.recentSignals.length < 10) return 0;

    const recent = this.recentSignals.slice(-50);
    const sameSourceCounts = new Map<string, number>();

    for (const sig of recent) {
      const key = `${sig.source}_${sig.payload.type}`;
      sameSourceCounts.set(key, (sameSourceCounts.get(key) || 0) + 1);
    }

    let maxCount = 0;
    for (const count of sameSourceCounts.values()) {
      if (count > maxCount) maxCount = count;
    }

    // Si un pattern se répète beaucoup → risque d'empoisonnement
    const repetitionRatio = maxCount / recent.length;
    return Math.min(1, repetitionRatio * 1.5);
  }
}
