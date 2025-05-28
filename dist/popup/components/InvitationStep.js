"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InvitationStep = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const InvitationStep = ({ onActivated }) => {
    const [code, setCode] = (0, react_1.useState)('');
    const [error, setError] = (0, react_1.useState)(null);
    const [loading, setLoading] = (0, react_1.useState)(false);
    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        // Simulation de validation (à remplacer par appel réel au service d'invitation)
        setTimeout(() => {
            if (code.trim().length >= 6) {
                onActivated();
            }
            else {
                setError('Code d’invitation invalide.');
            }
            setLoading(false);
        }, 800);
    };
    return ((0, jsx_runtime_1.jsxs)("section", { className: "onboarding-step", children: [(0, jsx_runtime_1.jsx)("h3", { children: "Rituel d\u2019invitation" }), (0, jsx_runtime_1.jsxs)("form", { onSubmit: handleSubmit, children: [(0, jsx_runtime_1.jsx)("label", { htmlFor: "invitation-code", children: "Code d\u2019invitation" }), (0, jsx_runtime_1.jsx)("input", { id: "invitation-code", type: "text", value: code, onChange: e => setCode(e.target.value), placeholder: "Entrez votre code...", disabled: loading }), (0, jsx_runtime_1.jsx)("button", { type: "submit", disabled: loading || !code.trim(), children: loading ? 'Vérification...' : 'Activer' }), error && (0, jsx_runtime_1.jsx)("div", { className: "error-message", children: error })] })] }));
};
exports.InvitationStep = InvitationStep;
