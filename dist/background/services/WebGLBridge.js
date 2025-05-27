"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebGLBridge = void 0;
const types_1 = require("../../types");
class WebGLBridge {
    constructor(messageBus) {
        this.renderInterval = null;
        this.currentState = null;
        this.isRendering = false;
        this.messageBus = messageBus;
        this.setupMessageHandlers();
    }
    setupMessageHandlers() {
        // Écouter les réponses du moteur WebGL
        this.unsubscribeHandler = this.messageBus.on(types_1.MessageType.ORGANISM_UPDATE, (message) => {
            if (message.payload?.state) {
                this.updateState(message.payload.state);
            }
        });
    }
    startRendering(dna) {
        if (this.isRendering) {
            console.warn('Le rendu est déjà en cours');
            return;
        }
        // Demande d'initialisation WebGL dans la popup
        this.messageBus.send({
            type: types_1.MessageType.WEBGL_INIT,
            payload: { dna }
        });
        this.isRendering = true;
        // Boucle de rendu à 60fps (16ms ≈ 60fps)
        this.renderInterval = window.setInterval(() => {
            if (this.currentState && this.isRendering) {
                this.messageBus.send({
                    type: types_1.MessageType.ORGANISM_RENDER,
                    payload: { state: this.currentState }
                });
            }
        }, 16);
    }
    updateState(state) {
        // Validation basique de l'état
        if (!state || typeof state.id !== 'string') {
            console.error('État d\'organisme invalide:', state);
            return;
        }
        this.currentState = { ...state }; // Copie défensive
    }
    triggerMutation(mutation) {
        if (!mutation || !mutation.type) {
            console.error('Mutation invalide:', mutation);
            return;
        }
        this.messageBus.send({
            type: types_1.MessageType.ORGANISM_MUTATE,
            payload: { mutation }
        });
    }
    stopRendering() {
        this.isRendering = false;
        if (this.renderInterval !== null) {
            clearInterval(this.renderInterval);
            this.renderInterval = null;
        }
    }
    getCurrentState() {
        return this.currentState ? { ...this.currentState } : null;
    }
    isCurrentlyRendering() {
        return this.isRendering;
    }
    // Nettoyage des ressources
    dispose() {
        this.stopRendering();
        this.currentState = null;
        // Désenregistrer le handler de messages
        if (this.unsubscribeHandler) {
            this.unsubscribeHandler();
            this.unsubscribeHandler = undefined;
        }
    }
}
exports.WebGLBridge = WebGLBridge;
