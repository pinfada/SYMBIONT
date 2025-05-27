"use strict";
/**
 * SensoryNetwork - Réseau sensoriel pour organisme artificiel
 * - Gère les capteurs, la normalisation, le bruit, l'adaptation
 * - Prêt à être branché sur OrganismCore/NeuralMesh
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SensoryNetwork = void 0;
class SensoryNetwork {
    constructor() {
        this.sensors = new Map();
    }
    /**
     * Ajoute un capteur sensoriel
     */
    addSensor(id, type, min = 0, max = 1, noise = 0.01) {
        if (this.sensors.has(id))
            throw new Error(`Sensor ${id} already exists`);
        this.sensors.set(id, { id, type, min, max, noise, value: 0 });
    }
    /**
     * Simule une perception (avec bruit et normalisation)
     */
    sense(id, rawValue) {
        const sensor = this.sensors.get(id);
        if (!sensor)
            throw new Error('Sensor not found');
        // Normalisation
        let v = (rawValue - sensor.min) / (sensor.max - sensor.min);
        // Ajout de bruit gaussien
        v += this.gaussianNoise(0, sensor.noise);
        v = Math.max(0, Math.min(1, v));
        sensor.value = v;
        return v;
    }
    /**
     * Récupère les valeurs normalisées de tous les capteurs
     */
    getInputs() {
        const inputs = {};
        for (const [id, sensor] of this.sensors.entries()) {
            inputs[id] = sensor.value;
        }
        return inputs;
    }
    /**
     * Adapte dynamiquement la sensibilité d'un capteur
     */
    adapt(id, newMin, newMax, newNoise) {
        const sensor = this.sensors.get(id);
        if (!sensor)
            throw new Error('Sensor not found');
        sensor.min = newMin;
        sensor.max = newMax;
        if (newNoise !== undefined)
            sensor.noise = newNoise;
    }
    /**
     * Génère un bruit gaussien (Box-Muller)
     */
    gaussianNoise(mu, sigma) {
        let u = 0, v = 0;
        while (u === 0)
            u = Math.random();
        while (v === 0)
            v = Math.random();
        return mu + sigma * Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
    }
    /**
     * Export JSON pour debug/visualisation
     */
    toJSON() {
        return Array.from(this.sensors.values());
    }
}
exports.SensoryNetwork = SensoryNetwork;
