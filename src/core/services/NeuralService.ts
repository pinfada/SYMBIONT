/**
 * NeuralService - Interface simplifiée pour les opérations neurales
 * Part du refactoring d'OrganismCore selon l'architecture hexagonale
 */

import { INeuralMesh } from '../interfaces/INeuralMesh';
import { OrganismTraits } from '../../shared/types/organism';
import { logger } from '@shared/utils/secureLogger';

export interface NeuralProcessingResult {
  success: boolean;
  adaptations: Partial<OrganismTraits>;
  confidence: number;
  processingTime: number;
}

export interface NeuralPattern {
  id: string;
  type: 'behavioral' | 'environmental' | 'social';
  data: unknown;
  timestamp: number;
  confidence: number;
}

export class NeuralService {
  private mesh: INeuralMesh;
  private processingQueue: NeuralPattern[] = [];
  private isProcessing = false;

  constructor(mesh: INeuralMesh) {
    this.mesh = mesh;
  }

  /**
   * Traite un stimulus et retourne les adaptations suggérées
   */
  async processStimulus(stimulus: any, currentTraits: OrganismTraits): Promise<NeuralProcessingResult> {
    const startTime = Date.now();
    
    try {
      // Conversion du stimulus en pattern neural
      const pattern = this.convertStimulusToPattern(stimulus);
      
      // Traitement par le réseau neural
      const result = this.mesh.processPattern 
        ? await this.mesh.processPattern(pattern)
        : {};
      
      // Conversion du résultat en adaptations de traits
      const adaptations = this.convertResultToTraitAdaptations(result, currentTraits);
      
      const processingTime = Date.now() - startTime;
      
      return {
        success: true,
        adaptations,
        confidence: (result as {confidence?: number}).confidence || 0.8,
        processingTime
      };
    } catch (_error) {
      logger.error('Erreur de traitement neural:', _error);
      
      return {
        success: false,
        adaptations: {},
        confidence: 0,
        processingTime: Date.now() - startTime
      };
    }
  }

  /**
   * Ajoute un pattern à la queue de traitement
   */
  queuePattern(pattern: NeuralPattern): void {
    this.processingQueue.push(pattern);
    
    if (!this.isProcessing) {
      this.processQueue();
    }
  }

  /**
   * Traite la queue de patterns en arrière-plan
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.processingQueue.length === 0) return;
    
    this.isProcessing = true;
    
    while (this.processingQueue.length > 0) {
      const pattern = this.processingQueue.shift();
      if (pattern) {
        try {
          if (this.mesh.learn) {
            await this.mesh.learn(pattern.data);
          }
        } catch (_error) {
          logger.error('Erreur apprentissage neural:', _error);
        }
      }
    }
    
    this.isProcessing = false;
  }

  /**
   * Convertit un stimulus en pattern neural
   */
  private convertStimulusToPattern(stimulus: any): any {
    // Simplification du stimulus pour le réseau neural
    if (typeof stimulus === 'object' && stimulus !== null) {
      return {
        type: stimulus.type || 'unknown',
        intensity: stimulus.intensity || 0.5,
        context: stimulus.context || {},
        timestamp: Date.now()
      };
    }
    
    return {
      type: 'simple',
      intensity: 0.5,
      data: stimulus,
      timestamp: Date.now()
    };
  }

  /**
   * Convertit le résultat neural en adaptations de traits
   */
  private convertResultToTraitAdaptations(result: any, currentTraits: OrganismTraits): Partial<OrganismTraits> {
    const adaptations: Partial<OrganismTraits> = {};
    
    // Logique de conversion basée sur le type de résultat
    if (result && typeof result === 'object') {
      // Si le résultat contient des suggestions directes de traits
      if (result.traitSuggestions) {
        Object.entries(result.traitSuggestions).forEach(([trait, value]) => {
          if (trait in currentTraits && typeof value === 'number') {
            // Adaptation graduelle (maximum 10% de changement)
            const currentValue = currentTraits[trait as keyof OrganismTraits];
            const maxChange = 0.1;
            const change = Math.max(-maxChange, Math.min(maxChange, value - currentValue));
            adaptations[trait as keyof OrganismTraits] = currentValue + change;
          }
        });
      }
      
      // Adaptations basées sur le type d'activité
      if (result.activityType) {
        switch (result.activityType) {
          case 'exploration':
            adaptations.curiosity = this.adjustTrait(currentTraits.curiosity, 0.05);
            adaptations.adaptability = this.adjustTrait(currentTraits.adaptability, 0.03);
            break;
          case 'focus':
            adaptations.focus = this.adjustTrait(currentTraits.focus, 0.05);
            adaptations.memory = this.adjustTrait(currentTraits.memory, 0.02);
            break;
          case 'social':
            adaptations.empathy = this.adjustTrait(currentTraits.empathy, 0.04);
            adaptations.collaboration = this.adjustTrait(currentTraits.collaboration, 0.04);
            break;
          case 'creative':
            adaptations.creativity = this.adjustTrait(currentTraits.creativity, 0.05);
            adaptations.intuition = this.adjustTrait(currentTraits.intuition, 0.03);
            break;
        }
      }
    }
    
    return adaptations;
  }

