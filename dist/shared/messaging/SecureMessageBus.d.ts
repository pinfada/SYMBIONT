import { Message } from './MessageBus';
/**
 * MessageBus sécurisé avec validation, chiffrement et protection anti-replay
 */
interface SecureMessage extends Message {
    signature?: string;
    nonce?: string;
    timestamp: number;
    version: string;
}
export declare class SecureMessageBus {
    private static readonly MESSAGE_SCHEMAS;
    private static readonly MAX_MESSAGE_AGE;
    private static readonly REPLAY_PROTECTION_WINDOW;
    private static processedMessages;
    /**
     * Valide un message selon son schéma de sécurité
     */
    static validateMessage(message: Message): boolean;
    /**
     * Signe un message avec un nonce pour prévenir les attaques par rejeu
     */
    static signMessage(message: Message): SecureMessage;
    /**
     * Vérifie qu'un message n'est pas un replay et est récent
     */
    static verifyMessageIntegrity(message: SecureMessage): boolean;
    /**
     * Envoie un message de façon sécurisée
     */
    static sendSecureMessage(message: Message, sender: chrome.runtime.MessageSender, sendResponse: (response?: any) => void): Promise<void>;
    /**
     * Traite un message validé
     */
    private static processMessage;
    /**
     * Initialise les listeners sécurisés pour Chrome extension
     */
    static initializeSecureListeners(): void;
}
export {};
//# sourceMappingURL=SecureMessageBus.d.ts.map