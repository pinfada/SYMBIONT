import { Message, MessageType } from '../../shared/messaging/MessageBus';
type MessageHandler<T extends Message = Message> = (message: T) => void | Promise<void>;
type MessageFilter = (message: Message) => boolean;
declare function validatePayload(type: MessageType, payload: any): boolean;
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
    sendToBackground(message: any): void;
    emit(type: any, payload: any): void;
}
export default MessageBus;
export { validatePayload };
//# sourceMappingURL=MessageBus.d.ts.map