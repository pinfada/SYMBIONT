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
    private routes;
    private constructor();
    static getInstance(): SynapticRouter;
    routeImpulse(impulse: NeuralImpulse): Promise<unknown>;
    private setupLearningLoop;
    private getRouteKey;
    private findOptimalRoute;
    private performRouting;
    private learnFromRouting;
    route(type: string, target: string): any;
    addRoute(type: string, handler: any): void;
    processImpulse(impulse: any): any;
}
export {};
//# sourceMappingURL=SynapticRouter.d.ts.map