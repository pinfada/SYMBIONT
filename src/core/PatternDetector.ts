/**
 * PatternDetector - Utilitaires de détection de motifs dans des séquences d'événements
 * - Détection de répétitions, alternances, bursts, patterns temporels
 * - Utilisable avec NavigationCortex ou tout flux d'événements
 */

export interface SequenceEvent {
  type: string;
  timestamp: number;
  [key: string]: unknown;
}

export interface DetectedPattern {
  type: string;
  score: number;
  details?: unknown;
}

export class PatternDetector {
  /**
   * Détecte les répétitions d'un même type d'événement
   */
  static detectRepetition(events: SequenceEvent[], minCount = 3): DetectedPattern[] {
    const counts: Record<string, number> = {};
    for (const e of events) counts[e.type] = (counts[e.type] || 0) + 1;
    return Object.entries(counts)
      .filter(([_, c]) => c >= minCount)
      .map(([type, c]) => ({ type: 'repetition', score: c, details: { eventType: type } }));
  }

  /**
   * Détecte des alternances régulières entre deux types d'événements
   */
  static detectAlternance(events: SequenceEvent[], typeA: string, typeB: string, minLength = 4): DetectedPattern[] {
    let alternance = 0;
    let last: string | null = null;
    for (const e of events) {
      if ((e.type === typeA || e.type === typeB) && e.type !== last) {
        alternance++;
        last = e.type;
      } else if (e.type === last) {
        alternance = 1;
        last = e.type;
      }
    }
    if (alternance >= minLength) {
      return [{ type: 'alternance', score: alternance, details: { typeA, typeB } }];
    }
    return [];
  }

  /**
   * Détecte des bursts (séquences rapprochées dans le temps)
   */
  static detectBurst(events: SequenceEvent[], maxInterval = 1000, minCount = 3): DetectedPattern[] {
    if (events.length < minCount) return [];
    let burstCount = 1;
    let maxBurst = 1;
    for (let i = 1; i < events.length; i++) {
      if (events[i].timestamp - events[i - 1].timestamp <= maxInterval) {
        burstCount++;
        maxBurst = Math.max(maxBurst, burstCount);
      } else {
        burstCount = 1;
      }
    }
    if (maxBurst >= minCount) {
      return [{ type: 'burst', score: maxBurst, details: { maxInterval } }];
    }
    return [];
  }

  /**
   * Détecte des motifs temporels (périodicité, cycles)
   */
  static detectTemporalPattern(events: SequenceEvent[], minPeriod = 1000, tolerance = 0.2): DetectedPattern[] {
    if (events.length < 3) return [];
    const intervals = [];
    for (let i = 1; i < events.length; i++) {
      intervals.push(events[i].timestamp - events[i - 1].timestamp);
    }
    const avg = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    const variance = intervals.reduce((a, b) => a + Math.pow(b - avg, 2), 0) / intervals.length;
    const std = Math.sqrt(variance);
    if (avg >= minPeriod && std / avg < tolerance) {
      return [{ type: 'temporal', score: avg, details: { std, count: events.length } }];
    }
    return [];
  }
} 