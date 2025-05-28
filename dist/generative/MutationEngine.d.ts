import { OrganismMutation, MutationState } from '../shared/types/organism';
export declare class MutationEngine {
    private activeMutations;
    private mutationId;
    private currentState;
    /**
     * Applique une mutation visuelle (autres types ignorés)
     */
    apply(mutation: OrganismMutation): string | undefined;
    /**
     * Met à jour toutes les mutations actives
     */
    update(currentTime: number): void;
    private applyEasing;
    private updateMutationState;
    getCurrentState(): MutationState;
    clearAll(): void;
}
//# sourceMappingURL=MutationEngine.d.ts.map