/**
 * PerceptionEngine - Moteur de perception pour organisme artificiel
 * - Fusionne, filtre et prétraite les signaux sensoriels
 * - Supporte l'ajout de filtres personnalisés (moyenne, seuillage, etc.)
 * - Prêt à être branché sur SensoryNetwork et OrganismCore
 */
export type Feature = Record<string, number>;
export type Filter = (inputs: Feature) => Feature;
export declare class PerceptionEngine {
    private filters;
    private lastFeatures;
    /**
     * Ajoute un filtre de prétraitement (ex : normalisation, seuillage)
     */
    addFilter(filter: Filter): void;
    /**
     * Traite les entrées sensorielle et extrait les features
     */
    process(inputs: Feature): Feature;
    /**
     * Récupère les dernières features extraites
     */
    getFeatures(): Feature;
    /**
     * Réinitialise l'état du moteur de perception
     */
    reset(): void;
    /**
     * Export JSON pour debug/visualisation
     */
    toJSON(): {
        filters: number;
        lastFeatures: Feature;
    };
}
//# sourceMappingURL=PerceptionEngine.d.ts.map