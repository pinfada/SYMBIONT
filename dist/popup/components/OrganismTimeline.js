"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrganismTimeline = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const OrganismTimeline = ({ events }) => {
    return ((0, jsx_runtime_1.jsxs)("div", { className: "organism-timeline", children: [(0, jsx_runtime_1.jsx)("h3", { style: { textAlign: 'center', color: '#00e0ff', marginBottom: 18 }, children: "\u00C9volution de l'organisme" }), (0, jsx_runtime_1.jsx)("ul", { className: "timeline-list", children: events.map((evt, idx) => ((0, jsx_runtime_1.jsxs)("li", { className: `timeline-event timeline-event--${evt.type}`, children: [(0, jsx_runtime_1.jsxs)("div", { className: "timeline-icon", children: [evt.type === 'mutation' && (0, jsx_runtime_1.jsx)("span", { title: "Mutation", children: "\uD83E\uDDEC" }), evt.type === 'transmission' && (0, jsx_runtime_1.jsx)("span", { title: "Transmission", children: "\uD83D\uDD17" }), evt.type === 'activation' && (0, jsx_runtime_1.jsx)("span", { title: "Activation", children: "\u2728" })] }), (0, jsx_runtime_1.jsxs)("div", { className: "timeline-content", children: [(0, jsx_runtime_1.jsx)("div", { className: "timeline-date", children: new Date(evt.date).toLocaleString() }), (0, jsx_runtime_1.jsx)("div", { className: "timeline-desc", children: evt.description })] })] }, idx))) })] }));
};
exports.OrganismTimeline = OrganismTimeline;
