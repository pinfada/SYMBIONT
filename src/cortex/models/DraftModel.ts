/**
 * DraftModel — Analyse cognitive rapide par système expert adaptatif (F-03)
 *
 * 19 règles heuristiques pondérées avec ajustement adaptatif
 * basé sur le feedback (faux positifs / vrais positifs).
 * Budget : max 50ms, pas de worker, pas de réseau.
 */

import {
  CortexSignal,
  DiagnosticResult,
  AnomalyResult,
  Verdict,
  RecommendedAction,
  ThreatCategory,
} from '../CortexTypes';

const MAX_PROCESSING_MS = 50;
const CONFIDENCE_SINGLE_RULE = 0.4;
const CONFIDENCE_MULTI_RULE_THRESHOLD = 3;
const MIN_WEIGHT = 0.05;
const WEIGHT_BOOST = 1.02;
const WEIGHT_PENALTY = 0.90;

interface RuleMatch {
  ruleId: string;
  strength: number;
  evidence: string;
}

interface WeightedRule {
  id: string;
  name: string;
  category: ThreatCategory;
  baseWeight: number;
  currentWeight: number;
  evaluate: (signal: CortexSignal, anomaly: AnomalyResult) => RuleMatch | null;
}

export class DraftModel {
  private rules: WeightedRule[];

  constructor() {
    this.rules = this.initializeRules();
  }

  analyze(signal: CortexSignal, anomalyResult: AnomalyResult): DiagnosticResult {
    const startTime = performance.now();
    const matches: RuleMatch[] = [];

    for (const rule of this.rules) {
      // Budget check
      if (performance.now() - startTime > MAX_PROCESSING_MS) break;

      const match = rule.evaluate(signal, anomalyResult);
      if (match) {
        matches.push(match);
      }
    }

    const processingTimeMs = performance.now() - startTime;

    // Scoring
    let totalScore = 0;
    let maxPossibleScore = 0;

    for (const rule of this.rules) {
      maxPossibleScore += rule.currentWeight;
    }

    for (const match of matches) {
      const rule = this.rules.find((r) => r.id === match.ruleId);
      if (rule) {
        totalScore += rule.currentWeight * match.strength;
      }
    }

    const normalizedScore =
      maxPossibleScore > 0 ? totalScore / maxPossibleScore : 0;

    // Verdict
    let verdict: Verdict;
    if (normalizedScore > 0.7) {
      verdict = 'malicious';
    } else if (normalizedScore > 0.4) {
      verdict = 'suspicious';
    } else if (normalizedScore > 0.15) {
      verdict = 'inconclusive';
    } else {
      verdict = 'benign';
    }

    // Confiance
    let confidence: number;
    if (matches.length >= CONFIDENCE_MULTI_RULE_THRESHOLD) {
      confidence = Math.min(0.85, 0.5 + matches.length * 0.08);
    } else if (matches.length === 1) {
      confidence = CONFIDENCE_SINGLE_RULE;
    } else if (matches.length === 2) {
      confidence = 0.55;
    } else {
      confidence = normalizedScore > 0.1 ? 0.3 : 0.9; // Haute confiance pour "benign" si score très bas
    }

    // Action recommandée
    let recommendedAction: RecommendedAction;
    if (verdict === 'malicious' && confidence >= 0.7) {
      recommendedAction = 'block';
    } else if (verdict === 'malicious' || verdict === 'suspicious') {
      recommendedAction = 'monitor';
    } else if (verdict === 'inconclusive') {
      recommendedAction = 'escalate';
    } else {
      recommendedAction = 'ignore';
    }

    return {
      level: 'draft',
      signalId: signal.id,
      verdict,
      confidence,
      explanation: this.buildExplanation(matches),
      matchedRules: matches.map((m) => m.ruleId),
      recommendedAction,
      processingTimeMs,
      resourceCost: {
        cpuTimeMs: processingTimeMs,
        peakMemoryDeltaBytes: 0,
        workerUsed: false,
      },
    };
  }

  applyFeedback(ruleId: string, wasCorrect: boolean): void {
    const rule = this.rules.find((r) => r.id === ruleId);
    if (!rule) return;

    if (wasCorrect) {
      rule.currentWeight = Math.min(1.0, rule.currentWeight * WEIGHT_BOOST);
    } else {
      rule.currentWeight = Math.max(
        rule.baseWeight * MIN_WEIGHT,
        rule.currentWeight * WEIGHT_PENALTY,
      );
    }
  }

  serializeWeights(): Record<string, number> {
    const weights: Record<string, number> = {};
    for (const rule of this.rules) {
      weights[rule.id] = rule.currentWeight;
    }
    return weights;
  }

  loadWeights(weights: Record<string, number>): void {
    for (const rule of this.rules) {
      if (weights[rule.id] !== undefined) {
        const w = weights[rule.id];
        if (w >= MIN_WEIGHT && w <= 1.0) {
          rule.currentWeight = w;
        }
      }
    }
  }

