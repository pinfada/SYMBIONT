export interface OrganismState {
    /** Identifiant unique de l'organisme */
    id: string;
    /** Génération (lignée) */
    generation: number;
    /** Santé (0-100) */
    health: number;
    /** Énergie (0-100) */
    energy: number;
    /** Traits principaux */
    traits: OrganismTraits;
    /** ADN visuel */
    visualDNA: string;
    /** Timestamp de la dernière mutation */
    lastMutation: number;
    /** Historique des mutations */
    mutations: any[];
    /** Date de création */
    createdAt: number;
    /** ADN complet (pour héritage) */
    dna: string;
    /** Niveau de conscience (optionnel) */
    consciousness?: number;
}
export interface OrganismMutation {
    type: 'visual' | 'behavioral' | 'cognitive';
    trigger: string;
    magnitude: number;
    timestamp: number;
}
export interface OrganismTraits {
    curiosity: number;
    focus: number;
    rhythm: number;
    empathy: number;
    creativity: number;
    [key: string]: number;
}
export interface MutationState {
    colorShift: number;
    patternIntensity: number;
    sizeMultiplier: number;
    opacity: number;
}
//# sourceMappingURL=organism.d.ts.map