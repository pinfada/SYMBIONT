"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OnboardingScreen = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const InvitationStep_1 = require("./InvitationStep");
const steps = [
    'intro',
    'permissions',
    'invitation',
    'confirmation',
];
const OnboardingScreen = () => {
    const [step, setStep] = (0, react_1.useState)('intro');
    const [murmur, setMurmur] = (0, react_1.useState)(null);
    const handleNext = () => {
        const idx = steps.indexOf(step);
        if (idx < steps.length - 1)
            setStep(steps[idx + 1]);
    };
    // Simuler un murmure à la fin de l'onboarding
    const handleActivation = () => {
        setStep('confirmation');
        setMurmur({
            text: 'Bienvenue, symbiont. Un nouveau cycle commence...',
            timestamp: Date.now(),
            context: 'onboarding',
        });
    };
    return ((0, jsx_runtime_1.jsxs)("div", { className: "onboarding-screen", children: [step === 'intro' && ((0, jsx_runtime_1.jsxs)("section", { className: "onboarding-step", children: [(0, jsx_runtime_1.jsx)("h2", { children: "Bienvenue dans SYMBIONT" }), (0, jsx_runtime_1.jsx)("p", { children: "Un organisme num\u00E9rique vivant, \u00E9volutif, anonyme et po\u00E9tique." }), (0, jsx_runtime_1.jsx)("button", { onClick: handleNext, children: "Commencer" })] })), step === 'permissions' && ((0, jsx_runtime_1.jsxs)("section", { className: "onboarding-step", children: [(0, jsx_runtime_1.jsx)("h3", { children: "Permissions requises" }), (0, jsx_runtime_1.jsxs)("ul", { children: [(0, jsx_runtime_1.jsx)("li", { children: "Acc\u00E8s aux onglets\u202F: pour observer les motifs de navigation" }), (0, jsx_runtime_1.jsx)("li", { children: "Acc\u00E8s \u00E0 tous les sites\u202F: pour permettre \u00E0 l'organisme d'\u00E9voluer" }), (0, jsx_runtime_1.jsx)("li", { children: "Stockage local\u202F: pour garder votre organisme sur votre machine" }), (0, jsx_runtime_1.jsx)("li", { children: "Aucune donn\u00E9e personnelle n'est collect\u00E9e ou transmise" })] }), (0, jsx_runtime_1.jsx)("button", { onClick: handleNext, children: "J'accepte" })] })), step === 'invitation' && ((0, jsx_runtime_1.jsx)(InvitationStep_1.InvitationStep, { onActivated: handleActivation })), step === 'confirmation' && ((0, jsx_runtime_1.jsxs)("section", { className: "onboarding-step", children: [(0, jsx_runtime_1.jsx)("h3", { children: "Activation r\u00E9ussie\u202F!" }), (0, jsx_runtime_1.jsx)("p", { children: "Votre organisme est maintenant \u00E9veill\u00E9." }), murmur && ((0, jsx_runtime_1.jsx)("div", { className: "murmur-notification", children: (0, jsx_runtime_1.jsx)("em", { children: murmur.text }) }))] }))] }));
};
exports.OnboardingScreen = OnboardingScreen;
