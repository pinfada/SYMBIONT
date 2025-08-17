/**
 * NeuralService - Interface simplifiée pour les opérations neurales
 * Part du refactoring d'OrganismCore selon l'architecture hexagonale
 */
import { INeuralMesh } from '../interfaces/INeuralMesh';
import { OrganismTraits } from '../../shared/types/organism';
export interface NeuralProcessingResult {
    success: boolean;
    adaptations: Partial<OrganismTraits>;
    confidence: number;
    processingTime: number;
}
export interface NeuralPattern {
    id: string;
    type: 'behavioral' | 'environmental' | 'social';
    data: any;
    timestamp: number;
    confidence: number;
}
export declare class NeuralService {
    private mesh;
    private processingQueue;
    private isProcessing;
    constructor(mesh: INeuralMesh);
    /**
     * Traite un stimulus et retourne les adaptations suggérées
     */
    processStimulus(stimulus: any, currentTraits: OrganismTraits): Promise<NeuralProcessingResult>;
    /**
     * Ajoute un pattern à la queue de traitement
     */
    queuePattern(pattern: NeuralPattern): void;
    /**
     * Traite la queue de patterns en arrière-plan
     */
    private processQueue;
    /**
     * Convertit un stimulus en pattern neural
     */
    private convertStimulusToPattern;
    /**
     * Convertit le résultat neural en adaptations de traits
     */
    private convertResultToTraitAdaptations;
    /**
     * Ajuste un trait avec une limite de changement
     */
    private adjustTrait;
    /**
     * Effectue l'apprentissage à partir de données comportementales
     */
    learn(behaviorData: any): Promise<boolean>;
    /**
     * Obtient les métriques de performance du réseau neural
     */
    getPerformanceMetrics(): any;
    /**
     * Sauvegarde l'état du réseau neural
     */
    saveState(): any;
    /**
     * Restaure l'état du réseau neural
     */
    loadState(state: any): boolean;
    /**
     * Réinitialise le réseau neural
     */
    reset(): void;
    /**
     * Nettoyage pour libérer les ressources
     */
    cleanup(): void;
    /**
     * Vérifie l'état de santé du service neural
     */
    healthCheck(): {
        healthy: boolean;
        issues: string[];
    };
    /**
     * Initialize neural service
     */
    initialize(): Promise<void>;
    /**
     * Suspend neural processing
     */
    suspend(): Promise<void>;
    /**
     * Update neural processing with delta time
     */
    update(deltaTime: number): void;
    /**
     * Stimulate neural input
     */
    stimulate(inputId: string, value: number): void;
    /**
     * Get neural activity level
     */
    getNeuralActivity(): number;
}
//# sourceMappingURL=NeuralService.d.ts.map