  /**
   * Ajuste un trait avec une limite de changement
   */
  private adjustTrait(currentValue: number, adjustment: number): number {
    return Math.max(0, Math.min(1, currentValue + adjustment));
  }

  /**
   * Effectue l'apprentissage à partir de données comportementales
   */
  async learn(behaviorData: any): Promise<boolean> {
    try {
      if (this.mesh.learn) {
        await this.mesh.learn(behaviorData);
      }
      return true;
    } catch (_error) {
      logger.error('Erreur apprentissage:', _error);
      return false;
    }
  }

  /**
   * Obtient les métriques de performance du réseau neural
   */
  getPerformanceMetrics(): any {
    try {
      return this.mesh.getPerformanceMetrics 
        ? this.mesh.getPerformanceMetrics()
        : { nodeCount: 0, connectionCount: 0, neuralActivity: 0, connectionStrength: 0 };
    } catch (_error) {
      logger.error('Erreur métriques:', _error);
      return {
        processingTime: 0,
        accuracy: 0,
        memoryUsage: 0
      };
    }
  }

  /**
   * Sauvegarde l'état du réseau neural
   */
  saveState(): any {
    try {
      return this.mesh.saveState();
    } catch (_error) {
      logger.error('Erreur sauvegarde état neural:', _error);
      return null;
    }
  }

  /**
   * Restaure l'état du réseau neural
   */
  loadState(state: any): boolean {
    try {
      this.mesh.loadState(state);
      return true;
    } catch (_error) {
      logger.error('Erreur chargement état neural:', _error);
      return false;
    }
  }

  /**
   * Réinitialise le réseau neural
   */
  reset(): void {
    try {
      this.mesh.reset();
      this.processingQueue = [];
      this.isProcessing = false;
    } catch (_error) {
      logger.error('Erreur reset neural:', _error);
    }
  }

  /**
   * Nettoyage pour libérer les ressources
   */
  cleanup(): void {
    this.processingQueue = [];
    this.isProcessing = false;
    
    // Si le mesh a une méthode cleanup
    if (typeof (this.mesh as any).cleanup === 'function') {
      (this.mesh as any).cleanup();
    }
  }

  /**
   * Vérifie l'état de santé du service neural
   */
  healthCheck(): { healthy: boolean; issues: string[] } {
    const issues: string[] = [];
    
    if (!this.mesh) {
      issues.push('Réseau neural non initialisé');
    }
    
    if (this.processingQueue.length > 1000) {
      issues.push('Queue de traitement surchargée');
    }
    
    try {
      const metrics = this.getPerformanceMetrics();
      if (metrics.processingTime > 1000) {
        issues.push('Temps de traitement élevé');
      }
    } catch {
      issues.push('Métriques non disponibles');
    }
    
    return {
      healthy: issues.length === 0,
      issues
    };
  }

  // =============================================================================
  // MÉTHODES AJOUTÉES POUR COMPATIBILITÉ ORGANISMCORE
  // =============================================================================

  /**
   * Initialize neural service
   */
  async initialize(): Promise<void> {
    await this.mesh.initialize();
  }

  /**
   * Suspend neural processing
   */
  async suspend(): Promise<void> {
    await this.mesh.suspend();
  }

  /**
   * Update neural processing with delta time
   */
  update(deltaTime: number): void {
    // Process pending patterns based on delta time
    const timeFactor = deltaTime / 16.67; // Normalize to 60fps
    const patternsToProcess = Math.ceil(timeFactor);
    
    for (let i = 0; i < patternsToProcess && this.processingQueue.length > 0; i++) {
      const pattern = this.processingQueue.shift();
      if (pattern && this.mesh.learn) {
        this.mesh.learn(pattern.data).catch((_error: unknown) => {
          logger.error('Neural processing error:', _error);
        });
      }
    }
  }

  /**
   * Stimulate neural input
   */
  stimulate(inputId: string, value: number): void {
    this.mesh.stimulate(inputId, value);
  }

  /**
   * Get neural activity level
   */
  getNeuralActivity(): number {
    return this.mesh.getNeuralActivity();
  }
}