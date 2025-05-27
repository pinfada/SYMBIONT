"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BehaviorPatterns = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const BehaviorPatterns = ({ data }) => {
    if (!data || data.length === 0) {
        return ((0, jsx_runtime_1.jsx)("div", { className: "behavior-patterns--empty", children: (0, jsx_runtime_1.jsx)("p", { children: "No behavior patterns detected yet" }) }));
    }
    return ((0, jsx_runtime_1.jsx)("div", { className: "behavior-patterns", children: (0, jsx_runtime_1.jsx)("ul", { className: "behavior-list", children: data.map(pattern => ((0, jsx_runtime_1.jsxs)("li", { className: "behavior-item", children: [(0, jsx_runtime_1.jsxs)("div", { className: "behavior-item__header", children: [(0, jsx_runtime_1.jsx)("span", { className: `behavior-type behavior-type--${pattern.type}`, children: pattern.type }), (0, jsx_runtime_1.jsxs)("span", { className: "behavior-confidence", children: [Math.round(pattern.confidence * 100), "%"] })] }), (0, jsx_runtime_1.jsx)("p", { className: "behavior-description", children: pattern.description }), (0, jsx_runtime_1.jsx)("div", { className: "behavior-timestamp", children: formatTimestamp(pattern.lastSeen) })] }, pattern.id))) }) }));
};
exports.BehaviorPatterns = BehaviorPatterns;
const formatTimestamp = (timestamp) => {
    const now = Date.now();
    const diff = now - timestamp;
    if (diff < 60 * 1000) {
        return 'just now';
    }
    else if (diff < 60 * 60 * 1000) {
        const minutes = Math.floor(diff / (60 * 1000));
        return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
    }
    else if (diff < 24 * 60 * 60 * 1000) {
        const hours = Math.floor(diff / (60 * 60 * 1000));
        return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
    }
    else {
        const days = Math.floor(diff / (24 * 60 * 60 * 1000));
        return `${days} day${days !== 1 ? 's' : ''} ago`;
    }
};
