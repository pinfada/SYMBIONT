export declare class HebbieanLearningSystem {
    private weights;
    private activations;
    private lastActive;
    private learningRate;
    private inactivityThreshold;
    constructor(learningRate?: number, inactivityThreshold?: number);
    strengthenConnection(preId: string, postId: string, preAct: number, postAct: number): void;
    weakenUnusedConnections(): void;
    setActivation(nodeId: string, value: number): void;
    detectEmergentPatterns(): string[];
    getWeight(preId: string, postId: string): number;
    toJSON(): {
        weights: [string, number][];
        activations: [string, number][];
        lastActive: [string, number][];
    };
}
//# sourceMappingURL=HebbieanLearningSystem.d.ts.map