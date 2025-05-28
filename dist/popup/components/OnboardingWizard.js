"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OnboardingWizard = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const NarrationService_1 = require("../../shared/NarrationService");
const steps = [
    'intro',
    'permissions',
    'invitation',
    'customize',
    'activation',
    'guidedTour'
];
const COLORS = ['#00e0ff', '#ff4b6e', '#ffb700', '#7cffb2', '#b388ff'];
const AVATARS = ['🌱', '🦋', '🧬', '🌟', '🪐'];
const OnboardingWizard = ({ onFinish }) => {
    const [step, setStep] = (0, react_1.useState)(0);
    const [inviteCode, setInviteCode] = (0, react_1.useState)('');
    const [inviteError, setInviteError] = (0, react_1.useState)(null);
    const [color, setColor] = (0, react_1.useState)(COLORS[0]);
    const [avatar, setAvatar] = (0, react_1.useState)(AVATARS[0]);
    const context = { hour: new Date().getHours(), firstLogin: step === 0 };
    const murmure = (0, NarrationService_1.getContextualMurmure)(context, steps[step]);
    function handleValidateInvite() {
        if (!inviteCode.trim()) {
            setInviteError('Veuillez entrer un code.');
            return;
        }
        setInviteError(null);
        setStep(3); // Passe à l'étape personnalisation
    }
    function handlePrev() {
        if (step > 0)
            setStep(step - 1);
    }
    function handleSkip() {
        setStep(steps.length - 1);
    }
    return ((0, jsx_runtime_1.jsxs)("div", { className: "onboarding-wizard", style: { minHeight: 340, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', transition: 'all 0.6s cubic-bezier(.4,0,.2,1)' }, children: [step === 0 && ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)("h2", { children: "Bienvenue dans SYMBIONT" }), (0, jsx_runtime_1.jsx)("div", { style: { margin: '18px 0', color: '#00e0ff', fontStyle: 'italic' }, children: murmure }), (0, jsx_runtime_1.jsx)("button", { onClick: () => setStep(1), style: { marginTop: 24 }, children: "Commencer" }), (0, jsx_runtime_1.jsx)("button", { onClick: handleSkip, style: { marginTop: 12, background: 'none', color: '#888', border: 'none', textDecoration: 'underline', cursor: 'pointer' }, children: "Passer l&lsquoonboarding" })] })), step === 1 && ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)("h2", { children: "Permissions" }), (0, jsx_runtime_1.jsx)("div", { style: { margin: '18px 0', color: '#00e0ff', fontStyle: 'italic' }, children: murmure }), (0, jsx_runtime_1.jsx)("div", { children: "SYMBIONT a besoin de stocker vos pr\u00E9f\u00E9rences et d&lsquoafficher des notifications immersives." }), (0, jsx_runtime_1.jsx)("button", { onClick: () => setStep(2), style: { marginTop: 24 }, children: "Continuer" }), (0, jsx_runtime_1.jsx)("button", { onClick: handlePrev, style: { marginTop: 12, background: 'none', color: '#888', border: 'none', textDecoration: 'underline', cursor: 'pointer' }, children: "Pr\u00E9c\u00E9dent" })] })), step === 2 && ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)("h2", { children: "Rituel d&lsquoinvitation" }), (0, jsx_runtime_1.jsx)("div", { style: { margin: '18px 0', color: '#00e0ff', fontStyle: 'italic' }, children: murmure }), (0, jsx_runtime_1.jsx)("div", { children: "Entrez votre code d&lsquoinvitation pour activer votre organisme." }), (0, jsx_runtime_1.jsx)("input", { type: "text", value: inviteCode, onChange: e => setInviteCode(e.target.value), placeholder: "Code d'invitation", style: { marginTop: 16, padding: '8px 12px', borderRadius: 8, border: '1.5px solid #00e0ff', fontSize: 16, minWidth: 180 }, autoFocus: true }), inviteError && (0, jsx_runtime_1.jsx)("div", { style: { color: '#ff4b6e', marginTop: 8 }, children: inviteError }), (0, jsx_runtime_1.jsx)("button", { onClick: handleValidateInvite, style: { marginTop: 24 }, disabled: !inviteCode.trim(), children: "Valider" }), (0, jsx_runtime_1.jsx)("button", { onClick: handlePrev, style: { marginTop: 12, background: 'none', color: '#888', border: 'none', textDecoration: 'underline', cursor: 'pointer' }, children: "Pr\u00E9c\u00E9dent" })] })), step === 3 && ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)("h2", { children: "Personnalisation rapide" }), (0, jsx_runtime_1.jsx)("div", { style: { margin: '18px 0', color: '#00e0ff', fontStyle: 'italic' }, children: murmure }), (0, jsx_runtime_1.jsx)("div", { style: { marginBottom: 12 }, children: "Choisissez votre couleur :" }), (0, jsx_runtime_1.jsx)("div", { style: { display: 'flex', gap: 10, marginBottom: 18 }, children: COLORS.map(c => ((0, jsx_runtime_1.jsx)("button", { style: { width: 32, height: 32, borderRadius: '50%', background: c, border: color === c ? '3px solid #fff' : '2px solid #888', cursor: 'pointer' }, onClick: () => setColor(c), "aria-label": `Choisir la couleur ${c}` }, c))) }), (0, jsx_runtime_1.jsx)("div", { style: { marginBottom: 12 }, children: "Choisissez votre avatar :" }), (0, jsx_runtime_1.jsx)("div", { style: { display: 'flex', gap: 10, marginBottom: 18 }, children: AVATARS.map(a => ((0, jsx_runtime_1.jsx)("button", { style: { fontSize: 28, background: avatar === a ? '#00e0ff33' : 'transparent', border: avatar === a ? '2px solid #00e0ff' : '2px solid transparent', borderRadius: 8, cursor: 'pointer' }, onClick: () => setAvatar(a), "aria-label": `Choisir l'avatar ${a}`, children: a }, a))) }), (0, jsx_runtime_1.jsx)("button", { onClick: () => setStep(4), style: { marginTop: 18 }, children: "Valider" }), (0, jsx_runtime_1.jsx)("button", { onClick: handlePrev, style: { marginTop: 12, background: 'none', color: '#888', border: 'none', textDecoration: 'underline', cursor: 'pointer' }, children: "Pr\u00E9c\u00E9dent" })] })), step === 4 && ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)("h2", { children: "Activation" }), (0, jsx_runtime_1.jsx)("div", { style: { margin: '18px 0', color: '#00e0ff', fontStyle: 'italic' }, children: murmure }), (0, jsx_runtime_1.jsx)("div", { children: "Votre organisme est activ\u00E9 ! Personnalisez-le pour commencer l&lsquoaventure." }), (0, jsx_runtime_1.jsxs)("div", { style: { margin: '18px 0' }, children: [(0, jsx_runtime_1.jsx)("span", { style: { fontSize: 28, color }, children: avatar }), (0, jsx_runtime_1.jsx)("span", { style: { marginLeft: 12, color }, children: color })] }), (0, jsx_runtime_1.jsx)("button", { onClick: () => setStep(5), style: { marginTop: 24 }, children: "D\u00E9couvrir" })] })), step === 5 && ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)("h2", { children: "D\u00E9couverte guid\u00E9e" }), (0, jsx_runtime_1.jsx)("div", { style: { margin: '18px 0', color: '#00e0ff', fontStyle: 'italic' }, children: murmure }), (0, jsx_runtime_1.jsx)("div", { children: "Explorez le r\u00E9seau, les rituels, la timeline et la personnalisation." }), (0, jsx_runtime_1.jsx)("button", { onClick: onFinish, style: { marginTop: 24 }, children: "Terminer" })] }))] }));
};
exports.OnboardingWizard = OnboardingWizard;
