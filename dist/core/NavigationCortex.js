"use strict";
/**
 * NavigationCortex - Analyseur de navigation et de patterns temporels
 * - Enregistre les événements de navigation (URL, timestamp, action)
 * - Détecte patterns de routine, exploration, répétition
 * - Supporte l'ajout de détecteurs personnalisés
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.NavigationCortex = void 0;
class NavigationCortex {
    constructor() {
        this.events = [];
        this.detectors = [];
        this.lastPatterns = [];
    }
    /**
     * Enregistre un événement de navigation
     */
    recordEvent(event) {
        this.events.push(event);
    }
    /**
     * Ajoute un détecteur de pattern personnalisé
     */
    addDetector(detector) {
        this.detectors.push(detector);
    }
    /**
     * Analyse les événements et retourne les patterns détectés
     */
    getPatterns() {
        let patterns = [];
        for (const detector of this.detectors) {
            patterns = patterns.concat(detector(this.events));
        }
        this.lastPatterns = patterns;
        return patterns;
    }
    /**
     * Réinitialise l'historique de navigation
     */
    reset() {
        this.events = [];
        this.lastPatterns = [];
    }
    /**
     * Export JSON pour debug/visualisation
     */
    toJSON() {
        return {
            events: this.events,
            lastPatterns: this.lastPatterns,
            detectors: this.detectors.length
        };
    }
}
exports.NavigationCortex = NavigationCortex;
