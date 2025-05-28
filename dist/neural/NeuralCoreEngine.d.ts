import { OrganismMemoryBank } from '../background/OrganismMemoryBank';
import { OrganismState, BehaviorPattern, Mutation, PageContext, ActionPrediction } from '../shared/types/organism';
export declare class NeuralCoreEngine {
    private organisms;
    private hebbian;
    private predictor;
    private mutator;
    private memoryBank;
    constructor(memoryBank: OrganismMemoryBank);
    createOrganism(userId: string): Promise<OrganismState>;
    evolveOrganism(id: string, behaviorData: BehaviorPattern[]): Promise<Mutation[]>;
    predictNextAction(id: string, context: PageContext): Promise<ActionPrediction>;
}
//# sourceMappingURL=NeuralCoreEngine.d.ts.map