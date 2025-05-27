"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NeuralMesh = void 0;
const SynapticRouter_1 = require("./SynapticRouter");
const OrganismCore_1 = require("./OrganismCore");
const NavigationCortex_1 = require("./NavigationCortex");
class NeuralMesh {
    constructor() {
        this.router = new SynapticRouter_1.SynapticRouter();
        this.core = new OrganismCore_1.OrganismCore();
        this.cortex = new NavigationCortex_1.NavigationCortex();
    }
    /**
     * Initialise le réseau neuronal
     * @returns {Promise<void>}
     */
    async initialize() {
        await this.router.connect();
        await this.core.boot();
        await this.cortex.initialize();
    }
    /**
     * Gère la suspension du système
     * @returns {Promise<void>}
     */
    async suspend() {
        await this.cortex.suspend();
        await this.core.hibernate();
        await this.router.disconnect();
    }
    /**
     * Mesure les performances du système
     * @returns {Promise<{cpu: number, memory: number}>}
     */
    async measurePerformance() {
        const metrics = {
            cpu: await this.core.getCPUUsage(),
            memory: await this.core.getMemoryUsage()
        };
        return metrics;
    }
}
exports.NeuralMesh = NeuralMesh;
