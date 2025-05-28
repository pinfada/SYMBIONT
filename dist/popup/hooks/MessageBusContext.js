"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useMessageBus = exports.MessageBusProvider = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const MessageBus_1 = require("../../core/messaging/MessageBus");
// Singleton du bus de messages pour le contexte popup
const messageBus = new MessageBus_1.MessageBus('popup');
const MessageBusContext = (0, react_1.createContext)(null);
const MessageBusProvider = ({ children }) => ((0, jsx_runtime_1.jsx)(MessageBusContext.Provider, { value: messageBus, children: children }));
exports.MessageBusProvider = MessageBusProvider;
const useMessageBus = () => {
    const context = (0, react_1.useContext)(MessageBusContext);
    if (!context) {
        throw new Error('useMessageBus doit être utilisé dans un MessageBusProvider');
    }
    return context;
};
exports.useMessageBus = useMessageBus;
