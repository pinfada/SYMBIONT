import { PageContext, ActionPrediction } from '../shared/types/organism';
export declare class BehavioralPredictor {
    private history;
    private transitionCounts;
    private actionCounts;
    constructor();
    record(context: PageContext, action: string): void;
    predictNextAction(context: PageContext): ActionPrediction;
    updateModel(actualAction: string, prediction: ActionPrediction): void;
    calculateConfidence(prediction: ActionPrediction): number;
}
//# sourceMappingURL=BehavioralPredictor.d.ts.map