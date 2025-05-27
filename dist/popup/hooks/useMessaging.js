"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useMessaging = void 0;
// src/popup/hooks/useMessaging.ts
const react_1 = require("react");
const MessageBusContext_1 = require("../contexts/MessageBusContext");
const useMessaging = () => {
    const messageBus = (0, MessageBusContext_1.useMessageBus)();
    const handlersRef = (0, react_1.useRef)(new Map());
    const subscribe = (type, handler) => {
        messageBus.on(type, handler);
        handlersRef.current.set(type, handler);
    };
    const unsubscribe = (type, handler) => {
        messageBus.off(type, handler);
        handlersRef.current.delete(type);
    };
    const send = (type, payload) => {
        messageBus.send(type, payload);
    };
    // Cleanup all handlers on unmount
    (0, react_1.useEffect)(() => {
        return () => {
            handlersRef.current.forEach((handler, type) => {
                messageBus.off(type, handler);
            });
            handlersRef.current.clear();
        };
    }, [messageBus]);
    return {
        subscribe,
        unsubscribe,
        send
    };
};
exports.useMessaging = useMessaging;
