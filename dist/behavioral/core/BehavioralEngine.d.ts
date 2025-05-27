import { BehaviorAnalysis, NavigationEvent } from '../../types';
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
}
