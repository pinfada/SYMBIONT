"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MetricsPanel = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
// src/popup/components/MetricsPanel.tsx
const react_1 = require("react");
const BehaviorPatterns_1 = require("./BehaviorPatterns");
const ActivityTimeline_1 = require("./ActivityTimeline");
const useOrganism_1 = require("../hooks/useOrganism");
const SymbiontStorage_1 = require("@storage/SymbiontStorage");
const MetricsPanel = () => {
    const { organism } = (0, useOrganism_1.useOrganism)();
    const [behaviorData, setBehaviorData] = (0, react_1.useState)([]);
    const [activityData, setActivityData] = (0, react_1.useState)([]);
    (0, react_1.useEffect)(() => {
        const loadData = async () => {
            const storage = SymbiontStorage_1.SymbiontStorage.getInstance();
            const patterns = await storage.getBehaviorPatterns();
            const activities = await storage.getRecentActivity(24 * 60 * 60 * 1000); // 24h
            setBehaviorData(patterns);
            setActivityData(activities);
        };
        loadData();
        const interval = setInterval(loadData, 10000);
        return () => clearInterval(interval);
    }, []);
    if (!organism)
        return null;
    return ((0, jsx_runtime_1.jsxs)("div", { className: "metrics-panel", children: [(0, jsx_runtime_1.jsxs)("section", { className: "metrics-section", children: [(0, jsx_runtime_1.jsx)("h3", { children: "Behavior Patterns" }), (0, jsx_runtime_1.jsx)(BehaviorPatterns_1.BehaviorPatterns, { data: behaviorData })] }), (0, jsx_runtime_1.jsxs)("section", { className: "metrics-section", children: [(0, jsx_runtime_1.jsx)("h3", { children: "Activity Timeline" }), (0, jsx_runtime_1.jsx)(ActivityTimeline_1.ActivityTimeline, { data: activityData })] }), (0, jsx_runtime_1.jsxs)("section", { className: "metrics-section", children: [(0, jsx_runtime_1.jsx)("h3", { children: "Evolution Stats" }), (0, jsx_runtime_1.jsxs)("div", { className: "evolution-stats", children: [(0, jsx_runtime_1.jsxs)("div", { className: "stat-item", children: [(0, jsx_runtime_1.jsx)("span", { className: "stat-label", children: "Total Mutations" }), (0, jsx_runtime_1.jsx)("span", { className: "stat-value", children: organism.mutations.length })] }), (0, jsx_runtime_1.jsxs)("div", { className: "stat-item", children: [(0, jsx_runtime_1.jsx)("span", { className: "stat-label", children: "Generation" }), (0, jsx_runtime_1.jsx)("span", { className: "stat-value", children: organism.generation })] }), (0, jsx_runtime_1.jsxs)("div", { className: "stat-item", children: [(0, jsx_runtime_1.jsx)("span", { className: "stat-label", children: "Age" }), (0, jsx_runtime_1.jsxs)("span", { className: "stat-value", children: [Math.floor((Date.now() - organism.createdAt) / (1000 * 60 * 60)), "h"] })] })] })] })] }));
};
exports.MetricsPanel = MetricsPanel;
