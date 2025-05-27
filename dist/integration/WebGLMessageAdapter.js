"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebGLMessageAdapter = void 0;
// MessageBus et MessageType doivent être importés selon votre architecture
const messaging_1 = require("../core/messaging");
/**
 * Adaptateur entre le bus de messages et le moteur WebGL
 */
class WebGLMessageAdapter {
    constructor(engine, messageBus) {
        this.engine = engine;
        this.messageBus = messageBus;
        this.setupListeners();
    }
    /**
     * Mise en place des listeners sur le bus de messages
     */
    setupListeners() {
        // Écoute des mutations
        this.messageBus.on(messaging_1.MessageType.ORGANISM_MUTATE, (message) => {
            try {
                const { mutation } = message.payload;
                this.engine.mutate(mutation);
            }
            catch (err) {
                console.error('Erreur lors de l’application de la mutation WebGL :', err);
            }
        });
        // Écoute des changements d'état
        this.messageBus.on(messaging_1.MessageType.ORGANISM_STATE_CHANGE, (message) => {
            try {
                const { state } = message.payload;
                this.engine.render(state);
            }
            catch (err) {
                console.error('Erreur lors du rendu WebGL :', err);
            }
        });
        // Notification de performance
        setInterval(() => {
            try {
                const metrics = this.engine.getPerformanceMetrics();
                this.messageBus.send({
                    type: messaging_1.MessageType.PERFORMANCE_UPDATE,
                    payload: metrics
                });
            }
            catch (err) {
                // On ignore les erreurs de métriques pour ne pas polluer la console
            }
        }, 1000);
    }
}
exports.WebGLMessageAdapter = WebGLMessageAdapter;
