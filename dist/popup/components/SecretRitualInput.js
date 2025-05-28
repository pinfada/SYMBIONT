"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SecretRitualInput = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const ritualsApi_1 = require("../../shared/ritualsApi");
const PluginManager_1 = require("../../core/PluginManager");
const SecretRitualInput = () => {
    const [code, setCode] = (0, react_1.useState)('');
    const [feedback, setFeedback] = (0, react_1.useState)(null);
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (code.trim().length >= 4) {
            // Vérifier le code secret côté backend
            const rituals = await (0, ritualsApi_1.getRituals)();
            const found = rituals.find(r => r._id === code && r.type === 'secret');
            if (found) {
                setFeedback('Code secret valide ! Un murmure rare se manifeste.');
            }
            else {
                setFeedback('Code inconnu ou expiré.');
            }
            setTimeout(() => setFeedback(null), 8000);
            setCode('');
        }
    };
    return ((0, jsx_runtime_1.jsxs)("div", { className: "secret-ritual-input", children: [(0, jsx_runtime_1.jsxs)("form", { onSubmit: handleSubmit, style: { display: 'flex', gap: 8, alignItems: 'center', marginTop: 16 }, children: [(0, jsx_runtime_1.jsx)("label", { htmlFor: "secret-code-input", children: "Code secret" }), (0, jsx_runtime_1.jsx)("input", { id: "secret-code-input", type: "text", value: code, onChange: e => setCode(e.target.value.toUpperCase()), placeholder: "Code secret\u2026", style: { padding: 8, borderRadius: 6, border: '1px solid #333', fontSize: 16, letterSpacing: 2, outline: '2px solid #00e0ff' }, "aria-label": "Code secret" }), (0, jsx_runtime_1.jsx)("button", { type: "submit", style: { padding: '8px 16px', borderRadius: 6, background: '#00e0ff', color: '#181c22', fontWeight: 700, border: 'none', cursor: 'pointer' }, "aria-label": "Tenter le code secret", children: "Tenter" })] }), feedback && (0, jsx_runtime_1.jsx)("div", { className: "murmur-notification", style: { marginTop: 8 }, role: "status", "aria-live": "polite", children: feedback })] }));
};
exports.SecretRitualInput = SecretRitualInput;
const SecretRitualInputPlugin = {
    id: 'secret-ritual',
    type: 'ritual',
    name: 'Rituel secret',
    description: 'Déclenche un effet spécial via un code secret.',
    component: exports.SecretRitualInput
};
PluginManager_1.PluginManager.register(SecretRitualInputPlugin);
exports.default = SecretRitualInputPlugin;
