"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebGLBridge = void 0;
const MessageBus_1 = require("../../shared/messaging/MessageBus");
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
        const handler = (message) => {
            if (message.payload?.state) {
                this.updateState(message.payload.state);
            }
        };
        this.messageBus.on(MessageBus_1.MessageType.ORGANISM_UPDATE, handler);
        this.unsubscribeHandler = () => this.messageBus.off(MessageBus_1.MessageType.ORGANISM_UPDATE, handler);
    }
    startRendering(dna) {
        if (this.isRendering) {
            console.warn('Le rendu est déjà en cours');
            return;
        }
        // Demande d'initialisation WebGL dans la popup
        this.messageBus.send({
            type: MessageBus_1.MessageType.WEBGL_INIT,
            payload: { dna }
        });
        this.isRendering = true;
        // Boucle de rendu à 60fps (16ms ≈ 60fps)
        this.renderInterval = window.setInterval(() => {
            if (this.currentState && this.isRendering) {
                this.messageBus.send({
                    type: MessageBus_1.MessageType.ORGANISM_STATE_CHANGE,
                    payload: { state: this.currentState }
                });
            }
        }, 16);
    }
    updateState(state) {
        // Validation basique de l'état
        if (!state) {
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
            type: MessageBus_1.MessageType.ORGANISM_MUTATE,
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
