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
export declare class PatternDetector {
    /**
     * Détecte les répétitions d'un même type d'événement
     */
    static detectRepetition(events: SequenceEvent[], minCount?: number): DetectedPattern[];
    /**
     * Détecte des alternances régulières entre deux types d'événements
     */
    static detectAlternance(events: SequenceEvent[], typeA: string, typeB: string, minLength?: number): DetectedPattern[];
    /**
     * Détecte des bursts (séquences rapprochées dans le temps)
     */
    static detectBurst(events: SequenceEvent[], maxInterval?: number, minCount?: number): DetectedPattern[];
    /**
     * Détecte des motifs temporels (périodicité, cycles)
     */
    static detectTemporalPattern(events: SequenceEvent[], minPeriod?: number, tolerance?: number): DetectedPattern[];
}
//# sourceMappingURL=PatternDetector.d.ts.map