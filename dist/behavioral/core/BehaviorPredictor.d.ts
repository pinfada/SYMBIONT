import { OrganismState, PageContext, ActionPrediction } from '../../shared/types/organism';
export declare class BehaviorPredictor {
    predict(data: unknown[]): any;
    analyzeBehavior(sequence: unknown[]): any;
    updateModel(): void;
    predictNextAction(organism: OrganismState, context: PageContext): ActionPrediction;
}
//# sourceMappingURL=BehaviorPredictor.d.ts.map