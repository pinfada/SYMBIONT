"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CollectiveWakeRitual = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const ritualsApi_1 = require("../../shared/ritualsApi");
const PluginManager_1 = require("../../core/PluginManager");
const CollectiveWakeRitual = ({ userId }) => {
    const [status, setStatus] = (0, react_1.useState)('idle');
    const [participants, setParticipants] = (0, react_1.useState)([]);
    const [triggeredAt, setTriggeredAt] = (0, react_1.useState)(null);
    const sectionRef = (0, react_1.useRef)(null);
    const handleWake = async () => {
        setStatus('waiting');
        const wakeId = 'wake-' + Date.now();
        try {
            await (0, ritualsApi_1.addRitual)({ _id: wakeId, type: 'collective-wake', userId, timestamp: Date.now() });
            // Récupérer tous les participants du jour
            const rituals = await (0, ritualsApi_1.getRituals)();
            const today = new Date().toISOString().slice(0, 10);
            const wakes = rituals.filter(r => r.type === 'collective-wake' && new Date(r.timestamp).toISOString().slice(0, 10) === today);
            setParticipants(wakes.map(w => w.userId));
            setTriggeredAt(Date.now());
            setStatus('done');
        }
        catch {
            setStatus('idle');
        }
    };
    return ((0, jsx_runtime_1.jsxs)("div", { className: "collective-wake-ritual", ref: sectionRef, children: [status === 'idle' && ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)("h3", { children: "Rituel de r\u00E9veil collectif" }), (0, jsx_runtime_1.jsx)("p", { children: "Participez \u00E0 un r\u00E9veil synchronis\u00E9 avec d'autres symbionts." }), (0, jsx_runtime_1.jsx)("button", { onClick: handleWake, "aria-label": "Participer au r\u00E9veil collectif", children: "Participer" })] })), status === 'waiting' && ((0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("p", { children: "En attente d'autres participants\u2026" }), (0, jsx_runtime_1.jsx)("div", { className: "murmur-notification", role: "status", "aria-live": "polite", children: "Un murmure circule dans la communaut\u00E9\u2026" })] })), status === 'done' && ((0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("h4", { children: "R\u00E9veil collectif !" }), (0, jsx_runtime_1.jsxs)("p", { children: [participants.length, " symbionts se sont \u00E9veill\u00E9s ensemble."] }), (0, jsx_runtime_1.jsx)("div", { className: "murmur-notification", role: "status", "aria-live": "polite", children: "Un \u00E9cho vibrant parcourt tous les organismes\u2026" }), (0, jsx_runtime_1.jsx)("div", { style: { fontSize: 12, color: '#888', marginTop: 8 }, children: triggeredAt && new Date(triggeredAt).toLocaleTimeString() })] }))] }));
};
exports.CollectiveWakeRitual = CollectiveWakeRitual;
const CollectiveWakeRitualPlugin = {
    id: 'collective-wake',
    type: 'ritual',
    name: 'Réveil collectif',
    description: 'Synchronisation de plusieurs symbionts pour un rituel collectif.',
    component: exports.CollectiveWakeRitual
};
PluginManager_1.PluginManager.register(CollectiveWakeRitualPlugin);
exports.default = CollectiveWakeRitualPlugin;
