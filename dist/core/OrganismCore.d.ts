import { OrganismState, OrganismTraits } from '../shared/types/organism';
import { INeuralMesh, PerformanceMetrics } from './interfaces/INeuralMesh';
import { IOrganismCore, OrganismJSON, ShaderParameters } from './interfaces/IOrganismCore';
export declare class OrganismCore implements IOrganismCore {
    private mesh;
    private dna;
    private interpreter;
    private traits;
    private energy;
    private health;
    private lastMutation;
    private metabolismRate;
    private mutationBatcher;
    private logger?;
    private id;
    private neuralMesh?;
    private isBooted;
    constructor(dna: string, traits?: Partial<OrganismTraits>, createMesh?: () => INeuralMesh);
    /**
     * Valide les paramètres d'entrée avec ErrorHandler
     */
    private validateInput;
    /**
     * Initialise le réseau neuronal avec gestion d'erreurs robuste
     */
    private initializeNeuralNetwork;
    /**
     * Met à jour l'état de l'organisme (appelé périodiquement)
     */
    update(deltaTime?: number): void;
    /**
     * Met à jour l'énergie basée sur l'activité neurale
     */
    private updateEnergy;
    /**
     * Met à jour la santé basée sur les conditions actuelles
     */
    private updateHealth;
    /**
     * Fait évoluer les traits basés sur l'activité neurale
     */
    private evolveTraits;
    /**
     * Stimule le réseau (ex : perception sensorielle)
     */
    stimulate(inputId: string, value: number): void;
    /**
     * Traite une mutation batchée
     */
    private processBatchedMutation;
    /**
     * Applique une mutation (neural et potentiellement ADN) - Version optimisée avec batching
     */
    mutate(rate?: number): void;
    /**
     * Force l'application immédiate de toutes les mutations en attente
     */
    flushMutations(): Promise<void>;
    /**
     * Nourrit l'organisme pour restaurer l'énergie
     */
    feed(amount?: number): void;
    /**
     * Récupère les traits courants
     */
    getTraits(): OrganismTraits;
    /**
     * Définit de nouveaux traits
     */
    setTraits(traits: Partial<OrganismTraits>): void;
    /**
     * Récupère l'état global de l'organisme
     */
    getState(): OrganismState;
    /**
     * Récupère les métriques de performance - Version étendue avec mutations
     */
    getPerformanceMetrics(): Promise<PerformanceMetrics & {
        neuralActivity: number;
        connectionStrength: number;
        mutationStats: any;
    }>;
    /**
     * Export JSON typé pour debug/visualisation
     */
    toJSON(): OrganismJSON;
    /**
     * Récupère les paramètres shaders courants (pour WebGL)
     */
    getShaderParameters(): ShaderParameters;
    /**
     * Initialise l'organisme
     */
    boot(): Promise<void>;
    /**
     * Met l'organisme en hibernation - Version étendue avec nettoyage du batcher
     */
    hibernate(): Promise<void>;
    /**
     * Mesure les performances de base
     */
    private measurePerformance;
    /**
     * Calcule l'activité neurale
     */
    private calculateNeuralActivity;
    /**
     * Calcule la force de connexion
     */
    private calculateConnectionStrength;
    private handleBootError;
}
//# sourceMappingURL=OrganismCore.d.ts.map