  private buildExplanation(matches: RuleMatch[]): string {
    if (matches.length === 0) return 'No threat patterns detected';
    return matches
      .map((m) => `[${m.ruleId}] ${m.evidence} (strength: ${m.strength.toFixed(2)})`)
      .join('; ');
  }

  private initializeRules(): WeightedRule[] {
    return [
      // === DOM ===
      {
        id: 'DOM_SCRIPT_INJECT',
        name: 'Script dynamique post-load',
        category: 'malware_loader',
        baseWeight: 0.80,
        currentWeight: 0.80,
        evaluate: (s) => {
          if (s.source === 'script_injection') {
            return { ruleId: 'DOM_SCRIPT_INJECT', strength: 0.8, evidence: 'Dynamic script injection detected' };
          }
          return null;
        },
      },
      {
        id: 'DOM_HIDDEN_IFRAME',
        name: 'iframe caché',
        category: 'hidden_iframe',
        baseWeight: 0.70,
        currentWeight: 0.70,
        evaluate: (s) => {
          if (s.payload.metadata?.hiddenIframe) {
            return { ruleId: 'DOM_HIDDEN_IFRAME', strength: 0.7, evidence: 'Hidden iframe (0x0 or display:none)' };
          }
          return null;
        },
      },
      {
        id: 'DOM_RAPID_MUTATION',
        name: 'Burst de mutations (>50/s)',
        category: 'dom_manipulator',
        baseWeight: 0.50,
        currentWeight: 0.50,
        evaluate: (s) => {
          if (s.payload.mutationCount !== undefined && s.payload.mutationCount > 50) {
            const strength = Math.min(1, s.payload.mutationCount / 200);
            return { ruleId: 'DOM_RAPID_MUTATION', strength, evidence: `${s.payload.mutationCount} mutations detected` };
          }
          return null;
        },
      },
      {
        id: 'DOM_SHADOW_ACTIVITY',
        name: 'Mutations sans activité utilisateur',
        category: 'dom_manipulator',
        baseWeight: 0.65,
        currentWeight: 0.65,
        evaluate: (s) => {
          if (s.resonanceSnapshot.shadowMutationRatio > 0.7) {
            return { ruleId: 'DOM_SHADOW_ACTIVITY', strength: s.resonanceSnapshot.shadowMutationRatio, evidence: 'High shadow mutation ratio' };
          }
          return null;
        },
      },

      // === Scripts ===
      {
        id: 'SCRIPT_EVAL',
        name: 'Usage eval/Function/atob',
        category: 'obfuscated_script',
        baseWeight: 0.70,
        currentWeight: 0.70,
        evaluate: (s) => {
          if (s.payload.metadata?.hasEval) {
            return { ruleId: 'SCRIPT_EVAL', strength: 0.7, evidence: 'eval/Function/atob usage detected' };
          }
          return null;
        },
      },
      {
        id: 'SCRIPT_OBFUSCATION',
        name: 'Code fortement obfusqué',
        category: 'obfuscated_script',
        baseWeight: 0.75,
        currentWeight: 0.75,
        evaluate: (s) => {
          const depth = s.payload.metadata?.obfuscationDepth as number | undefined;
          if (depth && depth > 1) {
            return { ruleId: 'SCRIPT_OBFUSCATION', strength: Math.min(1, depth / 5), evidence: `Obfuscation depth: ${depth}` };
          }
          return null;
        },
      },
      {
        id: 'SCRIPT_LONG_STRING',
        name: 'Chaîne encodée > 1KB',
        category: 'obfuscated_script',
        baseWeight: 0.60,
        currentWeight: 0.60,
        evaluate: (s) => {
          if (s.payload.metadata?.longEncodedString) {
            return { ruleId: 'SCRIPT_LONG_STRING', strength: 0.6, evidence: 'Long encoded string (>1KB)' };
          }
          return null;
        },
      },

      // === Fingerprinting ===
      {
        id: 'FP_CANVAS_READ',
        name: 'Canvas read sans interaction',
        category: 'fingerprinter',
        baseWeight: 0.90,
        currentWeight: 0.90,
        evaluate: (s) => {
          if (s.payload.metadata?.canvasRead) {
            return { ruleId: 'FP_CANVAS_READ', strength: 0.9, evidence: 'Canvas read without user gesture' };
          }
          return null;
        },
      },
      {
        id: 'FP_WEBGL_PROBE',
        name: 'Sonde WebGL (renderer/vendor)',
        category: 'fingerprinter',
        baseWeight: 0.85,
        currentWeight: 0.85,
        evaluate: (s) => {
          if (s.source === 'webrtc_probe' || s.payload.metadata?.webglProbe) {
            return { ruleId: 'FP_WEBGL_PROBE', strength: 0.85, evidence: 'WebGL renderer/vendor probe' };
          }
          return null;
        },
      },
      {
        id: 'FP_WEBRTC_LEAK',
        name: 'Accès WebRTC non sollicité',
        category: 'fingerprinter',
        baseWeight: 0.85,
        currentWeight: 0.85,
        evaluate: (s) => {
          if (s.source === 'webrtc_probe') {
            return { ruleId: 'FP_WEBRTC_LEAK', strength: 0.85, evidence: 'Unsolicited WebRTC access' };
          }
          return null;
        },
      },
      {
        id: 'FP_AUDIO_CTX',
        name: 'AudioContext fingerprinting',
        category: 'fingerprinter',
        baseWeight: 0.80,
        currentWeight: 0.80,
        evaluate: (s) => {
          if (s.payload.metadata?.audioFingerprint) {
            return { ruleId: 'FP_AUDIO_CTX', strength: 0.8, evidence: 'AudioContext fingerprinting pattern' };
          }
          return null;
        },
      },
      {
        id: 'FP_FONT_ENUM',
        name: 'Énumération de polices',
        category: 'fingerprinter',
        baseWeight: 0.70,
        currentWeight: 0.70,
        evaluate: (s) => {
          if (s.payload.metadata?.fontEnumeration) {
            return { ruleId: 'FP_FONT_ENUM', strength: 0.7, evidence: 'Font enumeration pattern' };
          }
          return null;
        },
      },

      // === Réseau ===
      {
        id: 'NET_THIRD_PARTY',
        name: 'Requête vers domaine tracker connu',
        category: 'tracker',
        baseWeight: 0.60,
        currentWeight: 0.60,
        evaluate: (s) => {
          if (s.payload.metadata?.isThirdParty && s.source === 'network_request') {
            return { ruleId: 'NET_THIRD_PARTY', strength: 0.6, evidence: 'Third-party tracker request' };
          }
          return null;
        },
      },
      {
        id: 'NET_DATA_EXFIL',
        name: 'POST avec payload encodé',
        category: 'data_exfiltrator',
        baseWeight: 0.75,
        currentWeight: 0.75,
        evaluate: (s) => {
          if (s.payload.metadata?.largePayload && s.payload.metadata?.isThirdParty) {
            return { ruleId: 'NET_DATA_EXFIL', strength: 0.75, evidence: 'Large encoded payload to third party' };
          }
          return null;
        },
      },
      {
        id: 'NET_BEACON',
        name: 'Beacon/pixel tracking',
        category: 'tracker',
        baseWeight: 0.50,
        currentWeight: 0.50,
        evaluate: (s) => {
          if (s.payload.metadata?.beacon) {
            return { ruleId: 'NET_BEACON', strength: 0.5, evidence: 'Tracking beacon/pixel detected' };
          }
          return null;
        },
      },

      // === Temporel ===
      {
        id: 'TEMP_DELAYED_EXEC',
        name: 'Exécution retardée > 5s',
        category: 'unknown',
        baseWeight: 0.55,
        currentWeight: 0.55,
        evaluate: (s) => {
          if (s.payload.timeSinceLastUserAction !== undefined && s.payload.timeSinceLastUserAction > 5000) {
            const strength = Math.min(1, s.payload.timeSinceLastUserAction / 30000);
            return { ruleId: 'TEMP_DELAYED_EXEC', strength, evidence: `Execution ${Math.round(s.payload.timeSinceLastUserAction / 1000)}s after last user action` };
          }
          return null;
        },
      },
      {
        id: 'TEMP_PERIODIC',
        name: 'Exécution périodique suspecte',
        category: 'tracker',
        baseWeight: 0.50,
        currentWeight: 0.50,
        evaluate: (s) => {
          if (s.payload.metadata?.periodicExecution) {
            return { ruleId: 'TEMP_PERIODIC', strength: 0.5, evidence: 'Suspicious periodic execution pattern' };
          }
          return null;
        },
      },

      // === Adversarial ===
      {
        id: 'ADV_ANTI_DEBUG',
        name: 'Détection anti-debug',
        category: 'obfuscated_script',
        baseWeight: 0.80,
        currentWeight: 0.80,
        evaluate: (s) => {
          if (s.payload.metadata?.antiDebug) {
            return { ruleId: 'ADV_ANTI_DEBUG', strength: 0.8, evidence: 'Anti-debugging technique detected' };
          }
          return null;
        },
      },
      {
        id: 'ADV_ENV_CHECK',
        name: "Vérification d'environnement",
        category: 'obfuscated_script',
        baseWeight: 0.65,
        currentWeight: 0.65,
        evaluate: (s) => {
          if (s.payload.metadata?.environmentCheck) {
            return { ruleId: 'ADV_ENV_CHECK', strength: 0.65, evidence: 'Environment detection (webdriver, selenium)' };
          }
          return null;
        },
      },
    ];
  }
}
