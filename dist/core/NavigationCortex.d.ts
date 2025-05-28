/**
 * NavigationCortex - Analyseur de navigation et de patterns temporels
 * - Enregistre les événements de navigation (URL, timestamp, action)
 * - Détecte patterns de routine, exploration, répétition
 * - Supporte l'ajout de détecteurs personnalisés
 */
export interface NavigationEvent {
    url: string;
    timestamp: number;
    action: 'visit' | 'click' | 'scroll' | 'input' | 'custom';
}
export interface Pattern {
    type: string;
    score: number;
    details?: any;
}
export type PatternDetector = (events: NavigationEvent[]) => Pattern[];
export declare class NavigationCortex {
    private events;
    private detectors;
    private lastPatterns;
    /**
     * Enregistre un événement de navigation
     */
    recordEvent(event: NavigationEvent): void;
    /**
     * Ajoute un détecteur de pattern personnalisé
     */
    addDetector(detector: PatternDetector): void;
    /**
     * Analyse les événements et retourne les patterns détectés
     */
    getPatterns(): Pattern[];
    /**
     * Réinitialise l'historique de navigation
     */
    reset(): void;
    /**
     * Export JSON pour debug/visualisation
     */
    toJSON(): {
        events: NavigationEvent[];
        lastPatterns: Pattern[];
        detectors: number;
    };
}
//# sourceMappingURL=NavigationCortex.d.ts.map