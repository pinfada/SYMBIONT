"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MurmureNotification = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const useMessaging_1 = require("../hooks/useMessaging");
const MessageBus_1 = require("@shared/messaging/MessageBus");
const MurmureNotification = () => {
    const messaging = (0, useMessaging_1.useMessaging)();
    const [murmur, setMurmur] = (0, react_1.useState)(null);
    const [visible, setVisible] = (0, react_1.useState)(false);
    (0, react_1.useEffect)(() => {
        const handler = (msg) => {
            setMurmur(msg.payload.text);
            setVisible(true);
            setTimeout(() => setVisible(false), 6000);
        };
        messaging.subscribe(MessageBus_1.MessageType.MURMUR, handler);
        // Pas de désabonnement explicite (hook gère le cycle de vie)
    }, [messaging]);
    if (!visible || !murmur)
        return null;
    return ((0, jsx_runtime_1.jsxs)("div", { style: {
            position: 'fixed',
            bottom: 32,
            right: 32,
            background: 'rgba(0,0,0,0.92)',
            color: '#00e0ff',
            padding: '18px 32px',
            borderRadius: 12,
            fontSize: 18,
            fontWeight: 600,
            boxShadow: '0 2px 16px #000a',
            zIndex: 9999,
            maxWidth: 400
        }, children: [(0, jsx_runtime_1.jsx)("span", { style: { marginRight: 12, fontSize: 22 }, children: "\uD83D\uDCAD" }), murmur] }));
};
exports.MurmureNotification = MurmureNotification;
