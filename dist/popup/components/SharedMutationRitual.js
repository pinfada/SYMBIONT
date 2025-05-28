"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SharedMutationRitual = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const ritualsApi_1 = require("../../shared/ritualsApi");
const PluginManager_1 = require("../../core/PluginManager");
const SharedMutationRitual = ({ userId, traits }) => {
    const [step, setStep] = (0, react_1.useState)('init');
    const [code, setCode] = (0, react_1.useState)('');
    const [sharedCode, setSharedCode] = (0, react_1.useState)(null);
    const [result, setResult] = (0, react_1.useState)(null);
    const [error, setError] = (0, react_1.useState)(null);
    // Générer un code aléatoire pour la fusion
    function generateCode() {
        return Math.random().toString(36).substr(2, 6).toUpperCase();
    }
    // Initiateur : demande un code
    const handleInitiate = async () => {
        const fusionCode = generateCode();
        setSharedCode(fusionCode);
        setStep('waiting');
        try {
            await (0, ritualsApi_1.addRitual)({ _id: fusionCode, type: 'fusion', initiatorId: userId, traits, status: 'waiting' });
        }
        catch (e) {
            setError('Erreur lors de la création du rituel.');
            setStep('init');
        }
    };
    // Receveur : saisit le code et fusionne
    const handleAccept = async () => {
        setStep('waiting');
        try {
            const rituals = await (0, ritualsApi_1.getRituals)();
            const ritual = rituals.find(r => r._id === code && r.type === 'fusion');
            if (!ritual) {
                setError('Code de fusion invalide.');
                setStep('enter');
                return;
            }
            // Fusionner les traits (exemple simple)
            const mergedTraits = { ...ritual.traits };
            Object.keys(traits).forEach(k => {
                mergedTraits[k] = ((mergedTraits[k] || 0) + (traits[k] || 0)) / 2;
            });
            setResult({ initiatorId: ritual.initiatorId, receiverId: userId, mergedTraits, timestamp: Date.now() });
            setStep('result');
        }
        catch (e) {
            setError('Erreur lors de la validation du code.');
            setStep('enter');
        }
    };
    return ((0, jsx_runtime_1.jsxs)("div", { className: "shared-mutation-ritual", children: [step === 'init' && ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)("h3", { children: "Rituel de mutation partag\u00E9e" }), (0, jsx_runtime_1.jsx)("button", { onClick: handleInitiate, "aria-label": "Initier une fusion", children: "Initier une fusion" }), (0, jsx_runtime_1.jsx)("button", { onClick: () => setStep('enter'), "aria-label": "J'ai re\u00E7u un code", children: "J'ai re\u00E7u un code" })] })), step === 'waiting' && sharedCode && ((0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("p", { children: "Partagez ce code avec un autre utilisateur pour fusionner vos organismes\u202F:" }), (0, jsx_runtime_1.jsx)("div", { className: "code-badge", style: { fontSize: 24 }, children: sharedCode }), (0, jsx_runtime_1.jsx)("p", { children: "En attente de la fusion..." })] })), step === 'enter' && ((0, jsx_runtime_1.jsxs)("form", { onSubmit: e => { e.preventDefault(); handleAccept(); }, children: [(0, jsx_runtime_1.jsx)("label", { htmlFor: "shared-code", children: "Code de fusion" }), (0, jsx_runtime_1.jsx)("input", { id: "shared-code", value: code, onChange: e => setCode(e.target.value.toUpperCase()), style: { outline: '2px solid #00e0ff' }, "aria-label": "Code de fusion" }), (0, jsx_runtime_1.jsx)("button", { type: "submit", "aria-label": "Fusionner", children: "Fusionner" })] })), step === 'result' && result && ((0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("h4", { children: "Fusion r\u00E9ussie\u202F!" }), (0, jsx_runtime_1.jsx)("p", { children: "Traits fusionn\u00E9s\u202F:" }), (0, jsx_runtime_1.jsx)("ul", { children: Object.entries(result.mergedTraits).map(([k, v]) => ((0, jsx_runtime_1.jsxs)("li", { children: [(0, jsx_runtime_1.jsx)("b", { children: k }), "\u202F: ", v.toFixed(2)] }, k))) }), (0, jsx_runtime_1.jsx)("div", { className: "murmur-notification", role: "status", "aria-live": "polite", children: "Deux organismes se sont li\u00E9s. Une nouvelle harmonie \u00E9merge\u2026" })] })), step === 'result' && error && ((0, jsx_runtime_1.jsx)("div", { className: "error-message", role: "alert", children: error }))] }));
};
exports.SharedMutationRitual = SharedMutationRitual;
const SharedMutationRitualPlugin = {
    id: 'shared-mutation',
    type: 'ritual',
    name: 'Mutation partagée',
    description: 'Fusionner les traits de deux organismes via un code.',
    component: exports.SharedMutationRitual
};
PluginManager_1.PluginManager.register(SharedMutationRitualPlugin);
exports.default = SharedMutationRitualPlugin;
