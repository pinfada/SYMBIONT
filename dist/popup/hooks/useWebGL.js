"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useWebGL = void 0;
// src/popup/hooks/useWebGL.ts
const react_1 = require("react");
const useMessaging_1 = require("./useMessaging");
const MessageBus_1 = require("@shared/messaging/MessageBus");
const useWebGL = () => {
    const messaging = (0, useMessaging_1.useMessaging)();
    const [state, setState] = (0, react_1.useState)({
        initialized: false,
        error: null,
        metrics: null
    });
    (0, react_1.useEffect)(() => {
        // Abonnement aux messages
        const handleInitialized = () => {
            setState((prev) => ({ ...prev, initialized: true, error: null }));
        };
        const handleError = (msg) => {
            setState((prev) => ({ ...prev, error: msg.payload.error }));
        };
        const handlePerformance = (msg) => {
            setState((prev) => ({ ...prev, metrics: msg.payload }));
        };
        messaging.subscribe(MessageBus_1.MessageType.WEBGL_INITIALIZED, handleInitialized);
        messaging.subscribe(MessageBus_1.MessageType.WEBGL_ERROR, handleError);
        messaging.subscribe(MessageBus_1.MessageType.PERFORMANCE_UPDATE, handlePerformance);
        return () => {
            messaging.unsubscribe(MessageBus_1.MessageType.WEBGL_INITIALIZED, handleInitialized);
            messaging.unsubscribe(MessageBus_1.MessageType.WEBGL_ERROR, handleError);
            messaging.unsubscribe(MessageBus_1.MessageType.PERFORMANCE_UPDATE, handlePerformance);
        };
    }, [messaging]);
    return state;
};
exports.useWebGL = useWebGL;
