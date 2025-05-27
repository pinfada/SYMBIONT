type MessageHandler = (message: any) => Promise<void>;
export declare class SynapticRouter {
    private connections;
    private isConnected;
    constructor();
    /**
     * Établit les connexions du routeur
     * @returns {Promise<void>}
     */
    connect(): Promise<void>;
    /**
     * Déconnecte le routeur
     * @returns {Promise<void>}
     */
    disconnect(): Promise<void>;
    /**
     * Enregistre un gestionnaire de messages
     * @param {string} route - Identifiant de la route
     * @param {MessageHandler} handler - Fonction de traitement
     */
    registerHandler(route: string, handler: MessageHandler): void;
    /**
     * Gère un message entrant
     * @param {any} message - Message à traiter
     * @returns {Promise<void>}
     */
    private handleMessage;
}
export {};
