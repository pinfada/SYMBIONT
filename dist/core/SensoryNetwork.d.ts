/**
 * SensoryNetwork - Réseau sensoriel pour organisme artificiel
 * - Gère les capteurs, la normalisation, le bruit, l'adaptation
 * - Prêt à être branché sur OrganismCore/NeuralMesh
 */
export interface Sensor {
    id: string;
    type: 'vision' | 'audition' | 'touch' | 'taste' | 'smell' | 'custom';
    min: number;
    max: number;
    noise: number;
    value: number;
}
export declare class SensoryNetwork {
    private sensors;
    /**
     * Ajoute un capteur sensoriel
     */
    addSensor(id: string, type: Sensor['type'], min?: number, max?: number, noise?: number): void;
    /**
     * Simule une perception (avec bruit et normalisation)
     */
    sense(id: string, rawValue: number): number;
    /**
     * Récupère les valeurs normalisées de tous les capteurs
     */
    getInputs(): Record<string, number>;
    /**
     * Adapte dynamiquement la sensibilité d'un capteur
     */
    adapt(id: string, newMin: number, newMax: number, newNoise?: number): void;
    /**
     * Génère un bruit gaussien (Box-Muller)
     */
    private gaussianNoise;
    /**
     * Export JSON pour debug/visualisation
     */
    toJSON(): Sensor[];
}
//# sourceMappingURL=SensoryNetwork.d.ts.map