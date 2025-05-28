import { OrganismState, Mutation } from '../shared/types/organism';
export declare class GeneticMutator {
    private mutationProbability;
    private traitWeights;
    private environmentalPressure;
    constructor(mutationProbability?: number, traitWeights?: Record<string, number>, environmentalPressure?: number);
    calculateMutationProbability(organism: OrganismState): number;
    generateMutation(trait: string, trigger?: any): Mutation;
    applyMutation(organism: OrganismState, mutation: Mutation): OrganismState;
}
//# sourceMappingURL=GeneticMutator.d.ts.map