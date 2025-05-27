"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConsciousnessGauge = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const ConsciousnessGauge = ({ value, label = 'Conscience', size = 80, color = '#00e0ff' }) => {
    const radius = size / 2 - 8;
    const circumference = 2 * Math.PI * radius;
    const progress = Math.max(0, Math.min(1, value));
    const offset = circumference * (1 - progress);
    return ((0, jsx_runtime_1.jsxs)("div", { style: { display: 'inline-block', textAlign: 'center' }, children: [(0, jsx_runtime_1.jsxs)("svg", { width: size, height: size, children: [(0, jsx_runtime_1.jsx)("circle", { cx: size / 2, cy: size / 2, r: radius, stroke: "#222", strokeWidth: 8, fill: "none" }), (0, jsx_runtime_1.jsx)("circle", { cx: size / 2, cy: size / 2, r: radius, stroke: color, strokeWidth: 8, fill: "none", strokeDasharray: circumference, strokeDashoffset: offset, strokeLinecap: "round", style: { transition: 'stroke-dashoffset 0.6s cubic-bezier(.4,2,.3,1)' } }), (0, jsx_runtime_1.jsxs)("text", { x: "50%", y: "50%", textAnchor: "middle", dominantBaseline: "central", fontSize: size * 0.22, fill: "#fff", fontWeight: 600, children: [(progress * 100).toFixed(0), "%"] })] }), (0, jsx_runtime_1.jsx)("div", { style: { color: '#aaa', fontSize: size * 0.18, marginTop: 4 }, children: label })] }));
};
exports.ConsciousnessGauge = ConsciousnessGauge;
