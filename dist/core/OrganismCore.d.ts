import { ShaderParameters } from '../types';
import { OrganismTraits, OrganismState } from '../types';
export declare class OrganismCore {
    private mesh;
    private dna;
    private interpreter;
    private traits;
    private energy;
    private health;
    private lastMutation;
    constructor(dna: string, traits?: Partial<OrganismTraits>);
    /**
     * Initialise un réseau neuronal de base (modifiable)
     */
    private setupDefaultMesh;
    /**
     * Stimule le réseau (ex : perception sensorielle)
     */
    stimulate(inputId: string, value: number): void;
    /**
     * Propage l'activation et met à jour les traits/états
     */
    propagate(): void;
    /**
     * Applique une mutation (neural ou ADN)
     */
    mutate(rate?: number): void;
    /**
     * Récupère les traits courants
     */
    getTraits(): OrganismTraits;
    /**
     * Définit de nouveaux traits (ex : adaptation externe)
     */
    setTraits(traits: Partial<OrganismTraits>): void;
    /**
     * Récupère l'état global de l'organisme
     */
    getState(): OrganismState;
    /**
     * Export JSON pour debug/visualisation (types internes anonymisés)
     */
    toJSON(): any;
    /**
     * Récupère les paramètres shaders courants (pour WebGL)
     */
    getShaderParameters(): ShaderParameters;
}
