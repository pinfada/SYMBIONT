import { MessageType, Message } from '../../shared/messaging/MessageBus';
export declare const useMessaging: () => {
    subscribe: (type: MessageType, handler: (message: Message) => void) => void;
    unsubscribe: (type: MessageType, handler: (message: Message) => void) => void;
    send: (type: MessageType, payload: any) => void;
};
