/**
 * OrganismCore refactorisé - Architecture hexagonale
 * Version simplifiée utilisant des services spécialisés
 */
import { OrganismState, OrganismTraits } from '../shared/types/organism';
import { IOrganismCore, OrganismJSON, ShaderParameters } from './interfaces/IOrganismCore';
import { INeuralMesh } from './interfaces/INeuralMesh';
export interface OrganismDependencies {
    neuralMesh: INeuralMesh;
    logger?: {
        debug: Function;
        info: Function;
        error: Function;
    };
}
export declare class OrganismCore implements IOrganismCore {
    private readonly id;
    private readonly dna;
    private health;
    private lastMutation;
    private readonly traitService;
    private readonly energyService;
    private readonly neuralService;
    private readonly metricsService;
    private readonly featureFlags;
    private readonly logger;
    constructor(dna: string, initialTraits?: Partial<OrganismTraits>, dependencies?: OrganismDependencies);
    /**
     * Configuration des listeners entre services
     */
    private setupServiceListeners;
    /**
     * Gestionnaire de changement de traits
     */
    private onTraitChanged;
    /**
     * Validation des entrées
     */
    private validateInput;
    /**
     * Génère un ID unique
     */
    getId(): string;
    getDNA(): string;
    getTraits(): OrganismTraits;
    updateTrait(name: keyof OrganismTraits, value: number): void;
    getEnergyLevel(): number;
    getHealth(): number;
    /**
     * Évolution de l'organisme basée sur un stimulus
     */
    evolve(stimulus: any): Promise<void>;
    /**
     * Apprentissage à partir de données comportementales
     */
    learn(behaviorData: any): Promise<void>;
    /**
     * Traitement d'un stimulus simple
     */
    processStimulus(stimulus: any): void;
    /**
     * Obtient l'état complet de l'organisme
     */
    getState(): OrganismState;
    /**
     * Génère les paramètres de shader pour le rendu visuel
     */
    generateShaderParameters(): ShaderParameters;
    /**
     * Sérialisation pour sauvegarde
     */
    toJSON(): OrganismJSON;
    /**
     * Restauration depuis JSON
     */
    fromJSON(data: OrganismJSON): void;
    /**
     * Nettoyage et libération des ressources
     */
    cleanup(): void;
    /**
     * Vérification de l'état de santé
     */
    healthCheck(): {
        healthy: boolean;
        issues: string[];
    };
    /**
     * Boot the organism
     */
    boot(): Promise<void>;
    /**
     * Hibernate the organism
     */
    hibernate(): Promise<void>;
    /**
     * Update organism with delta time
     */
    update(deltaTime?: number): void;
    /**
     * Stimulate organism input
     */
    stimulate(inputId: string, value: number): void;
    /**
     * Mutate organism with given rate
     */
    mutate(rate?: number): void;
    /**
     * Feed organism with energy
     */
    feed(amount?: number): void;
    /**
     * Set traits (partial update)
     */
    setTraits(traits: Partial<OrganismTraits>): void;
    /**
     * Get performance metrics
     */
    getPerformanceMetrics(): Promise<{
        cpu: number;
        memory: number;
        neuralActivity: any;
        connectionStrength: any;
    }>;
    /**
     * Get shader parameters for WebGL rendering
     */
    getShaderParameters(): ShaderParameters;
}
//# sourceMappingURL=OrganismCore.d.ts.map