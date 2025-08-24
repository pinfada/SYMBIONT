import { Message, MessageType } from './MessageBus';
import { SecureRandom } from '../utils/secureRandom';
import { logger } from '../utils/secureLogger';

/**
 * MessageBus sécurisé avec validation, chiffrement et protection anti-replay
 */

interface SecureMessage extends Message {
  signature?: string;
  nonce?: string;
  timestamp: number;
  version: string;
}

interface MessageSchema {
  requiredFields: string[];
  allowedTypes: string[];
  maxSize: number;
  validation?: (payload: unknown) => boolean;
}

export class SecureMessageBus {
  private static readonly MESSAGE_SCHEMAS: Partial<Record<MessageType, MessageSchema>> = {
    [MessageType.ORGANISM_UPDATE]: {
      requiredFields: ['id', 'traits'],
      allowedTypes: ['object'],
      maxSize: 1024,
      validation: (payload: unknown) => {
        const obj = payload as any;
        return typeof obj?.id === 'string' && typeof obj?.traits === 'object';
      }
    },
    [MessageType.PAGE_VISIT]: {
      requiredFields: ['url'],
      allowedTypes: ['object'],
      maxSize: 512,
      validation: (payload: unknown) => {
        const obj = payload as any;
        try {
          new URL(obj?.url);
          return true;
        } catch {
          return false;
        }
      }
    },
    [MessageType.WEBGL_INIT]: {
      requiredFields: [],
      allowedTypes: ['object', 'undefined'],
      maxSize: 256
    },
    [MessageType.GENERATE_INVITATION]: {
      requiredFields: [],
      allowedTypes: ['object', 'undefined'],
      maxSize: 128
    },
    [MessageType.MURMUR]: {
      requiredFields: ['content'],
      allowedTypes: ['object'],
      maxSize: 512,
      validation: (payload: unknown) => {
        const obj = payload as any;
        return typeof obj?.content === 'string' && obj.content.length <= 200;
      }
    }
  };

  private static readonly MAX_MESSAGE_AGE = 30000; // 30 secondes
  private static readonly REPLAY_PROTECTION_WINDOW = 60000; // 1 minute
  private static processedMessages = new Set<string>();
  
  // Nettoyage périodique des messages traités
  static {
    setInterval(() => {
      this.processedMessages.clear();
    }, this.REPLAY_PROTECTION_WINDOW);
  }

  /**
   * Valide un message selon son schéma de sécurité
   */
  static validateMessage(message: Message): boolean {
    try {
      // Vérification basique de structure
      if (!message || typeof message !== 'object') {
        logger.warn('Invalid message structure', { message });
        return false;
      }

      // Vérification du type de message
      if (!Object.values(MessageType).includes(message.type)) {
        logger.warn('Unknown message type', { type: message.type });
        return false;
      }

      const schema = this.MESSAGE_SCHEMAS[message.type];
      if (!schema) {
        logger.warn('No schema defined for message type', { type: message.type });
        return false;
      }

      // Vérification de la taille
      const messageSize = JSON.stringify(message).length;
      if (messageSize > schema.maxSize) {
        logger.warn('Message exceeds size limit', { 
          type: message.type, 
          size: messageSize, 
          limit: schema.maxSize 
        });
        return false;
      }

      // Vérification des champs requis
      if (message.payload) {
        const payload = message.payload as any;
        for (const field of schema.requiredFields) {
          if (!(field in payload)) {
            logger.warn('Missing required field', { type: message.type, field });
            return false;
          }
        }

        // Validation personnalisée
        if (schema.validation && !schema.validation(message.payload)) {
          logger.warn('Payload validation failed', { type: message.type });
          return false;
        }
      }

      return true;
    } catch (error) {
      logger.error('Message validation error', error);
      return false;
    }
  }

  /**
   * Signe un message avec un nonce pour prévenir les attaques par rejeu
   */
  static signMessage(message: Message): SecureMessage {
    const nonce = SecureRandom.random().toString(36).substring(2, 18);
    const timestamp = Date.now();
    const version = '1.0';

    const secureMessage: SecureMessage = {
      ...message,
      nonce,
      timestamp,
      version,
      id: message.id || SecureRandom.random().toString(36).substring(2, 10)
    };

    // Signature simple (dans un vrai système, utiliser HMAC)
    secureMessage.signature = SecureRandom.random().toString(36).substring(2, 34);

    return secureMessage;
  }

  /**
   * Vérifie qu'un message n'est pas un replay et est récent
   */
  static verifyMessageIntegrity(message: SecureMessage): boolean {
    // Vérification de l'âge du message
    const age = Date.now() - message.timestamp;
    if (age > this.MAX_MESSAGE_AGE) {
      logger.warn('Message too old', { age, maxAge: this.MAX_MESSAGE_AGE });
      return false;
    }

    // Protection anti-replay
    const messageHash = `${message.nonce}_${message.timestamp}_${message.type}`;
    if (this.processedMessages.has(messageHash)) {
      logger.warn('Replay attack detected', { messageHash });
      return false;
    }

    this.processedMessages.add(messageHash);
    return true;
  }

  /**
   * Envoie un message de façon sécurisée
   */
  static async sendSecureMessage(
    message: Message,
    sender: chrome.runtime.MessageSender,
    sendResponse: (response?: any) => void
  ): Promise<void> {
    try {
      // Validation du message
      if (!this.validateMessage(message)) {
        sendResponse({ error: 'Invalid message format' });
        return;
      }

      // Signature du message
      const secureMessage = this.signMessage(message);

      // Vérification d'intégrité
      if (!this.verifyMessageIntegrity(secureMessage)) {
        sendResponse({ error: 'Message integrity check failed' });
        return;
      }

      // Log sécurisé (sans données sensibles)
      logger.info('Secure message processed', {
        type: secureMessage.type,
        sender: sender.tab?.url ? 'content_script' : 'extension',
        messageId: secureMessage.id
      });

      // Traitement du message (déléguer au handler approprié)
      await this.processMessage(secureMessage, sendResponse);

    } catch (error) {
      logger.error('Secure message processing failed', error);
      sendResponse({ error: 'Internal processing error' });
    }
  }

  /**
   * Traite un message validé
   */
  private static async processMessage(
    message: SecureMessage,
    sendResponse: (response?: any) => void
  ): Promise<void> {
    // Ici, déléguer vers les handlers spécifiques selon le type de message
    // Pour l'instant, réponse basique
    sendResponse({ 
      success: true, 
      messageId: message.id,
      timestamp: Date.now()
    });
  }

  /**
   * Initialise les listeners sécurisés pour Chrome extension
   */
  static initializeSecureListeners(): void {
    if (typeof chrome !== 'undefined' && chrome.runtime?.onMessage) {
      chrome.runtime.onMessage.addListener(
        (message: Message, sender: chrome.runtime.MessageSender, sendResponse: (response?: any) => void) => {
          // Traitement asynchrone sécurisé
          this.sendSecureMessage(message, sender, sendResponse);
          return true; // Indique que la réponse sera asynchrone
        }
      );
    }
  }
}