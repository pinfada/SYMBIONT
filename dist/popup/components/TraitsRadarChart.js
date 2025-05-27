"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TraitsRadarChart = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
// src/popup/components/TraitsRadarChart.tsx
const react_1 = require("react");
const TraitsRadarChart = ({ traits }) => {
    const data = (0, react_1.useMemo)(() => [
        { label: 'Curiosity', value: traits.curiosity },
        { label: 'Focus', value: traits.focus },
        { label: 'Rhythm', value: traits.rhythm },
        { label: 'Empathy', value: traits.empathy },
        { label: 'Creativity', value: traits.creativity }
    ], [traits]);
    const size = 200;
    const center = size / 2;
    const radius = size * 0.35;
    // Calcul des points du radar
    const points = data.map((item, index) => {
        const angle = (index * 2 * Math.PI) / data.length - Math.PI / 2;
        const value = item.value * radius;
        return {
            x: center + value * Math.cos(angle),
            y: center + value * Math.sin(angle),
            labelX: center + (radius + 20) * Math.cos(angle),
            labelY: center + (radius + 20) * Math.sin(angle)
        };
    });
    // Création du tracé
    const pathData = points
        .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
        .join(' ') + ' Z';
    return ((0, jsx_runtime_1.jsx)("div", { className: "traits-radar", children: (0, jsx_runtime_1.jsxs)("svg", { viewBox: `0 0 ${size} ${size}`, className: "radar-chart", children: [[0.2, 0.4, 0.6, 0.8, 1].map(level => ((0, jsx_runtime_1.jsx)("circle", { cx: center, cy: center, r: radius * level, fill: "none", stroke: "var(--color-border)", strokeWidth: "1", opacity: "0.3" }, level))), data.map((item, index) => {
                    const angle = (index * 2 * Math.PI) / data.length - Math.PI / 2;
                    const x2 = center + radius * Math.cos(angle);
                    const y2 = center + radius * Math.sin(angle);
                    return ((0, jsx_runtime_1.jsxs)("g", { children: [(0, jsx_runtime_1.jsx)("line", { x1: center, y1: center, x2: x2, y2: y2, stroke: "var(--color-border)", strokeWidth: "1", opacity: "0.3" }), (0, jsx_runtime_1.jsx)("text", { x: points[index].labelX, y: points[index].labelY, textAnchor: "middle", dominantBaseline: "middle", className: "radar-label", fill: "var(--color-text-dim)", fontSize: "12", children: item.label })] }, item.label));
                }), (0, jsx_runtime_1.jsx)("path", { d: pathData, fill: "var(--color-primary)", fillOpacity: "0.2", stroke: "var(--color-primary)", strokeWidth: "2" }), points.map((point, index) => ((0, jsx_runtime_1.jsx)("circle", { cx: point.x, cy: point.y, r: "4", fill: "var(--color-primary)", stroke: "var(--color-background)", strokeWidth: "1" }, index)))] }) }));
};
exports.TraitsRadarChart = TraitsRadarChart;
