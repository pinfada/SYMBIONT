import { OrganismState, OrganismTraits } from '../shared/types/organism';
type PerformanceMetrics = {
    cpu: number;
    memory: number;
    neuralActivity: number;
    connectionStrength: number;
};
type OrganismJSON = {
    mesh: any;
    traits: OrganismTraits;
    energy: number;
    health: number;
    dna: string;
    timestamp: number;
};
type ShaderParameters = {
    energy: number;
    health: number;
    neuralActivity: number;
    creativity: number;
    focus: number;
    time: number;
};
export declare class OrganismCore {
    private mesh;
    private dna;
    private interpreter;
    private traits;
    private energy;
    private health;
    private lastMutation;
    private metabolismRate;
    constructor(dna: string, traits?: Partial<OrganismTraits>);
    /**
     * Initialise le réseau neuronal avec les traits de l'organisme
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
     * Applique une mutation (neural et potentiellement ADN)
     */
    mutate(rate?: number): void;
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
     * Récupère les métriques de performance
     */
    getPerformanceMetrics(): Promise<PerformanceMetrics>;
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
     * Met l'organisme en hibernation
     */
    hibernate(): Promise<void>;
}
export {};
//# sourceMappingURL=OrganismCore.d.ts.map