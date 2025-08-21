import { BehaviorAnalysis, NavigationEvent } from '../../types/behavioral';
export declare class BehavioralEngine {
    private static instance;
    private patterns;
    private analyzer;
    private predictor;
    private sessionTracker;
    private storage;
    private constructor();
    static getInstance(): BehavioralEngine;
    analyzeBehavior(event: NavigationEvent): Promise<BehaviorAnalysis>;
    analyzeNavigation(event: NavigationEvent): BehaviorAnalysis;
    processBehavior(data: unknown): any;
    analyze(): BehaviorAnalysis;
}
//# sourceMappingURL=BehavioralEngine.d.ts.map