export interface NeuralNode {
    id: string;
    type: 'input' | 'hidden' | 'output';
    activation: number;
    bias: number;
}
export interface NeuralConnection {
    from: string;
    to: string;
    weight: number;
    active: boolean;
}
export interface PerformanceMetrics {
    cpu: number;
    memory: number;
    neuralActivity: number;
    connectionStrength: number;
}
export interface INeuralMesh {
    initialize(): Promise<void>;
    addNode(id: string, type: 'input' | 'hidden' | 'output', bias?: number): void;
    addConnection(fromId: string, toId: string, weight: number): void;
    stimulate(nodeId: string, value: number): void;
    propagate(): void;
    getActivation(nodeId: string): number;
    mutate(rate?: number): void;
    getNeuralActivity(): number;
    getConnectionStrength(): number;
    getCPUUsage(): Promise<number>;
    getMemoryUsage(): Promise<number>;
    toJSON(): any;
    suspend(): Promise<void>;
    processPattern?: (pattern: any) => Promise<any>;
    learn?: (data: any) => Promise<void>;
    getPerformanceMetrics?: () => any;
    saveState(): any;
    loadState(state: any): void;
    reset(): void;
    healthCheck(): {
        healthy: boolean;
        issues: string[];
    };
    cleanup(): void;
}
//# sourceMappingURL=INeuralMesh.d.ts.map