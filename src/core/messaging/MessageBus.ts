import type { Message, MessageType } from '../../types';

type MessageHandler<T extends Message = Message> = (message: T) => void | Promise<void>;
type MessageFilter = (message: Message) => boolean;

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
      await this.processQueue();
      this.processing = false;
    }
  }

  private async processQueue(): Promise<void> {
    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift()!;
      await this.processMessage(message);
    }
  }

  private async processMessage(message: Message): Promise<void> {
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
        for (const tab of tabs) {
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
}

export default MessageBus;