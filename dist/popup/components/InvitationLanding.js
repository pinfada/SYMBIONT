"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InvitationLanding = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const useMessaging_1 = require("../hooks/useMessaging");
const MessageBus_1 = require("@shared/messaging/MessageBus");
const InvitationLanding = ({ onActivated }) => {
    const messaging = (0, useMessaging_1.useMessaging)();
    const [code, setCode] = (0, react_1.useState)('');
    const [status, setStatus] = (0, react_1.useState)('idle');
    const [symbolicLink, setSymbolicLink] = (0, react_1.useState)(null);
    const [error, setError] = (0, react_1.useState)(null);
    const handleCheck = () => {
        setStatus('checking');
        setError(null);
        messaging.send(MessageBus_1.MessageType.CHECK_INVITATION, { code });
        // Attendre la réponse du background
        messaging.subscribe(MessageBus_1.MessageType.INVITATION_CHECKED, (msg) => {
            if (msg.payload.valid) {
                // Consommer l'invitation
                const receiverId = crypto.randomUUID();
                messaging.send(MessageBus_1.MessageType.CONSUME_INVITATION, { code, receiverId });
                // Attendre la confirmation
                messaging.subscribe(MessageBus_1.MessageType.INVITATION_CONSUMED, (msg2) => {
                    if (msg2.payload && msg2.payload.symbolicLink) {
                        setSymbolicLink(msg2.payload.symbolicLink);
                        setStatus('success');
                        if (onActivated)
                            onActivated();
                    }
                    else {
                        setError("Erreur lors de la consommation de l'invitation.");
                        setStatus('error');
                    }
                });
            }
            else {
                setError('Code invalide ou déjà utilisé.');
                setStatus('error');
            }
        });
    };
    return ((0, jsx_runtime_1.jsxs)("div", { style: { maxWidth: 400, margin: '40px auto', padding: 32, background: '#181c22', borderRadius: 12, boxShadow: '0 2px 12px #0008', color: '#fff' }, children: [(0, jsx_runtime_1.jsx)("h2", { style: { color: '#00e0ff', marginBottom: 16 }, children: "Activation par invitation" }), (0, jsx_runtime_1.jsx)("p", { children: "Entrez votre code d'invitation pour activer votre organisme SYMBIONT." }), (0, jsx_runtime_1.jsx)("input", { type: "text", value: code, onChange: e => setCode(e.target.value.toUpperCase()), placeholder: "Code d'invitation", style: { width: '100%', padding: 12, borderRadius: 6, border: '1px solid #333', margin: '16px 0', fontSize: 18, textAlign: 'center', letterSpacing: 2 }, disabled: status === 'checking' || status === 'success' }), (0, jsx_runtime_1.jsx)("button", { onClick: handleCheck, disabled: !code || status === 'checking' || status === 'success', style: { width: '100%', padding: 12, borderRadius: 6, background: '#00e0ff', color: '#111', fontWeight: 700, fontSize: 18, border: 'none', cursor: 'pointer' }, children: "Valider" }), status === 'checking' && (0, jsx_runtime_1.jsx)("p", { style: { color: '#00e0ff', marginTop: 16 }, children: "V\u00E9rification en cours..." }), status === 'success' && symbolicLink && ((0, jsx_runtime_1.jsxs)("div", { style: { marginTop: 24, padding: 16, background: symbolicLink, borderRadius: 8, color: '#111', fontWeight: 700 }, children: ["Invitation accept\u00E9e !", (0, jsx_runtime_1.jsx)("br", {}), (0, jsx_runtime_1.jsxs)("span", { style: { fontSize: 24 }, children: ["Lien symbolique : ", symbolicLink] })] })), status === 'error' && error && (0, jsx_runtime_1.jsx)("p", { style: { color: '#ff4b6e', marginTop: 16 }, children: error })] }));
};
exports.InvitationLanding = InvitationLanding;
