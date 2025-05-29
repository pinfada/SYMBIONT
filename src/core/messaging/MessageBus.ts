import { Message, MessageType } from '../../shared/messaging/MessageBus';
import { OrganismState, OrganismMutation } from '../../shared/types/organism';
import { InvitationPayload, InvitationResult } from '../../shared/types/invitation';
import { Murmur } from '../../shared/types/murmur';

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
      id: crypto.randomUUID(),
    } as Message;

    try {
      if (this.source === 'content') {
        await chrome.runtime.sendMessage(fullMessage);
      } else {
        // Send to all tabs for content scripts
        const tabs = await chrome.tabs.query({});
        // Routage intelligent : on ne cible que les tabs actifs ou pertinents
        const isRelevantTab = (tab: any) => tab.active || (tab.url && tab.url.includes('symbiont'));
        const activeTabs = tabs.filter(isRelevantTab);
        for (const tab of activeTabs) {
          if (tab.id) {
            chrome.tabs.sendMessage(tab.id, fullMessage).catch(() => {
              // Ignore errors for inactive tabs
            });
          }
        }
        // Also send to runtime for popup/background
        chrome.runtime.sendMessage(fullMessage).catch(() => {});
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
}

export default MessageBus;
export { validatePayload };