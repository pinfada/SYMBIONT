export declare class NeuralMesh {
    private router;
    private core;
    private cortex;
    constructor();
    /**
     * Initialise le réseau neuronal
     * @returns {Promise<void>}
     */
    initialize(): Promise<void>;
    /**
     * Gère la suspension du système
     * @returns {Promise<void>}
     */
    suspend(): Promise<void>;
    /**
     * Mesure les performances du système
     * @returns {Promise<{cpu: number, memory: number}>}
     */
    measurePerformance(): Promise<{
        cpu: number;
        memory: number;
    }>;
}
