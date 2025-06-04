import { OrganismState, PageContext, ActionPrediction } from '../../shared/types/organism';
export declare class BehaviorPredictor {
    predict(data: any[]): any;
    analyzeBehavior(sequence: any[]): any;
    updateModel(): void;
    predictNextAction(organism: OrganismState, context: PageContext): ActionPrediction;
}
//# sourceMappingURL=BehaviorPredictor.d.ts.map