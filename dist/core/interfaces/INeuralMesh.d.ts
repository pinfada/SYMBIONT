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
}
//# sourceMappingURL=INeuralMesh.d.ts.map