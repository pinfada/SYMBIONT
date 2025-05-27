"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SettingsPanel = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
// src/popup/components/SettingsPanel.tsx
const react_1 = require("react");
const useTheme_1 = require("../hooks/useTheme");
const SymbiontStorage_1 = require("@storage/SymbiontStorage");
const AnimatedButton_1 = require("./ui/AnimatedButton");
const SettingsPanel = () => {
    const { theme, setTheme } = (0, useTheme_1.useTheme)();
    const [settings, setSettings] = (0, react_1.useState)({
        theme: 'auto',
        notifications: true,
        autoMutate: false,
        mutationSpeed: 1,
        visualQuality: 'high'
    });
    (0, react_1.useEffect)(() => {
        loadSettings();
    }, []);
    const loadSettings = async () => {
        const storage = SymbiontStorage_1.SymbiontStorage.getInstance();
        const savedSettings = await storage.getSetting('userPreferences');
        if (savedSettings) {
            setSettings(savedSettings);
        }
    };
    const saveSettings = async () => {
        const storage = SymbiontStorage_1.SymbiontStorage.getInstance();
        await storage.setSetting('userPreferences', settings);
    };
    const updateSetting = (key, value) => {
        setSettings(prev => ({
            ...prev,
            [key]: value
        }));
    };
    return ((0, jsx_runtime_1.jsxs)("div", { className: "settings-panel", children: [(0, jsx_runtime_1.jsxs)("section", { className: "settings-section", children: [(0, jsx_runtime_1.jsx)("h3", { children: "Appearance" }), (0, jsx_runtime_1.jsxs)("div", { className: "setting-item", children: [(0, jsx_runtime_1.jsx)("label", { children: "Theme" }), (0, jsx_runtime_1.jsxs)("select", { value: settings.theme, onChange: (e) => {
                                    const value = e.target.value;
                                    updateSetting('theme', value);
                                    setTheme(value);
                                }, children: [(0, jsx_runtime_1.jsx)("option", { value: "auto", children: "Auto" }), (0, jsx_runtime_1.jsx)("option", { value: "light", children: "Light" }), (0, jsx_runtime_1.jsx)("option", { value: "dark", children: "Dark" })] })] }), (0, jsx_runtime_1.jsxs)("div", { className: "setting-item", children: [(0, jsx_runtime_1.jsx)("label", { children: "Visual Quality" }), (0, jsx_runtime_1.jsxs)("select", { value: settings.visualQuality, onChange: (e) => updateSetting('visualQuality', e.target.value), children: [(0, jsx_runtime_1.jsx)("option", { value: "low", children: "Low" }), (0, jsx_runtime_1.jsx)("option", { value: "medium", children: "Medium" }), (0, jsx_runtime_1.jsx)("option", { value: "high", children: "High" })] })] })] }), (0, jsx_runtime_1.jsxs)("section", { className: "settings-section", children: [(0, jsx_runtime_1.jsx)("h3", { children: "Behavior" }), (0, jsx_runtime_1.jsx)("div", { className: "setting-item", children: (0, jsx_runtime_1.jsxs)("label", { children: [(0, jsx_runtime_1.jsx)("input", { type: "checkbox", checked: settings.notifications, onChange: (e) => updateSetting('notifications', e.target.checked) }), "Enable Notifications"] }) }), (0, jsx_runtime_1.jsx)("div", { className: "setting-item", children: (0, jsx_runtime_1.jsxs)("label", { children: [(0, jsx_runtime_1.jsx)("input", { type: "checkbox", checked: settings.autoMutate, onChange: (e) => updateSetting('autoMutate', e.target.checked) }), "Auto-mutation"] }) }), (0, jsx_runtime_1.jsxs)("div", { className: "setting-item", children: [(0, jsx_runtime_1.jsx)("label", { children: "Mutation Speed" }), (0, jsx_runtime_1.jsx)("input", { type: "range", min: "0.1", max: "5", step: "0.1", value: settings.mutationSpeed, onChange: (e) => updateSetting('mutationSpeed', parseFloat(e.target.value)) }), (0, jsx_runtime_1.jsxs)("span", { children: [settings.mutationSpeed, "x"] })] })] }), (0, jsx_runtime_1.jsx)(AnimatedButton_1.AnimatedButton, { onClick: saveSettings, children: "Save Changes" })] }));
};
exports.SettingsPanel = SettingsPanel;
