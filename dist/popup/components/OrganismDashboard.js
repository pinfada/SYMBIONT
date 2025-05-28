"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrganismDashboard = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const OrganismViewer_1 = require("./OrganismViewer");
const ConsciousnessGauge_1 = require("./ConsciousnessGauge");
const TraitsRadarChart_1 = require("./TraitsRadarChart");
const useOrganism_1 = require("../hooks/useOrganism");
const LoadingSpinner_1 = require("./ui/LoadingSpinner");
const OrganismTimeline_1 = require("./OrganismTimeline");
const TransmissionGraph_1 = require("./TransmissionGraph");
const useInvitationData_1 = require("../hooks/useInvitationData");
// import { OrganismState } from '@shared/types/organism';
const OrganismDashboard = () => {
    const { organism, isLoading } = (0, useOrganism_1.useOrganism)();
    if (isLoading) {
        return ((0, jsx_runtime_1.jsxs)("div", { className: "organism-dashboard--loading", children: [(0, jsx_runtime_1.jsx)(LoadingSpinner_1.LoadingSpinner, { size: "large" }), (0, jsx_runtime_1.jsx)("p", { children: "Initializing organism..." })] }));
    }
    if (!organism) {
        return ((0, jsx_runtime_1.jsxs)("div", { className: "organism-dashboard--empty", children: [(0, jsx_runtime_1.jsx)("h2", { children: "No Organism Found" }), (0, jsx_runtime_1.jsx)("p", { children: "Your digital organism is being created..." })] }));
    }
    // Pour la démo, on génère des événements mockés
    const now = Date.now();
    const events = [
        { type: 'activation', date: now - 1000 * 60 * 60 * 24 * 7, description: "L'organisme a été activé." },
        { type: 'mutation', date: now - 1000 * 60 * 60 * 24 * 6, description: 'Mutation visuelle : variation de couleur.' },
        { type: 'mutation', date: now - 1000 * 60 * 60 * 24 * 4, description: 'Mutation cognitive rare : éveil de la conscience.' },
        { type: 'transmission', date: now - 1000 * 60 * 60 * 24 * 3, description: 'Invitation transmise à un autre utilisateur.' },
        { type: 'mutation', date: now - 1000 * 60 * 60 * 24 * 2, description: 'Mutation comportementale : curiosité accrue.' },
        { type: 'mutation', date: now - 1000 * 60 * 60 * 24 * 1, description: 'Mutation visuelle : motif fractal généré.' },
    ];
    // Données de transmission (mock/demo)
    const userId = localStorage.getItem('symbiont_user_id') || 'ABC123';
    const { inviter, invitees } = (0, useInvitationData_1.useInvitationData)(userId);
    return ((0, jsx_runtime_1.jsxs)("div", { className: "organism-dashboard", children: [(0, jsx_runtime_1.jsx)("section", { className: "dashboard-section dashboard-section--viewer", children: (0, jsx_runtime_1.jsx)(OrganismViewer_1.OrganismViewer, {}) }), (0, jsx_runtime_1.jsxs)("section", { className: "dashboard-section dashboard-section--vitals", children: [(0, jsx_runtime_1.jsxs)("div", { className: "vital-stats", children: [(0, jsx_runtime_1.jsxs)("div", { className: "vital-stat", children: [(0, jsx_runtime_1.jsx)("span", { className: "vital-stat__label", children: "Health" }), (0, jsx_runtime_1.jsx)("div", { className: "vital-stat__bar", children: (0, jsx_runtime_1.jsx)("div", { className: "vital-stat__fill vital-stat__fill--health", style: { width: `${organism.health * 100}%` } }) }), (0, jsx_runtime_1.jsxs)("span", { className: "vital-stat__value", children: [Math.round(organism.health * 100), "%"] })] }), (0, jsx_runtime_1.jsxs)("div", { className: "vital-stat", children: [(0, jsx_runtime_1.jsx)("span", { className: "vital-stat__label", children: "Energy" }), (0, jsx_runtime_1.jsx)("div", { className: "vital-stat__bar", children: (0, jsx_runtime_1.jsx)("div", { className: "vital-stat__fill vital-stat__fill--energy", style: { width: `${organism.energy * 100}%` } }) }), (0, jsx_runtime_1.jsxs)("span", { className: "vital-stat__value", children: [Math.round(organism.energy * 100), "%"] })] })] }), (0, jsx_runtime_1.jsx)(ConsciousnessGauge_1.ConsciousnessGauge, { value: organism.consciousness || 0.1 })] }), (0, jsx_runtime_1.jsxs)("section", { className: "dashboard-section dashboard-section--traits", children: [(0, jsx_runtime_1.jsx)("h3", { children: "Personality Traits" }), (0, jsx_runtime_1.jsx)(TraitsRadarChart_1.TraitsRadarChart, { traits: organism.traits })] }), (0, jsx_runtime_1.jsx)("section", { className: "dashboard-section dashboard-section--info", children: (0, jsx_runtime_1.jsxs)("div", { className: "organism-info", children: [(0, jsx_runtime_1.jsxs)("div", { className: "info-item", children: [(0, jsx_runtime_1.jsx)("span", { className: "info-label", children: "Generation" }), (0, jsx_runtime_1.jsx)("span", { className: "info-value", children: organism.generation })] }), (0, jsx_runtime_1.jsxs)("div", { className: "info-item", children: [(0, jsx_runtime_1.jsx)("span", { className: "info-label", children: "DNA Signature" }), (0, jsx_runtime_1.jsxs)("span", { className: "info-value", title: organism.dna, children: [organism.dna.substring(0, 8), "..."] })] }), (0, jsx_runtime_1.jsxs)("div", { className: "info-item", children: [(0, jsx_runtime_1.jsx)("span", { className: "info-label", children: "Mutations" }), (0, jsx_runtime_1.jsx)("span", { className: "info-value", children: organism.mutations.length })] })] }) }), (0, jsx_runtime_1.jsx)(OrganismTimeline_1.OrganismTimeline, { events: events }), (0, jsx_runtime_1.jsx)("h3", { style: { textAlign: 'center', color: '#ffb700', margin: '32px 0 12px 0' }, children: "Carte de transmission" }), (0, jsx_runtime_1.jsx)(TransmissionGraph_1.TransmissionGraph, { inviter: inviter, invitees: invitees, userCode: userId })] }));
};
exports.OrganismDashboard = OrganismDashboard;
