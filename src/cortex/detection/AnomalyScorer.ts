/**
 * AnomalyScorer — Scoring d'anomalie composite non-linéaire
 *
 * Agrège les signaux du NeuralMesh/DOMResonanceSensor en un score
 * d'anomalie composite avec amplification non-linéaire par interactions.
 */

import {
  CortexSignal,
  AnomalyResult,
  AnomalyFactor,
  SignatureMatch,
  SignaturePattern,
} from '../CortexTypes';
import { ActiveRAGStore } from '../rag/ActiveRAGStore';
import { AdversarialDefense } from './AdversarialDefense';

const HIGH_FACTOR_THRESHOLD = 0.6;
const INTERACTION_BOOST_INCREMENT = 0.15;

export class AnomalyScorer {
  private ragStore: ActiveRAGStore;
  private adversarial: AdversarialDefense;

  constructor(ragStore: ActiveRAGStore, adversarial: AdversarialDefense) {
    this.ragStore = ragStore;
    this.adversarial = adversarial;
  }

  async score(signal: CortexSignal): Promise<AnomalyResult> {
    const startTime = performance.now();

    // 1. Calculer les facteurs individuels
    const factors = this.computeFactors(signal);

    // 2. Score de base (somme pondérée)
    let baseScore = 0;
    for (const factor of factors) {
      baseScore += factor.contribution;
    }

    // 3. Amplification non-linéaire par interactions
    const highFactors = factors.filter(
      (f) => f.normalizedValue > HIGH_FACTOR_THRESHOLD,
    );
    let interactionBoost = 1.0;
    if (highFactors.length >= 2) {
      interactionBoost =
        1.0 + (highFactors.length - 1) * INTERACTION_BOOST_INCREMENT;
    }

    // 4. Recherche RAG pour correspondances
    let matchedSignatures: SignatureMatch[] = [];
    const ragAttenuation = 1.0;

    try {
      const signaturePattern = this.buildQuickPattern(signal);
      matchedSignatures = await this.ragStore.findSimilar(signaturePattern, 0.6);

      // Atténuation si correspondance forte avec signature bénigne connue
      // (une signature confirmed a déjà été validée)
      // On n'atténue pas — les signatures confirmed sont des menaces.
      // L'atténuation ne s'applique que si le scoring historique du site est bas.
    } catch {
      // RAG indisponible → pas de matching, pas d'atténuation
    }

    // 5. Score final
    const anomalyScore = Math.min(
      1,
      Math.max(0, baseScore * interactionBoost * ragAttenuation),
    );

    // 6. Confiance : plus de facteurs hauts = plus de confiance
    const confidence = this.computeConfidence(factors, highFactors.length);

    // 7. Évaluation adversariale
    const adversarialAssessment = this.adversarial.evaluateSignal(signal);

    return {
      signalId: signal.id,
      anomalyScore,
      matchedSignatures,
      adversarialAssessment,
      confidence,
      factors,
      computeTimeMs: performance.now() - startTime,
    };
  }

  private computeFactors(signal: CortexSignal): AnomalyFactor[] {
    const resonance = signal.resonanceSnapshot.level;
    const shadowRatio = signal.resonanceSnapshot.shadowMutationRatio;
    const scriptScore = this.computeScriptScore(signal);
    const temporalScore = this.computeTemporalScore(signal);
    const networkScore = this.computeNetworkScore(signal);
    const userCorrelation = this.computeUserCorrelation(signal);
    const jitterScore = this.computeJitterScore(signal);

    const rawFactors: Array<{ name: string; value: number; weight: number }> =
      [
        { name: 'resonance', value: resonance, weight: 0.20 },
        { name: 'shadow_ratio', value: shadowRatio, weight: 0.18 },
        { name: 'script_injection', value: scriptScore, weight: 0.18 },
        { name: 'temporal_anomaly', value: temporalScore, weight: 0.14 },
        { name: 'network_anomaly', value: networkScore, weight: 0.12 },
        { name: 'jitter', value: jitterScore, weight: 0.11 },
        { name: 'user_correlation', value: userCorrelation, weight: 0.07 },
      ];

    return rawFactors.map((f) => ({
      name: f.name,
      rawValue: f.value,
      normalizedValue: Math.min(1, Math.max(0, f.value)),
      weight: f.weight,
      contribution: Math.min(1, Math.max(0, f.value)) * f.weight,
    }));
  }

