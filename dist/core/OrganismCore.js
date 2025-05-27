"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrganismCore = void 0;
/**
 * OrganismCore - Cœur logique de l'organisme artificiel
 * - Encapsule le NeuralMesh (réseau neuronal interne)
 * - Gère les traits, l'énergie, la santé
 * - Synchronisation possible avec le moteur WebGL
 */
const NeuralMesh_1 = require("./neural/NeuralMesh");
const DNAInterpreter_1 = require("../generative/DNAInterpreter");
class OrganismCore {
    constructor(dna, traits) {
        this.dna = dna;
        this.interpreter = new DNAInterpreter_1.DNAInterpreter(dna);
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
        this.setupDefaultMesh();
    }
    /**
     * Initialise un réseau neuronal de base (modifiable)
     */
    setupDefaultMesh() {
        this.mesh.addNode('perception', 'input');
        this.mesh.addNode('memory', 'hidden');
        this.mesh.addNode('decision', 'output');
        this.mesh.addConnection('perception', 'memory', 0.8);
        this.mesh.addConnection('memory', 'decision', 1.2);
    }
    /**
     * Stimule le réseau (ex : perception sensorielle)
     */
    stimulate(inputId, value) {
        this.mesh.stimulate(inputId, value);
    }
    /**
     * Propage l'activation et met à jour les traits/états
     */
    propagate() {
        this.mesh.propagate();
        // Exemple : la sortie "decision" module l'énergie
        const decision = this.mesh.getActivation('decision');
        this.energy = Math.max(0, Math.min(1, this.energy + (decision - 0.5) * 0.01));
        // Les traits pourraient être modulés dynamiquement ici
    }
    /**
     * Applique une mutation (neural ou ADN)
     */
    mutate(rate = 0.05) {
        this.mesh.mutate(rate);
        this.interpreter.evolveDNA(rate);
        this.lastMutation = Date.now();
    }
    /**
     * Récupère les traits courants
     */
    getTraits() {
        return { ...this.traits };
    }
    /**
     * Définit de nouveaux traits (ex : adaptation externe)
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
     * Export JSON pour debug/visualisation (types internes anonymisés)
     */
    toJSON() {
        return {
            mesh: this.mesh.toJSON(),
            traits: this.traits,
            energy: this.energy,
            health: this.health,
            dna: this.dna
        };
    }
    /**
     * Récupère les paramètres shaders courants (pour WebGL)
     */
    getShaderParameters() {
        return this.interpreter.getCurrentParameters();
    }
}
exports.OrganismCore = OrganismCore;
