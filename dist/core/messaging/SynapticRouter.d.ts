declare class EventEmitter {
    constructor();
}
interface NeuralImpulse {
    type: string;
    [key: string]: any;
}
export declare class SynapticRouter extends EventEmitter {
    private static instance;
    private neuralMesh;
    private predictions;
    private cache;
    private constructor();
    static getInstance(): SynapticRouter;
    routeImpulse(impulse: NeuralImpulse): Promise<any>;
    private setupLearningLoop;
    private getRouteKey;
    private findOptimalRoute;
    private performRouting;
    private learnFromRouting;
}
export {};
