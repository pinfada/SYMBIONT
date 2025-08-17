/**
 * TraitService - Gestion des traits d'organisme
 * Part du refactoring d'OrganismCore selon l'architecture hexagonale
 */
import { OrganismTraits } from '../../shared/types/organism';
export interface TraitUpdateEvent {
    traitName: keyof OrganismTraits;
    oldValue: number;
    newValue: number;
    timestamp: number;
}
export interface TraitHistory {
    trait: keyof OrganismTraits;
    value: number;
    timestamp: number;
    trigger: string;
}
export declare class TraitService {
    private traits;
    private history;
    private listeners;
    constructor(initialTraits?: Partial<OrganismTraits>);
    /**
     * Met à jour un trait spécifique
     */
    updateTrait(name: keyof OrganismTraits, value: number, trigger?: string): void;
    /**
     * Met à jour plusieurs traits simultanément
     */
    updateTraits(updates: Partial<OrganismTraits>, trigger?: string): void;
    /**
     * Obtient la valeur d'un trait
     */
    getTrait(name: keyof OrganismTraits): number;
    /**
     * Obtient tous les traits
     */
    getAllTraits(): OrganismTraits;
    /**
     * Obtient l'historique d'un trait
     */
    getTraitHistory(name: keyof OrganismTraits): TraitHistory[];
    /**
     * Obtient l'historique complet limité
     */
    getFullHistory(limit?: number): TraitHistory[];
    /**
     * Normalise tous les traits (les ramène dans [0,1])
     */
    normalizeTraits(): void;
    /**
     * Calcule l'équilibre général des traits
     */
    calculateBalance(): number;
    /**
     * Ajoute un listener pour les changements de traits
     */
    addTraitChangeListener(listener: (event: TraitUpdateEvent) => void): void;
    /**
     * Supprime un listener
     */
    removeTraitChangeListener(listener: (event: TraitUpdateEvent) => void): void;
    /**
     * Nettoyage de l'historique ancien
     */
    cleanup(maxAge?: number): void;
    /**
     * Sérialisation pour sauvegarde
     */
    toJSON(): {
        traits: OrganismTraits;
        history: TraitHistory[];
    };
    /**
     * Restauration depuis JSON
     */
    fromJSON(data: {
        traits: OrganismTraits;
        history: TraitHistory[];
    }): void;
}
//# sourceMappingURL=TraitService.d.ts.map