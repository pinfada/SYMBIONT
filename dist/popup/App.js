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
const App = () => {
    const [activeTab, setActiveTab] = (0, react_1.useState)('organism');
    const { theme } = (0, useTheme_1.useTheme)();
    return ((0, jsx_runtime_1.jsxs)("div", { className: "app-container", "data-theme": theme, children: [(0, jsx_runtime_1.jsxs)("header", { className: "app-header", children: [(0, jsx_runtime_1.jsx)("h1", { className: "app-title", children: "SYMBIONT" }), (0, jsx_runtime_1.jsx)("div", { className: "app-subtitle", children: "Digital Organism v1.0" })] }), (0, jsx_runtime_1.jsxs)("nav", { className: "tab-navigation", children: [(0, jsx_runtime_1.jsx)("button", { className: `tab-navigation__item ${activeTab === 'organism' ? 'tab-navigation__item--active' : ''}`, onClick: () => setActiveTab('organism'), children: "Organism" }), (0, jsx_runtime_1.jsx)("button", { className: `tab-navigation__item ${activeTab === 'metrics' ? 'tab-navigation__item--active' : ''}`, onClick: () => setActiveTab('metrics'), children: "Metrics" }), (0, jsx_runtime_1.jsx)("button", { className: `tab-navigation__item ${activeTab === 'settings' ? 'tab-navigation__item--active' : ''}`, onClick: () => setActiveTab('settings'), children: "Settings" })] }), (0, jsx_runtime_1.jsxs)("main", { className: "app-content", children: [activeTab === 'organism' && (0, jsx_runtime_1.jsx)(OrganismDashboard_1.OrganismDashboard, {}), activeTab === 'metrics' && (0, jsx_runtime_1.jsx)(MetricsPanel_1.MetricsPanel, {}), activeTab === 'settings' && (0, jsx_runtime_1.jsx)(SettingsPanel_1.SettingsPanel, {})] })] }));
};
exports.App = App;
