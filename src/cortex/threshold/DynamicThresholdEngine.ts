/**
 * DynamicThresholdEngine — Seuil d'activation contextuel adaptatif (F-05)
 *
 * Calcule un seuil dynamique avec lissage EMA et double amortissement
 * anti-oscillation. S'auto-calibre en fonction des métriques long-terme.
 */

import { ThresholdInputs, ThresholdContext, CortexMetrics } from '../CortexTypes';

const DEFAULT_BASE_THRESHOLD = 0.50;
const MIN_THRESHOLD = 0.15;
const MAX_THRESHOLD = 0.85;
const EMA_ALPHA = 0.15;
const DAMPING_THRESHOLD = 0.08;
const MIN_BASE = 0.35;
const MAX_BASE = 0.65;

export class DynamicThresholdEngine {
  private baseThreshold: number = DEFAULT_BASE_THRESHOLD;
  private previousThreshold: number = DEFAULT_BASE_THRESHOLD;

  getCurrentThreshold(inputs: ThresholdInputs): ThresholdContext {
    // Calcul brut avec pondération des 6 facteurs
    const raw =
      this.baseThreshold +
      inputs.systemLoad * 0.25 -            // ↑ charge    → ↑ seuil
      inputs.siteRiskScore * 0.30 +          // ↑ risque    → ↓ seuil
      inputs.thermalPressure * 0.20 -        // ↑ chaleur   → ↑ seuil
      inputs.adversarialSuspicion * 0.15 +   // ↑ suspicion → ↓ seuil
      inputs.historicalConfidence * 0.10 -   // ↑ confiance → ↑ seuil
      inputs.recentEscalationRate * 0.10;    // ↑ escalades → ↓ seuil

    // Double amortissement anti-oscillation
    const delta = Math.abs(raw - this.previousThreshold);
    let dampingApplied = false;
    let effectiveAlpha = EMA_ALPHA;

    if (delta > DAMPING_THRESHOLD) {
      effectiveAlpha = EMA_ALPHA * 0.5;
      dampingApplied = true;
    }

    const smoothed =
      effectiveAlpha * raw + (1 - effectiveAlpha) * this.previousThreshold;
    const final = Math.min(MAX_THRESHOLD, Math.max(MIN_THRESHOLD, smoothed));
    this.previousThreshold = final;

    return {
      currentThreshold: final,
      rawThreshold: raw,
      inputs,
      dampingApplied,
    };
  }

  calibrate(metrics: CortexMetrics): void {
    // Auto-calibration long-terme
    if (metrics.escalationRate > 0.3) {
      // Trop d'escalades → monter le seuil de base
      this.baseThreshold = Math.min(MAX_BASE, this.baseThreshold + 0.02);
    }
    if (metrics.falsePositiveRate > 0.2) {
      // Trop de faux positifs → monter le seuil
      this.baseThreshold = Math.min(MAX_BASE, this.baseThreshold + 0.03);
    }
    if (metrics.falsePositiveRate < 0.05 && metrics.escalationRate < 0.05) {
      // Système trop permissif → baisser le seuil
      this.baseThreshold = Math.max(MIN_BASE, this.baseThreshold - 0.02);
    }
  }

  reset(): void {
    this.baseThreshold = DEFAULT_BASE_THRESHOLD;
    this.previousThreshold = DEFAULT_BASE_THRESHOLD;
  }

  getBaseThreshold(): number {
    return this.baseThreshold;
  }
}
