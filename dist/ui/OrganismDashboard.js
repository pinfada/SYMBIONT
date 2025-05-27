"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrganismDashboard = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const OrganismViewer_1 = require("./OrganismViewer");
const ConsciousnessGauge_1 = require("./ConsciousnessGauge");
const TraitsRadarChart_1 = require("./TraitsRadarChart");
/**
 * OrganismDashboard - Dashboard principal de visualisation et contrôle
 * - Affiche l'organisme, la jauge de conscience, le radar des traits
 * - Permet de muter l'ADN et de randomiser les traits
 */
const DEFAULT_TRAITS = {
    curiosity: 0.7,
    focus: 0.5,
    rhythm: 0.6,
    empathy: 0.4,
    creativity: 0.8,
    energy: 0.6,
    harmony: 0.5,
    wisdom: 0.2
};
function randomDNA(length = 16) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}
function randomTraits() {
    return {
        curiosity: Math.random(),
        focus: Math.random(),
        rhythm: Math.random(),
        empathy: Math.random(),
        creativity: Math.random(),
        energy: Math.random(),
        harmony: Math.random(),
        wisdom: Math.random()
    };
}
const OrganismDashboard = () => {
    const [dna, setDNA] = (0, react_1.useState)(randomDNA());
    const [traits, setTraits] = (0, react_1.useState)(DEFAULT_TRAITS);
    const [consciousness, setConsciousness] = (0, react_1.useState)(0.5);
    // Callback pour recevoir les métriques (ex : ajuster la conscience)
    const handleMetrics = (metrics) => {
        // Exemple : conscience = FPS normalisé (à adapter selon logique réelle)
        setConsciousness(Math.max(0, Math.min(1, metrics.fps / 60)));
    };
    return ((0, jsx_runtime_1.jsxs)("div", { style: {
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 24,
            background: '#181c22',
            minHeight: '100vh',
            padding: 32
        }, children: [(0, jsx_runtime_1.jsx)("h2", { style: { color: '#00e0ff', letterSpacing: 2, fontWeight: 700 }, children: "SYMBIONT Organism Dashboard" }), (0, jsx_runtime_1.jsxs)("div", { style: { display: 'flex', gap: 40, alignItems: 'center' }, children: [(0, jsx_runtime_1.jsx)(OrganismViewer_1.OrganismViewer, { dna: dna, traits: traits, width: 320, height: 320, onMetrics: handleMetrics }), (0, jsx_runtime_1.jsxs)("div", { style: { display: 'flex', flexDirection: 'column', gap: 24, alignItems: 'center' }, children: [(0, jsx_runtime_1.jsx)(ConsciousnessGauge_1.ConsciousnessGauge, { value: consciousness }), (0, jsx_runtime_1.jsx)(TraitsRadarChart_1.TraitsRadarChart, { traits: traits })] })] }), (0, jsx_runtime_1.jsxs)("div", { style: { marginTop: 32, display: 'flex', gap: 16 }, children: [(0, jsx_runtime_1.jsx)("button", { onClick: () => setDNA(randomDNA()), style: { padding: '8px 18px', borderRadius: 6, background: '#00e0ff', color: '#111', fontWeight: 600, border: 'none', cursor: 'pointer' }, children: "ADN al\u00E9atoire" }), (0, jsx_runtime_1.jsx)("button", { onClick: () => setTraits(randomTraits()), style: { padding: '8px 18px', borderRadius: 6, background: '#222', color: '#fff', fontWeight: 600, border: 'none', cursor: 'pointer' }, children: "Traits al\u00E9atoires" })] })] }));
};
exports.OrganismDashboard = OrganismDashboard;
