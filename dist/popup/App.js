"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.App = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
// src/popup/App.tsx
const react_1 = require("react");
const OrganismDashboard_1 = require("./components/OrganismDashboard");
const MetricsPanel_1 = require("./components/MetricsPanel");
const SettingsPanel_1 = require("./components/SettingsPanel");
const useTheme_1 = require("./hooks/useTheme");
const MessageBusContext_1 = require("./hooks/MessageBusContext");
const MurmureNotification_1 = require("./components/MurmureNotification");
const SharedMutationRitual_1 = require("./components/SharedMutationRitual");
const CollectiveWakeRitual_1 = require("./components/CollectiveWakeRitual");
const ContextualInvitationNotification_1 = require("./components/ContextualInvitationNotification");
const SecretRitualInput_1 = require("./components/SecretRitualInput");
const SecretRitualNotification_1 = require("./components/SecretRitualNotification");
const GlobalNetworkGraph_1 = require("./components/GlobalNetworkGraph");
const OnboardingWizard_1 = require("./components/OnboardingWizard");
const AdminRitualsPanel_1 = require("./components/AdminRitualsPanel");
const App = () => {
    const [activeTab, setActiveTab] = (0, react_1.useState)('organism');
    const { theme } = (0, useTheme_1.useTheme)();
    const [activated, setActivated] = (0, react_1.useState)(() => {
        return localStorage.getItem('symbiont_activated') === 'true';
    });
    const [adminKey, setAdminKey] = (0, react_1.useState)(() => localStorage.getItem('symbiont_admin_key') || '');
    // Callback à passer à InvitationLanding pour activer l'organisme après succès
    const handleActivation = () => {
        localStorage.setItem('symbiont_activated', 'true');
        setActivated(true);
    };
    // Callback à passer à OnboardingWizard pour activer l'organisme après onboarding
    const handleOnboardingFinish = () => {
        localStorage.setItem('symbiont_activated', 'true');
        setActivated(true);
    };
    // --- Données mock pour la démo des rituels ---
    const userId = localStorage.getItem('symbiont_user_id') || 'USER-' + Math.random().toString(36).substr(2, 6).toUpperCase();
    const traits = {
        curiosity: 42,
        focus: 58,
        rhythm: 67,
        empathy: 33,
        creativity: 77,
        energy: 50,
        harmony: 60,
        wisdom: 12
    };
    // Stocker l'userId si pas déjà fait
    if (!localStorage.getItem('symbiont_user_id')) {
        localStorage.setItem('symbiont_user_id', userId);
    }
    return ((0, jsx_runtime_1.jsx)(MessageBusContext_1.MessageBusProvider, { children: !activated ? ((0, jsx_runtime_1.jsx)(OnboardingWizard_1.OnboardingWizard, { onFinish: handleOnboardingFinish })) : ((0, jsx_runtime_1.jsxs)("div", { className: "app-container", "data-theme": theme, children: [(0, jsx_runtime_1.jsxs)("header", { className: "app-header", children: [(0, jsx_runtime_1.jsx)("h1", { className: "app-title", children: "SYMBIONT" }), (0, jsx_runtime_1.jsx)("div", { className: "app-subtitle", children: "Digital Organism v1.0" })] }), (0, jsx_runtime_1.jsxs)("nav", { className: "tab-navigation", children: [(0, jsx_runtime_1.jsx)("button", { className: `tab-navigation__item ${activeTab === 'organism' ? 'tab-navigation__item--active' : ''}`, onClick: () => setActiveTab('organism'), children: "Organism" }), (0, jsx_runtime_1.jsx)("button", { className: `tab-navigation__item ${activeTab === 'metrics' ? 'tab-navigation__item--active' : ''}`, onClick: () => setActiveTab('metrics'), children: "Metrics" }), (0, jsx_runtime_1.jsx)("button", { className: `tab-navigation__item ${activeTab === 'settings' ? 'tab-navigation__item--active' : ''}`, onClick: () => setActiveTab('settings'), children: "Settings" }), (0, jsx_runtime_1.jsx)("button", { className: `tab-navigation__item ${activeTab === 'rituals' ? 'tab-navigation__item--active' : ''}`, onClick: () => setActiveTab('rituals'), children: "Rituels" }), (0, jsx_runtime_1.jsx)("button", { className: `tab-navigation__item ${activeTab === 'network' ? 'tab-navigation__item--active' : ''}`, onClick: () => setActiveTab('network'), children: "R\u00E9seau" }), adminKey && (0, jsx_runtime_1.jsx)("button", { onClick: () => setActiveTab('admin'), children: "Admin" })] }), !adminKey && ((0, jsx_runtime_1.jsxs)("div", { style: { margin: 18 }, children: [(0, jsx_runtime_1.jsx)("input", { type: "password", placeholder: "Cl\u00E9 admin\u2026", value: adminKey, onChange: e => setAdminKey(e.target.value) }), (0, jsx_runtime_1.jsx)("button", { onClick: () => { localStorage.setItem('symbiont_admin_key', adminKey); window.location.reload(); }, children: "Valider" })] })), (0, jsx_runtime_1.jsxs)("main", { className: "app-content", children: [activeTab === 'organism' && (0, jsx_runtime_1.jsx)(OrganismDashboard_1.OrganismDashboard, {}), activeTab === 'metrics' && (0, jsx_runtime_1.jsx)(MetricsPanel_1.MetricsPanel, {}), activeTab === 'settings' && (0, jsx_runtime_1.jsx)(SettingsPanel_1.SettingsPanel, {}), activeTab === 'rituals' && ((0, jsx_runtime_1.jsxs)("section", { children: [(0, jsx_runtime_1.jsx)("h2", { style: { textAlign: 'center', margin: '18px 0 24px 0', color: '#00e0ff' }, children: "Rituels collectifs" }), (0, jsx_runtime_1.jsx)(SharedMutationRitual_1.SharedMutationRitual, { userId: userId, traits: traits }), (0, jsx_runtime_1.jsx)("div", { style: { height: 32 } }), (0, jsx_runtime_1.jsx)(CollectiveWakeRitual_1.CollectiveWakeRitual, { userId: userId }), (0, jsx_runtime_1.jsx)("div", { style: { height: 32 } }), (0, jsx_runtime_1.jsx)(SecretRitualInput_1.SecretRitualInput, {})] })), activeTab === 'network' && ((0, jsx_runtime_1.jsx)("section", { children: (0, jsx_runtime_1.jsx)(GlobalNetworkGraph_1.GlobalNetworkGraph, {}) })), activeTab === 'admin' && adminKey && (0, jsx_runtime_1.jsx)(AdminRitualsPanel_1.AdminRitualsPanel, {})] }), (0, jsx_runtime_1.jsx)(MurmureNotification_1.MurmureNotification, {}), (0, jsx_runtime_1.jsx)(ContextualInvitationNotification_1.ContextualInvitationNotification, {}), (0, jsx_runtime_1.jsx)(SecretRitualNotification_1.SecretRitualNotification, {})] })) }));
};
exports.App = App;
