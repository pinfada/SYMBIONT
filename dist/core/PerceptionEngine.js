"use strict";
/**
 * PerceptionEngine - Moteur de perception pour organisme artificiel
 * - Fusionne, filtre et prétraite les signaux sensoriels
 * - Supporte l'ajout de filtres personnalisés (moyenne, seuillage, etc.)
 * - Prêt à être branché sur SensoryNetwork et OrganismCore
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.PerceptionEngine = void 0;
class PerceptionEngine {
    constructor() {
        this.filters = [];
        this.lastFeatures = {};
    }
    /**
     * Ajoute un filtre de prétraitement (ex : normalisation, seuillage)
     */
    addFilter(filter) {
        this.filters.push(filter);
    }
    /**
     * Traite les entrées sensorielle et extrait les features
     */
    process(inputs) {
        let features = { ...inputs };
        for (const filter of this.filters) {
            features = filter(features);
        }
        this.lastFeatures = features;
        return features;
    }
    /**
     * Récupère les dernières features extraites
     */
    getFeatures() {
        return { ...this.lastFeatures };
    }
    /**
     * Réinitialise l'état du moteur de perception
     */
    reset() {
        this.lastFeatures = {};
    }
    /**
     * Export JSON pour debug/visualisation
     */
    toJSON() {
        return {
            filters: this.filters.length,
            lastFeatures: this.lastFeatures
        };
    }
}
exports.PerceptionEngine = PerceptionEngine;
