"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MutationEngine = void 0;
class MutationEngine {
    constructor() {
        // On utilise Map<string, any> car les mutations sont enrichies dynamiquement (startTime, progress)
        this.activeMutations = new Map();
        this.mutationId = 0;
        this.currentState = {
            colorShift: 0,
            patternIntensity: 0,
            sizeMultiplier: 1,
            opacity: 1
        };
    }
    /**
     * Applique une mutation visuelle (autres types ignorés)
     */
    apply(mutation) {
        if (!['color_shift', 'pattern_change', 'size_fluctuation', 'opacity_variation'].includes(mutation.type)) {
            // Ignorer les mutations non visuelles
            return undefined;
        }
        const id = `mutation_${this.mutationId++}`;
        const visualMutation = mutation;
        visualMutation.startTime = performance.now();
        visualMutation.progress = 0;
        this.activeMutations.set(id, visualMutation);
        return id;
    }
    /**
     * Met à jour toutes les mutations actives
     */
    update(currentTime) {
        for (const [id, mutation] of this.activeMutations.entries()) {
            const elapsed = currentTime - (mutation.startTime || 0);
            const progress = Math.min(elapsed / mutation.duration, 1);
            mutation.progress = this.applyEasing(progress, mutation.easing || 'linear');
            this.updateMutationState(mutation);
            if (progress >= 1) {
                this.activeMutations.delete(id);
            }
        }
    }
    applyEasing(t, easing) {
        switch (easing) {
            case 'ease-in': return t * t;
            case 'ease-out': return t * (2 - t);
            case 'bounce': return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
            default: return t;
        }
    }
    updateMutationState(mutation) {
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
    getCurrentState() {
        return { ...this.currentState };
    }
    clearAll() {
        this.activeMutations.clear();
        this.currentState = {
            colorShift: 0,
            patternIntensity: 0,
            sizeMultiplier: 1,
            opacity: 1
        };
    }
}
exports.MutationEngine = MutationEngine;
