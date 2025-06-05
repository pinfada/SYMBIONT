import { Message, MessageType } from '../../shared/messaging/MessageBus';
import { OrganismState, OrganismMutation } from '../../shared/types/organism';
import { InvitationPayload, InvitationResult } from '../../shared/types/invitation';
import { Murmur } from '../../shared/types/murmur';
import { generateUUID } from '../../shared/utils/uuid';
import { sanitizeMessage } from '../../shared/utils/serialization';

type MessageHandler<T extends Message = Message> = (message: T) => void | Promise<void>;
type MessageFilter = (message: Message) => boolean;

function isOrganismState(obj: any): obj is OrganismState {
  return obj &&
    typeof obj.id === 'string' &&
    typeof obj.generation === 'number' &&
    typeof obj.health === 'number' &&
    typeof obj.energy === 'number' &&
    obj.traits && typeof obj.traits === 'object';
}

function isOrganismMutation(obj: any): obj is OrganismMutation {
  return obj && typeof obj.type === 'string' && typeof obj.trigger === 'string';
}

function isBehaviorData(obj: any): boolean {
  return obj && typeof obj.url === 'string' && typeof obj.visitCount === 'number';
}

function isMurmur(obj: any): obj is Murmur {
  return obj && typeof obj.text === 'string' && typeof obj.timestamp === 'number';
}

function isInvitationPayload(obj: any): obj is InvitationPayload {
  return obj && typeof obj.code === 'string';
}

function isInvitationResult(obj: any): obj is InvitationResult {
  return obj && typeof obj.code === 'string' && typeof obj.status === 'string';
}

function validatePayload(type: MessageType, payload: any): boolean {
  switch (type) {
    case MessageType.ORGANISM_UPDATE:
      return isOrganismState(payload);
    case MessageType.ORGANISM_MUTATE:
      return isOrganismMutation(payload);
    case MessageType.PAGE_VISIT:
    case MessageType.SCROLL_EVENT:
      return isBehaviorData(payload);
    case MessageType.MURMUR:
      return isMurmur(payload);
    case MessageType.GENERATE_INVITATION:
    case MessageType.CONSUME_INVITATION:
    case MessageType.CHECK_INVITATION:
      return isInvitationPayload(payload);
    case MessageType.INVITATION_GENERATED:
      return typeof payload === 'string' || isInvitationResult(payload);
    case MessageType.INVITATION_CONSUMED:
    case MessageType.INVITATION_CHECKED:
      return isInvitationResult(payload);
    case MessageType.SHARED_MUTATION_RESULT:
      // Accepte un string (chiffré) ou un objet (résultat de mutation)
      return typeof payload === 'string' || (payload && typeof payload === 'object');
    // Ajouter d'autres cas selon les besoins
    default:
      return true; // Par défaut, on accepte (à affiner selon les besoins)
  }
}

// Fonction pour nettoyer les messages avant sérialisation
function serializeMessage(message: any): any {
  try {
    // Test de sérialisation avec JSON.parse/stringify
    return JSON.parse(JSON.stringify(message));
  } catch (error) {
    console.warn('Message serialization issue, cleaning object:', error);
    
    // Nettoyage manuel pour les cas problématiques
    const cleanMessage = cleanObjectForSerialization(message);
    return cleanMessage;
  }
}

function cleanObjectForSerialization(obj: any, seen = new WeakSet()): any {
  if (obj === null || obj === undefined) {
    return obj;
  }
  
  if (typeof obj === 'function') {
    return '[Function]'; // Remplace les fonctions par une string
  }
  
  if (obj instanceof Date) {
    return obj.toISOString(); // Convertit les dates en ISO string
  }
  
  if (obj instanceof Error) {
    return {
      name: obj.name,
      message: obj.message,
      stack: obj.stack
    };
  }

  // Objets WebGL, DOM, React non-sérialisables
  if (obj instanceof WebGLRenderingContext || 
      obj instanceof WebGL2RenderingContext ||
      obj instanceof HTMLElement ||
      obj instanceof HTMLCanvasElement ||
      obj instanceof CanvasRenderingContext2D ||
      obj instanceof WebGLProgram ||
      obj instanceof WebGLBuffer ||
      obj instanceof WebGLTexture ||
      (obj && obj.$$typeof) || // React elements
      (obj && obj.__reactFiber) || // React fiber
      (obj && obj._owner) || // React internal
      (obj && typeof obj === 'object' && obj.constructor && obj.constructor.name && obj.constructor.name.includes('Fiber')) // React Fiber variants
  ) {
    return '[Non-serializable Object]';
  }
  
  if (typeof obj !== 'object') {
    return obj; // Primitives sont OK
  }
  
  // Vérification des références circulaires AVANT la récursion
  if (seen.has(obj)) {
    return '[Circular Reference]';
  }
  seen.add(obj);
  
  if (Array.isArray(obj)) {
    return obj.map(item => cleanObjectForSerialization(item, seen));
  }
  
  // Pour les objets, on nettoie récursivement
  const cleaned: any = {};
  
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      try {
        cleaned[key] = cleanObjectForSerialization(obj[key], seen);
      } catch (error) {
        // Supprime les logs verbeux pour éviter le spam
        cleaned[key] = '[Non-serializable]';
      }
    }
  }
  
  return cleaned;
}