  private computeScriptScore(signal: CortexSignal): number {
    let score = 0;
    const meta = signal.payload.metadata;

    if (signal.source === 'script_injection') score += 0.5;
    if (signal.payload.scriptHash) score += 0.2;
    if (meta?.hasEval) score += 0.3;
    if (meta?.obfuscationDepth && (meta.obfuscationDepth as number) > 1)
      score += 0.4;
    if (meta?.longEncodedString) score += 0.2;

    return Math.min(1, score);
  }

  private computeTemporalScore(signal: CortexSignal): number {
    const delay = signal.payload.timeSinceLastUserAction;
    if (delay === undefined) return 0;

    // Plus le délai depuis la dernière action utilisateur est long,
    // plus c'est suspect (mutation sans interaction)
    if (delay > 30000) return 0.9;
    if (delay > 10000) return 0.7;
    if (delay > 5000) return 0.5;
    if (delay > 2000) return 0.3;
    return 0.1;
  }

  private computeNetworkScore(signal: CortexSignal): number {
    let score = 0;

    if (signal.source === 'network_request') score += 0.3;
    if (signal.payload.networkTarget) score += 0.3;
    if (signal.payload.metadata?.isThirdParty) score += 0.2;
    if (signal.payload.metadata?.largePayload) score += 0.2;

    return Math.min(1, score);
  }

  private computeUserCorrelation(signal: CortexSignal): number {
    // Inverse de la corrélation : plus c'est découplé de l'utilisateur, plus c'est suspect
    const ratio = signal.resonanceSnapshot.shadowMutationRatio;
    return ratio; // 0 = toutes les mutations sont liées à l'utilisateur, 1 = aucune
  }

  private computeJitterScore(signal: CortexSignal): number {
    const jitter = signal.resonanceSnapshot.jitter;
    // Jitter élevé indique du stress DOM
    if (jitter > 10) return 0.9;
    if (jitter > 5) return 0.6;
    if (jitter > 2) return 0.3;
    return 0.1;
  }

  private computeConfidence(
    factors: AnomalyFactor[],
    highFactorCount: number,
  ): number {
    // Confiance basée sur le nombre de facteurs convergents
    const nonZeroFactors = factors.filter((f) => f.normalizedValue > 0.1);
    const coverageRatio = nonZeroFactors.length / factors.length;

    let confidence = coverageRatio * 0.5;

    if (highFactorCount >= 3) confidence += 0.3;
    else if (highFactorCount >= 2) confidence += 0.2;
    else if (highFactorCount >= 1) confidence += 0.1;

    // Bonus si les facteurs sont cohérents (faible variance)
    const values = factors.map((f) => f.normalizedValue);
    const mean = values.reduce((s, v) => s + v, 0) / values.length;
    const variance =
      values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length;

    if (variance < 0.05) confidence += 0.1; // Très cohérent

    return Math.min(0.95, confidence);
  }

  private buildQuickPattern(signal: CortexSignal): SignaturePattern {
    // Construction rapide d'un pattern partiel pour le matching
    const vec = new Float32Array(48);

    // Profil DOM [0-7]
    vec[0] = signal.resonanceSnapshot.level;
    vec[1] = signal.resonanceSnapshot.shadowMutationRatio;
    vec[2] = Math.min(1, (signal.payload.mutationCount ?? 0) / 100);
    vec[3] = signal.resonanceSnapshot.jitter / 10;

    // Profil script [8-15]
    vec[8] = signal.source === 'script_injection' ? 1 : 0;
    vec[9] = signal.payload.scriptHash ? 0.5 : 0;
    vec[10] = (signal.payload.metadata?.obfuscationDepth as number) ?? 0;

    // Profil réseau [16-23]
    vec[16] = signal.source === 'network_request' ? 1 : 0;
    vec[17] = signal.payload.networkTarget ? 0.5 : 0;

    // Profil temporel [24-31]
    const delay = signal.payload.timeSinceLastUserAction ?? 0;
    vec[24] = Math.min(1, delay / 30000);

    // Profil fingerprinting [32-39]
    vec[32] = signal.source === 'css_fingerprint' ? 1 : 0;
    vec[33] = signal.source === 'webrtc_probe' ? 1 : 0;

    return {
      version: 1,
      featureVector: vec,
      dominantCategory: 'unknown',
      textualHint: `quick_match_${signal.source}`,
    };
  }
}
