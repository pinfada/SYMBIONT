/**
 * EnergyService - Gestion de l'énergie et métabolisme
 * Part du refactoring d'OrganismCore selon l'architecture hexagonale
 */
export interface EnergyEvent {
    type: 'consumption' | 'regeneration' | 'boost' | 'drain';
    amount: number;
    source: string;
    timestamp: number;
    energyBefore: number;
    energyAfter: number;
}
export interface MetabolismConfig {
    baseRegenRate: number;
    maxEnergy: number;
    decayRate: number;
    efficiencyFactor: number;
}
export declare class EnergyService {
    private energy;
    private maxEnergy;
    private metabolismRate;
    private config;
    private history;
    private listeners;
    private regenerationTimer;
    constructor(initialEnergy?: number, config?: Partial<MetabolismConfig>);
    /**
     * Démarre le processus métabolique automatique
     */
    private startMetabolism;
    /**
     * Arrête le processus métabolique
     */
    stopMetabolism(): void;
    /**
     * Régénération passive d'énergie
     */
    private passiveRegeneration;
    /**
     * Consomme de l'énergie
     */
    consumeEnergy(amount: number, source?: string): boolean;
    /**
     * Tente de consommer de l'énergie (même si insuffisante)
     */
    forceConsumeEnergy(amount: number, source?: string): number;
    /**
     * Ajoute de l'énergie (boost)
     */
    addEnergy(amount: number, source?: string): void;
    /**
     * Régénération manuelle d'énergie
     */
    regenerateEnergy(amount?: number): void;
    /**
     * Obtient le niveau d'énergie actuel
     */
    getEnergyLevel(): number;
    /**
     * Obtient le niveau d'énergie en pourcentage
     */
    getEnergyPercentage(): number;
    /**
     * Obtient l'énergie maximale
     */
    getMaxEnergy(): number;
    /**
     * Vérifie si l'organisme a assez d'énergie
     */
    hasEnergy(amount: number): boolean;
    /**
     * Vérifie si l'organisme est épuisé
     */
    isExhausted(): boolean;
    /**
     * Vérifie si l'organisme est à pleine énergie
     */
    isFullEnergy(): boolean;
    /**
     * Met à jour le taux de métabolisme
     */
    setMetabolismRate(rate: number): void;
    /**
     * Ajuste l'efficacité métabolique
     */
    setEfficiency(factor: number): void;
    /**
     * Augmente l'énergie maximale
     */
    increaseMaxEnergy(amount: number): void;
    /**
     * Enregistre un événement d'énergie
     */
    private recordEvent;
    /**
     * Obtient l'historique d'énergie
     */
    getEnergyHistory(limit?: number): EnergyEvent[];
    /**
     * Obtient les statistiques d'énergie
     */
    getEnergyStats(): {
        current: number;
        max: number;
        percentage: number;
        metabolismRate: number;
        efficiency: number;
        totalConsumed: number;
        totalRegenerated: number;
    };
    /**
     * Ajoute un listener pour les événements d'énergie
     */
    addEnergyListener(listener: (event: EnergyEvent) => void): void;
    /**
     * Supprime un listener
     */
    removeEnergyListener(listener: (event: EnergyEvent) => void): void;
    /**
     * Nettoyage de l'historique ancien
     */
    cleanup(maxAge?: number): void;
    /**
     * Sérialisation pour sauvegarde
     */
    toJSON(): {
        energy: number;
        maxEnergy: number;
        metabolismRate: number;
        config: MetabolismConfig;
        history: EnergyEvent[];
    };
    /**
     * Restauration depuis JSON
     */
    fromJSON(data: {
        energy: number;
        maxEnergy: number;
        metabolismRate: number;
        config: MetabolismConfig;
        history: EnergyEvent[];
    }): void;
    /**
     * Nettoyage lors de la destruction
     */
    destroy(): void;
}
//# sourceMappingURL=EnergyService.d.ts.map