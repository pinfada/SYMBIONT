"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SynapticRouter = void 0;
const EventEmitter_1 = require("../utils/EventEmitter");
const NeuralMesh_1 = require("../neural/NeuralMesh");
class SynapticRouter extends EventEmitter_1.EventEmitter {
    constructor() {
        super();
        this.predictions = new Map();
        this.cache = new Map();
        this.neuralMesh = new NeuralMesh_1.NeuralMesh();
        this.setupLearningLoop();
    }
    static getInstance() {
        if (!SynapticRouter.instance) {
            SynapticRouter.instance = new SynapticRouter();
        }
        return SynapticRouter.instance;
    }
    async routeImpulse(impulse) {
        const routeKey = this.getRouteKey(impulse);
        // Tentative prédictive
        const optimizedRoute = await this.findOptimalRoute(impulse);
        if (optimizedRoute.predicted) {
            console.log(`🧠 Predicted route for ${impulse.type}`);
            return optimizedRoute.predictedResponse;
        }
        // Route standard
        const response = await this.performRouting(impulse, optimizedRoute.route);
        // Apprentissage
        this.learnFromRouting(routeKey, optimizedRoute.route, response);
        return response;
    }
}
exports.SynapticRouter = SynapticRouter;
