// src/generative/MutationEngine.ts
// Système de mutations
import { OrganismMutation, MutationState } from '../types';

interface VisualMutation {
    type: 'color_shift' | 'pattern_change' | 'size_fluctuation' | 'opacity_variation';
    magnitude: number;
    duration: number;
    easing: 'linear' | 'ease-in' | 'ease-out' | 'bounce';
    startTime?: number;
    progress?: number;
  }
  
  export class MutationEngine {
    private activeMutations: Map<string, VisualMutation> = new Map();
    private mutationId: number = 0;
    private currentState: MutationState = {
      colorShift: 0,
      patternIntensity: 0,
      sizeMultiplier: 1,
      opacity: 1
    };
    
    public apply(mutation: VisualMutation): string {
      const id = `mutation_${this.mutationId++}`;
      mutation.startTime = performance.now();
      mutation.progress = 0;
      
      this.activeMutations.set(id, mutation);
      return id;
    }
    
    public update(currentTime: number): void {
      // Mise à jour de toutes les mutations actives
      for (const [id, mutation] of this.activeMutations.entries()) {
        const elapsed = currentTime - (mutation.startTime || 0);
        const progress = Math.min(elapsed / mutation.duration, 1);
        
        // Application de l'easing
        mutation.progress = this.applyEasing(progress, mutation.easing);
        
        // Mise à jour de l'état
        this.updateMutationState(mutation);
        
        // Suppression si terminé
        if (progress >= 1) {
          this.activeMutations.delete(id);
        }
      }
    }
    
    private applyEasing(t: number, easing: string): number {
      switch (easing) {
        case 'ease-in':
          return t * t;
        case 'ease-out':
          return t * (2 - t);
        case 'bounce':
          return t < 0.5 
            ? 4 * t * t * t 
            : 1 - Math.pow(-2 * t + 2, 3) / 2;
        default:
          return t;
      }
    }
    
    private updateMutationState(mutation: VisualMutation): void {
      const factor = mutation.progress! * mutation.magnitude;
      
      switch (mutation.type) {
        case 'color_shift':
          this.currentState.colorShift = factor;
          break;
        case 'pattern_change':
          this.currentState.patternIntensity = factor;
          break;
        case 'size_fluctuation':
          this.currentState.sizeMultiplier = 1 + factor * 0.5;
          break;
        case 'opacity_variation':
          this.currentState.opacity = 1 - factor * 0.3;
          break;
      }
    }
    
    public getCurrentState(): MutationState {
      return { ...this.currentState };
    }
    
    public clearAll(): void {
      this.activeMutations.clear();
      this.currentState = {
        colorShift: 0,
        patternIntensity: 0,
        sizeMultiplier: 1,
        opacity: 1
      };
    }
}