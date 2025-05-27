import { EventEmitter } from '../utils/EventEmitter';
export declare class SynapticRouter extends EventEmitter {
    private static instance;
    private neuralMesh;
    private predictions;
    private cache;
    private constructor();
    static getInstance(): SynapticRouter;
    routeImpulse(impulse: NeuralImpulse): Promise<any>;
}
