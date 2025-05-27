// src/generative/MutationEngine.ts
// Système de mutations harmonisé
import { OrganismMutation, MutationState } from '../types';

// Seuls les types visuels sont acceptés par le moteur WebGL
// (visual_evolution est ignoré ici)
type VisualMutation = Extract<OrganismMutation, { type: 'color_shift' | 'pattern_change' | 'size_fluctuation' | 'opacity_variation' }>;

export class MutationEngine {
  // On utilise Map<string, any> car les mutations sont enrichies dynamiquement (startTime, progress)
  private activeMutations: Map<string, any> = new Map();
  private mutationId: number = 0;
  private currentState: MutationState = {
    colorShift: 0,
    patternIntensity: 0,
    sizeMultiplier: 1,
    opacity: 1
  };

  /**
   * Applique une mutation visuelle (autres types ignorés)
   */
  public apply(mutation: OrganismMutation): string | undefined {
    if (!['color_shift', 'pattern_change', 'size_fluctuation', 'opacity_variation'].includes(mutation.type)) {
      // Ignorer les mutations non visuelles
      return undefined;
    }
    const id = `mutation_${this.mutationId++}`;
    const visualMutation: VisualMutation = mutation as VisualMutation;
    (visualMutation as any).startTime = performance.now();
    (visualMutation as any).progress = 0;
    this.activeMutations.set(id, visualMutation);
    return id;
  }

  /**
   * Met à jour toutes les mutations actives
   */
  public update(currentTime: number): void {
    for (const [id, mutation] of this.activeMutations.entries()) {
      const elapsed = currentTime - ((mutation as any).startTime || 0);
      const progress = Math.min(elapsed / (mutation as any).duration, 1);
      (mutation as any).progress = this.applyEasing(progress, (mutation as any).easing || 'linear');
      this.updateMutationState(mutation as any);
      if (progress >= 1) {
        this.activeMutations.delete(id);
      }
    }
  }

  private applyEasing(t: number, easing: string): number {
    switch (easing) {
      case 'ease-in': return t * t;
      case 'ease-out': return t * (2 - t);
      case 'bounce': return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      default: return t;
    }
  }

  private updateMutationState(mutation: any): void {
    const factor = (mutation.progress || 0) * mutation.magnitude;
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