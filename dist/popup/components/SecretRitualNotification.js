"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SecretRitualNotification = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const useMessaging_1 = require("../hooks/useMessaging");
const MessageBus_1 = require("../../shared/messaging/MessageBus");
const SecretRitualNotification = () => {
    const messaging = (0, useMessaging_1.useMessaging)();
    const [visible, setVisible] = (0, react_1.useState)(false);
    const [effect, setEffect] = (0, react_1.useState)('');
    const [code, setCode] = (0, react_1.useState)('');
    (0, react_1.useEffect)(() => {
        messaging.subscribe(MessageBus_1.MessageType.SECRET_RITUAL_TRIGGERED, (msg) => {
            setCode(msg.payload.code);
            setEffect(msg.payload.effect);
            setVisible(true);
            setTimeout(() => setVisible(false), 10000);
        });
        // eslint-disable-next-line
    }, []);
    if (!visible)
        return null;
    let effectText = '';
    if (effect === 'mutation_unique')
        effectText = `Le code secret « ${code} » a déclenché une mutation unique !`;
    else
        effectText = `Un rituel secret a été accompli !`;
    return ((0, jsx_runtime_1.jsx)("div", { className: "secret-ritual-notification", children: (0, jsx_runtime_1.jsx)("div", { className: "murmur-notification", style: { fontWeight: 600, fontSize: 18, color: '#ff4b6e' }, children: effectText }) }));
};
exports.SecretRitualNotification = SecretRitualNotification;
