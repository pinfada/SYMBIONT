import { BehaviorPattern } from '../shared/types/organism';
export interface LearningResult {
    strengthenedConnections: number;
    weakenedConnections: number;
    newPatterns: string[];
    confidence: number;
}
export declare class HebbieanLearningSystem {
    private connections;
    private activationHistory;
    private learningRate;
    private decayRate;
    private weights;
    private activations;
    private lastActive;
    private inactivityThreshold;
    constructor(learningRate?: number, inactivityThreshold?: number);
    /**
     * Renforce une connexion entre deux neurones (pour compatibilité tests)
     */
    strengthenConnection(preId: string, postId: string, preAct: number, postAct: number): void;
    /**
     * Affaiblit les connexions inutilisées (pour compatibilité tests)
     */
    weakenUnusedConnections(): void;
    /**
     * Définit l'activation d'un neurone (pour compatibilité tests)
     */
    setActivation(nodeId: string, value: number): void;
    /**
     * Détecte les patterns émergents (pour compatibilité tests)
     */
    detectEmergentPatterns(): string[];
    /**
     * Récupère le poids d'une connexion (pour compatibilité tests)
     */
    getWeight(preId: string, postId: string): number;
    /**
     * Sérialise l'état du système (pour compatibilité tests)
     */
    toJSON(): {
        weights: [string, number][];
        activations: [string, number][];
        lastActive: [string, number][];
    };
    /**
     * Met à jour les poids des connexions basé sur les patterns comportementaux
     */
    updateWeights(behaviorData: BehaviorPattern[]): Promise<LearningResult>;
    /**
     * Convertit un pattern comportemental en activation neuronale
     */
    private patternToActivation;
    /**
     * Récupère le poids d'une connexion
     */
    private getConnectionWeight;
    /**
     * Définit le poids d'une connexion
     */
    private setConnectionWeight;
    /**
     * Génère une signature unique pour un pattern
     */
    private generatePatternSignature;
    /**
     * Vérifie si un pattern a déjà été observé
     */
    private hasSeenPattern;
    /**
     * Enregistre un nouveau pattern
     */
    private recordPattern;
    /**
     * Calcule la confiance basée sur la cohérence des patterns
     */
    private calculateConfidence;
    /**
     * Extrait le domaine d'une URL
     */
    private extractDomain;
    /**
     * Catégorise le temps passé
     */
    private categorizeTime;
    /**
     * Catégorise le niveau d'interaction
     */
    private categorizeInteractions;
    /**
     * Obtient les connexions les plus fortes
     */
    getStrongestConnections(limit?: number): Array<{
        from: string;
        to: string;
        weight: number;
    }>;
    /**
     * Réinitialise le système d'apprentissage
     */
    reset(): void;
}
//# sourceMappingURL=HebbieanLearningSystem.d.ts.map