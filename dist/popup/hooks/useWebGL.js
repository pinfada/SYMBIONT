"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useWebGL = void 0;
// src/popup/hooks/useWebGL.ts
const react_1 = require("react");
const useMessaging_1 = require("./useMessaging");
const MessageBus_1 = require("@shared/messaging/MessageBus");
const useWebGL = () => {
    const { messageBus } = (0, useMessaging_1.useMessaging)();
    const [state, setState] = (0, react_1.useState)({
        initialized: false,
        error: null,
        metrics: null
    });
    (0, react_1.useEffect)(() => {
        const unsubscribers = [
            messageBus.on(MessageBus_1.MessageType.WEBGL_INITIALIZED, () => {
                setState(prev => ({ ...prev, initialized: true, error: null }));
            }),
            messageBus.on(MessageBus_1.MessageType.WEBGL_ERROR, (msg) => {
                setState(prev => ({ ...prev, error: msg.payload.error }));
            }),
            messageBus.on(MessageBus_1.MessageType.PERFORMANCE_UPDATE, (msg) => {
                setState(prev => ({ ...prev, metrics: msg.payload }));
            })
        ];
        return () => {
            unsubscribers.forEach(unsub => unsub());
        };
    }, [messageBus]);
    return state;
};
exports.useWebGL = useWebGL;
