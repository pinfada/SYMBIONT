/**
 * PolicyEngine — Moteur de règles décisionnelles (F-13)
 *
 * Applique les décisions finales basées sur le diagnostic,
 * l'état courant du moteur, et les politiques configurées.
 */

import {
  DiagnosticResult,
  PolicyDecision,
  PolicyRule,
  CortexState,
  RecommendedAction,
  Verdict,
} from '../CortexTypes';

export class PolicyEngine {
  private rules: PolicyRule[];

  constructor() {
    this.rules = this.initializeDefaultRules();
  }

  applyDecision(
    diagnostic: DiagnosticResult,
    currentState: CortexState,
  ): PolicyDecision {
    // Tri par priorité décroissante
    const sorted = [...this.rules].sort((a, b) => b.priority - a.priority);

    for (const rule of sorted) {
      if (rule.condition(diagnostic, currentState)) {
        return {
          action: rule.action,
          verdict: diagnostic.verdict,
          confidence: diagnostic.confidence,
          justification: `Rule '${rule.name}' applied: ${diagnostic.verdict} with confidence ${diagnostic.confidence.toFixed(2)}`,
          stateAfterDecision: this.determineStateAfterDecision(rule.action, currentState),
          shouldNotifyUser:
            diagnostic.verdict === 'malicious' && diagnostic.confidence >= 0.8,
        };
      }
    }

    // Fallback par défaut : matrice verdict × confiance
    return this.applyDefaultMatrix(diagnostic, currentState);
  }

  isAllowed(action: string, state: CortexState): boolean {
    switch (action) {
      case 'deep_analysis':
        return (
          state === CortexState.QUICK_ANALYSIS ||
          state === CortexState.REFLEX_OBSERVATION
        );
      case 'learning':
        return state === CortexState.DEEP_ANALYSIS;
      case 'block':
        return state !== CortexState.COGNITIVE_HIBERNATION;
      default:
        return true;
    }
  }

  addRule(rule: PolicyRule): void {
    this.rules.push(rule);
  }

  removeRule(id: string): void {
    this.rules = this.rules.filter((r) => r.id !== id);
  }

  private applyDefaultMatrix(
    diagnostic: DiagnosticResult,
    currentState: CortexState,
  ): PolicyDecision {
    const { verdict, confidence } = diagnostic;

    let action: RecommendedAction;
    let shouldNotify = false;

    if (verdict === 'malicious') {
      if (confidence >= 0.8) {
        action = 'block';
        shouldNotify = true;
      } else if (confidence >= 0.5) {
        action = 'monitor';
      } else {
        action = 'monitor';
      }
    } else if (verdict === 'suspicious') {
      action = confidence >= 0.5 ? 'monitor' : 'ignore';
    } else if (verdict === 'inconclusive') {
      action = confidence >= 0.5 ? 'escalate' : 'ignore';
    } else {
      action = 'ignore';
    }

    // Override en mode défensif : jamais ignorer suspicious/inconclusive
    if (currentState === CortexState.DEFENSIVE_MODE) {
      if (
        (verdict === 'suspicious' || verdict === 'inconclusive') &&
        action === 'ignore'
      ) {
        action = 'monitor';
      }
    }

    return {
      action,
      verdict,
      confidence,
      justification: `Default matrix: ${verdict}/${confidence.toFixed(2)} → ${action}`,
      stateAfterDecision: this.determineStateAfterDecision(action, currentState),
      shouldNotifyUser: shouldNotify,
    };
  }

  private determineStateAfterDecision(
    action: RecommendedAction,
    currentState: CortexState,
  ): CortexState {
    // La plupart des décisions ramènent à REFLEX_OBSERVATION
    // sauf "escalate" qui maintient l'état courant pour permettre l'escalade
    if (action === 'escalate') return currentState;
    return CortexState.REFLEX_OBSERVATION;
  }

  private initializeDefaultRules(): PolicyRule[] {
    return [
      {
        id: 'BLOCK_HIGH_CONFIDENCE_MALICIOUS',
        name: 'Block confirmed malicious',
        condition: (d) => d.verdict === 'malicious' && d.confidence >= 0.8,
        action: 'block',
        priority: 100,
      },
      {
        id: 'MONITOR_MEDIUM_CONFIDENCE_MALICIOUS',
        name: 'Monitor possible malicious',
        condition: (d) => d.verdict === 'malicious' && d.confidence >= 0.5,
        action: 'monitor',
        priority: 90,
      },
      {
        id: 'DEFENSIVE_OVERRIDE_SUSPICIOUS',
        name: 'Defensive mode: monitor all suspicious',
        condition: (d, state) =>
          state === CortexState.DEFENSIVE_MODE && d.verdict === 'suspicious',
        action: 'monitor',
        priority: 85,
      },
      {
        id: 'MONITOR_SUSPICIOUS',
        name: 'Monitor suspicious signals',
        condition: (d) => d.verdict === 'suspicious' && d.confidence >= 0.5,
        action: 'monitor',
        priority: 70,
      },
      {
        id: 'ESCALATE_INCONCLUSIVE',
        name: 'Escalate inconclusive signals',
        condition: (d) => d.verdict === 'inconclusive' && d.confidence >= 0.5,
        action: 'escalate',
        priority: 60,
      },
    ];
  }
}
