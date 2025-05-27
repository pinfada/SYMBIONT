"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrganismCore = void 0;
const NeuralMesh_1 = require("./NeuralMesh");
class OrganismCore {
    constructor(dna, traits) {
        this.dna = dna;
        // this.interpreter = new DNAInterpreter(dna);
        this.mesh = new NeuralMesh_1.NeuralMesh();
        this.traits = {
            curiosity: 0.5,
            focus: 0.5,
            rhythm: 0.5,
            empathy: 0.5,
            creativity: 0.5,
            energy: 0.5,
            harmony: 0.5,
            wisdom: 0.1,
            ...traits
        };
        this.energy = 1.0;
        this.health = 1.0;
        this.lastMutation = Date.now();
        this.metabolismRate = 0.01;
        this.initializeNeuralNetwork();
    }
    /**
     * Initialise le réseau neuronal avec les traits de l'organisme
     */
    async initializeNeuralNetwork() {
        await this.mesh.initialize();
        // Configure network based on traits
        this.mesh.stimulate('sensory_input', this.traits.curiosity);
        this.mesh.stimulate('memory_input', this.traits.focus);
    }
    /**
     * Met à jour l'état de l'organisme (appelé périodiquement)
     */
    update(deltaTime = 1) {
        // Neural processing
        this.mesh.propagate();
        // Energy management
        this.updateEnergy(deltaTime);
        // Health management
        this.updateHealth();
        // Trait evolution based on neural activity
        this.evolveTraits();
    }
    /**
     * Met à jour l'énergie basée sur l'activité neurale
     */
    updateEnergy(deltaTime) {
        const neuralActivity = this.mesh.getNeuralActivity();
        const energyCost = neuralActivity * this.metabolismRate * deltaTime;
        this.energy = Math.max(0, Math.min(1, this.energy - energyCost));
        // Low energy affects health
        if (this.energy < 0.2) {
            this.health *= 0.999;
        }
    }
    /**
     * Met à jour la santé basée sur les conditions actuelles
     */
    updateHealth() {
        // Health recovery when energy is high
        if (this.energy > 0.8) {
            this.health = Math.min(1, this.health + 0.001);
        }
        // Ensure health doesn't drop below 0
        this.health = Math.max(0, this.health);
    }
    /**
     * Fait évoluer les traits basés sur l'activité neurale
     */
    evolveTraits() {
        const activity = this.mesh.getNeuralActivity();
        const connectionStrength = this.mesh.getConnectionStrength();
        // Subtle trait evolution
        const evolutionRate = 0.001;
        this.traits.focus += (activity - 0.5) * evolutionRate;
        this.traits.creativity += (connectionStrength - 0.5) * evolutionRate;
        // Clamp traits to valid range
        Object.keys(this.traits).forEach(key => {
            this.traits[key] = Math.max(0, Math.min(1, this.traits[key]));
        });
    }
    /**
     * Stimule le réseau (ex : perception sensorielle)
     */
    stimulate(inputId, value) {
        this.mesh.stimulate(inputId, value);
    }
    /**
     * Applique une mutation (neural et potentiellement ADN)
     */
    mutate(rate = 0.05) {
        this.mesh.mutate(rate);
        // Mutate traits slightly
        Object.keys(this.traits).forEach(key => {
            if (Math.random() < rate) {
                const mutation = (Math.random() - 0.5) * 0.1;
                this.traits[key] = Math.max(0, Math.min(1, this.traits[key] + mutation));
            }
        });
        this.lastMutation = Date.now();
    }
    /**
     * Nourrit l'organisme pour restaurer l'énergie
     */
    feed(amount = 0.3) {
        this.energy = Math.min(1, this.energy + amount);
    }
    /**
     * Récupère les traits courants
     */
    getTraits() {
        return { ...this.traits };
    }
    /**
     * Définit de nouveaux traits
     */
    setTraits(traits) {
        this.traits = { ...this.traits, ...traits };
    }
    /**
     * Récupère l'état global de l'organisme
     */
    getState() {
        return {
            traits: this.getTraits(),
            energy: this.energy,
            health: this.health,
            lastMutation: this.lastMutation,
            visualDNA: this.dna,
            timeStamp: Date.now()
        };
    }
    /**
     * Récupère les métriques de performance
     */
    async getPerformanceMetrics() {
        return {
            cpu: await this.mesh.getCPUUsage(),
            memory: await this.mesh.getMemoryUsage(),
            neuralActivity: this.mesh.getNeuralActivity(),
            connectionStrength: this.mesh.getConnectionStrength()
        };
    }
    /**
     * Export JSON typé pour debug/visualisation
     */
    toJSON() {
        return {
            mesh: this.mesh.toJSON(),
            traits: this.traits,
            energy: this.energy,
            health: this.health,
            dna: this.dna,
            timestamp: Date.now()
        };
    }
    /**
     * Récupère les paramètres shaders courants (pour WebGL)
     */
    getShaderParameters() {
        // Return shader parameters based on current organism state
        return {
            energy: this.energy,
            health: this.health,
            neuralActivity: this.mesh.getNeuralActivity(),
            creativity: this.traits.creativity,
            focus: this.traits.focus,
            time: Date.now() / 1000
        };
    }
    /**
     * Initialise l'organisme
     */
    async boot() {
        await this.initializeNeuralNetwork();
        console.log('Organism core booted successfully');
    }
    /**
     * Met l'organisme en hibernation
     */
    async hibernate() {
        // Save state or perform cleanup
        console.log('Organism core hibernating...');
    }
}
exports.OrganismCore = OrganismCore;
