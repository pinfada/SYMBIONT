"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConsciousnessGauge = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const ConsciousnessGauge = ({ value }) => {
    const percentage = Math.round(value * 100);
    const radius = 40;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (value * circumference);
    return ((0, jsx_runtime_1.jsxs)("div", { className: "consciousness-gauge", children: [(0, jsx_runtime_1.jsxs)("svg", { width: "100", height: "100", viewBox: "0 0 100 100", children: [(0, jsx_runtime_1.jsx)("circle", { cx: "50", cy: "50", r: radius, fill: "none", stroke: "var(--color-surface-light)", strokeWidth: "8" }), (0, jsx_runtime_1.jsx)("circle", { cx: "50", cy: "50", r: radius, fill: "none", stroke: "var(--color-consciousness)", strokeWidth: "8", strokeLinecap: "round", strokeDasharray: circumference, strokeDashoffset: strokeDashoffset, style: {
                            transition: 'stroke-dashoffset 0.5s ease',
                            transform: 'rotate(-90deg)',
                            transformOrigin: '50% 50%'
                        } })] }), (0, jsx_runtime_1.jsxs)("div", { className: "consciousness-gauge__value", children: [(0, jsx_runtime_1.jsx)("span", { className: "consciousness-gauge__number", children: percentage }), (0, jsx_runtime_1.jsx)("span", { className: "consciousness-gauge__label", children: "Consciousness" })] })] }));
};
exports.ConsciousnessGauge = ConsciousnessGauge;
