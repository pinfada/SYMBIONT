import { PerformanceMetrics } from '../shared/types/organism';
import { SymbiontMessage, SymbiontResponse } from '../shared/types/messages';
import { NeuralCoreEngine } from '../neural/NeuralCoreEngine';
import { SocialNetworkManager } from '../social/SocialNetworkManager';
import { SecretRitualSystem } from '../mystical/SecretRitualSystem';
import { WebGLOrchestrator } from './WebGLOrchestrator';
interface SynapticRouterDeps {
    neural: NeuralCoreEngine;
    social: SocialNetworkManager;
    rituals: SecretRitualSystem;
    webgl?: WebGLOrchestrator;
}
export declare class SynapticRouter {
    private deps;
    constructor(deps: SynapticRouterDeps);
    routeMessage(message: SymbiontMessage): Promise<SymbiontResponse>;
    optimizeRouting(performance: PerformanceMetrics): Promise<void>;
}
export {};
//# sourceMappingURL=SynapticRouter.d.ts.map