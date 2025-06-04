import { OrganismMemoryBank } from '../background/OrganismMemoryBank';
import { OrganismState, BehaviorPattern, Mutation, PageContext, ActionPrediction } from '../shared/types/organism';
export declare class NeuralCoreEngine {
    private organisms;
    private hebbian;
    private predictor;
    private mutator;
    private memoryBank;
    private initialized;
    constructor(memoryBank: OrganismMemoryBank);
    private initialize;
    createOrganism(userId: string): Promise<OrganismState>;
    evolveOrganism(id: string, behaviorData: BehaviorPattern[]): Promise<Mutation[]>;
    predictNextAction(id: string, context: PageContext): Promise<ActionPrediction>;
    private generateDNA;
    private simpleHash;
    private applyMutation;
    private calculateConfidence;
    private generateSuggestions;
    getOrganism(id: string): OrganismState | undefined;
    loadOrganism(id: string): Promise<OrganismState | null>;
    getAllOrganisms(): OrganismState[];
    isInitialized(): Promise<boolean>;
}
//# sourceMappingURL=NeuralCoreEngine.d.ts.map