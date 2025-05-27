import type { Message } from '../../types';
type MessageHandler<T extends Message = Message> = (message: T) => void | Promise<void>;
type MessageFilter = (message: Message) => boolean;
export declare class MessageBus {
    private readonly source;
    private handlers;
    private globalHandlers;
    private filters;
    private messageQueue;
    private processing;
    constructor(source: 'background' | 'content' | 'popup');
    private setupListeners;
    private shouldProcessMessage;
    private enqueueMessage;
    private processQueue;
    private processMessage;
    on<T extends Message>(type: T['type'], handler: MessageHandler<T>): void;
    off<T extends Message>(type: T['type'], handler: MessageHandler<T>): void;
    onAny(handler: MessageHandler): void;
    offAny(handler: MessageHandler): void;
    addFilter(filter: MessageFilter): void;
    send(message: Omit<Message, 'source' | 'timestamp' | 'id'>): Promise<void>;
}
export default MessageBus;
