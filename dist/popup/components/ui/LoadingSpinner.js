"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LoadingSpinner = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const LoadingSpinner = ({ size = 'medium', color }) => {
    return ((0, jsx_runtime_1.jsx)("div", { className: `loading-spinner loading-spinner--${size}`, style: color ? { borderTopColor: color } : undefined, "data-testid": "loading-spinner" }));
};
exports.LoadingSpinner = LoadingSpinner;
