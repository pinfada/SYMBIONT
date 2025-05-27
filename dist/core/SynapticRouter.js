"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SynapticRouter = void 0;
class SynapticRouter {
    constructor() {
        this.connections = new Map();
        this.isConnected = false;
    }
    /**
     * Établit les connexions du routeur
     * @returns {Promise<void>}
     */
    async connect() {
        if (this.isConnected)
            return;
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            this.handleMessage(message).then(sendResponse);
            return true;
        });
        this.isConnected = true;
    }
    /**
     * Déconnecte le routeur
     * @returns {Promise<void>}
     */
    async disconnect() {
        this.connections.clear();
        this.isConnected = false;
    }
    /**
     * Enregistre un gestionnaire de messages
     * @param {string} route - Identifiant de la route
     * @param {MessageHandler} handler - Fonction de traitement
     */
    registerHandler(route, handler) {
        this.connections.set(route, handler);
    }
    /**
     * Gère un message entrant
     * @param {any} message - Message à traiter
     * @returns {Promise<void>}
     */
    async handleMessage(message) {
        const handler = this.connections.get(message.route);
        if (handler) {
            await handler(message.payload);
        }
    }
}
exports.SynapticRouter = SynapticRouter;