export class MessageBus {
  private handlers: Map<MessageType, Set<MessageHandler>> = new Map();
  private globalHandlers: Set<MessageHandler> = new Set();
  private filters: MessageFilter[] = [];
  private messageQueue: Message[] = [];
  private processing = false;

  constructor(private readonly source: 'background' | 'content' | 'popup') {
    this.setupListeners();
  }

  private setupListeners(): void {
    // @ts-expect-error Paramètre réservé pour usage futur
    chrome.runtime.onMessage.addListener((message: Message, sender, sendResponse) => {
      if (this.shouldProcessMessage(message)) {
        this.enqueueMessage(message);
        sendResponse({ received: true });
      }
      return false;
    });
  }

  private shouldProcessMessage(message: Message): boolean {
    return this.filters.every(filter => filter(message));
  }

  private async enqueueMessage(message: Message): Promise<void> {
    this.messageQueue.push(message);
    if (!this.processing) {
      this.processing = true;
      try {
        await this.processQueue();
      } finally {
        this.processing = false;
      }
    }
  }

  private async processQueue(): Promise<void> {
    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift()!;
      await this.processMessage(message);
    }
  }

  private async processMessage(message: Message): Promise<void> {
    // --- Validation stricte du payload ---
    if (!validatePayload(message.type, message.payload)) {
      console.warn(`[MessageBus] Payload non valide pour le type ${message.type}`, message.payload);
      return;
    }

    // Global handlers
    for (const handler of this.globalHandlers) {
      try {
        await handler(message);
      } catch (error) {
        console.error(`Error in global handler:`, error);
      }
    }

    // Type-specific handlers
    const handlers = this.handlers.get(message.type);
    if (handlers) {
      for (const handler of handlers) {
        try {
          await handler(message);
        } catch (error) {
          console.error(`Error in handler for ${message.type}:`, error);
        }
      }
    }
  }

  public on<T extends Message>(type: T['type'], handler: MessageHandler<T>): void {
    if (!this.handlers.has(type)) {
      this.handlers.set(type, new Set());
    }
    this.handlers.get(type)!.add(handler as MessageHandler);
  }

  public off<T extends Message>(type: T['type'], handler: MessageHandler<T>): void {
    const handlers = this.handlers.get(type);
    if (handlers) {
      handlers.delete(handler as MessageHandler);
    }
  }

  public onAny(handler: MessageHandler): void {
    this.globalHandlers.add(handler);
  }

  public offAny(handler: MessageHandler): void {
    this.globalHandlers.delete(handler);
  }

  public addFilter(filter: MessageFilter): void {
    this.filters.push(filter);
  }

  public async send(message: Omit<Message, 'source' | 'timestamp' | 'id'>): Promise<void> {
    const fullMessage: Message = {
      ...message,
      source: this.source,
      timestamp: Date.now(),
      id: generateUUID(),
    } as Message;

    try {
      // Sanitize le message d'abord pour éviter les objets problématiques
      const sanitizedMessage = sanitizeMessage(fullMessage);
      // Nettoyer le message avant envoi pour éviter les erreurs de sérialisation
      const cleanMessage = serializeMessage(sanitizedMessage);
      
      if (this.source === 'content') {
        await chrome.runtime.sendMessage(cleanMessage);
      } else {
        // Send to all tabs for content scripts
        const tabs = await chrome.tabs.query({});
        // Routage intelligent : on ne cible que les tabs actifs ou pertinents
        const isRelevantTab = (tab: any) => tab.active || (tab.url && tab.url.includes('symbiont'));
        const activeTabs = tabs.filter(isRelevantTab);
        for (const tab of activeTabs) {
          if (tab.id) {
            chrome.tabs.sendMessage(tab.id, cleanMessage).catch(() => {
              // Ignore errors for inactive tabs
            });
          }
        }
        // Also send to runtime for popup/background
        chrome.runtime.sendMessage(cleanMessage).catch(() => {});
      }
    } catch (error) {
      console.error('Error sending message:', error);
    }
  }

  // Ajout pour compatibilité content script
  public sendToBackground(message: any): void {
    this.send(message);
  }

  public emit(type: any, payload: any): void {
    // Appel direct des handlers si besoin (mock minimal)
    const handlers = this.handlers.get(type as MessageType);
    if (handlers) {
      handlers.forEach(handler => handler({ type, payload }));
    }
  }

  // @ts-expect-error Variables réservées pour usage futur
  private handleMessage(message: any, targetFrame: string): void {
    // Handle cross-frame messages
    console.log('Handling message:', message);
  }

  // @ts-expect-error Paramètre réservé pour usage futur
  private onMessage(message: any, sender: chrome.runtime.MessageSender, sendResponse: (response?: any) => void): boolean {
    // Handle incoming message
    console.log('Received message:', message);
    return true;
  }

  // @ts-expect-error Variables réservées pour usage futur
  private sendToFrame(handleMessage: (msg: any) => any, targetFrame: MessageTarget, payload: any): void {
    // Send message to frame
    console.log('Sending to frame:', targetFrame, payload);
  }
}

export default MessageBus;
export { validatePayload };