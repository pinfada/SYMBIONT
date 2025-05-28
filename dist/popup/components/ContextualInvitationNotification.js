"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContextualInvitationNotification = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const useMessaging_1 = require("../hooks/useMessaging");
const MessageBus_1 = require("../../shared/messaging/MessageBus");
const ContextualInvitationNotification = () => {
    const messaging = (0, useMessaging_1.useMessaging)();
    const [visible, setVisible] = (0, react_1.useState)(false);
    const [context, setContext] = (0, react_1.useState)('');
    const [code, setCode] = (0, react_1.useState)('');
    (0, react_1.useEffect)(() => {
        messaging.subscribe(MessageBus_1.MessageType.CONTEXTUAL_INVITATION, (msg) => {
            setCode(msg.payload.invitation.code);
            setContext(msg.payload.context);
            setVisible(true);
            setTimeout(() => setVisible(false), 10000);
        });
        // eslint-disable-next-line
    }, []);
    if (!visible)
        return null;
    let contextText = '';
    let specialStyle = {};
    let specialIcon = null;
    if (context === 'mutation_cognitive')
        contextText = 'Une mutation cognitive rare a eu lieu !';
    else if (context === 'curiosity_threshold')
        contextText = 'Votre curiosité a atteint un seuil exceptionnel !';
    else if (context === 'long_inactivity')
        contextText = 'Après une longue inactivité, une invitation spéciale est apparue…';
    else if (context.startsWith('collective_threshold_')) {
        const seuil = context.split('_').pop();
        contextText = `Un seuil collectif a été franchi ! ${seuil} transmissions atteintes dans le réseau.`;
        specialStyle = {
            background: 'radial-gradient(circle, #00e0ff 60%, #ffb700 100%)',
            boxShadow: '0 0 32px 8px #00e0ff88, 0 0 0 8px #ffb70044',
            border: '3px solid #ffb700',
            color: '#232946',
            animation: 'haloPulse 2s cubic-bezier(.4,0,.2,1) infinite',
        };
        specialIcon = (0, jsx_runtime_1.jsx)("span", { style: { fontSize: 32, marginRight: 10 }, children: "\uD83C\uDF0A" });
    }
    else
        contextText = 'Un événement rare a généré une invitation !';
    return ((0, jsx_runtime_1.jsxs)("div", { className: "contextual-invitation-notification", style: { zIndex: 1000, position: 'fixed', left: 0, right: 0, top: 32, display: 'flex', justifyContent: 'center', pointerEvents: 'none' }, children: [(0, jsx_runtime_1.jsxs)("div", { className: "murmur-notification", style: { fontWeight: 600, fontSize: 18, maxWidth: 480, ...specialStyle, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 18, borderRadius: 16, boxShadow: specialStyle.boxShadow || '0 2px 12px #00e0ff44' }, children: [specialIcon, contextText] }), (0, jsx_runtime_1.jsxs)("div", { style: { marginTop: 10, fontSize: 16, marginLeft: 18, alignSelf: 'center' }, children: [(0, jsx_runtime_1.jsx)("span", { children: "Invitation\u202F: " }), (0, jsx_runtime_1.jsx)("span", { className: "code-badge", style: { fontSize: 22 }, children: code })] })] }));
};
exports.ContextualInvitationNotification = ContextualInvitationNotification;
