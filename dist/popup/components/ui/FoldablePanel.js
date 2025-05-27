"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FoldablePanel = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
// src/popup/components/ui/FoldablePanel.tsx
const react_1 = require("react");
const FoldablePanel = ({ title, children, defaultOpen = false, className = '' }) => {
    const [isOpen, setIsOpen] = (0, react_1.useState)(defaultOpen);
    return ((0, jsx_runtime_1.jsxs)("div", { className: `foldable-panel ${className} ${isOpen ? 'foldable-panel--open' : ''}`, children: [(0, jsx_runtime_1.jsxs)("button", { className: "foldable-panel__header", onClick: () => setIsOpen(!isOpen), children: [(0, jsx_runtime_1.jsx)("h3", { className: "foldable-panel__title", children: title }), (0, jsx_runtime_1.jsx)("span", { className: "foldable-panel__icon", children: isOpen ? '▼' : '►' })] }), (0, jsx_runtime_1.jsx)("div", { className: "foldable-panel__content", children: children })] }));
};
exports.FoldablePanel = FoldablePanel;
