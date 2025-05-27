"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnimatedButton = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
// src/popup/components/ui/AnimatedButton.tsx
const react_1 = require("react");
const AnimatedButton = ({ children, variant = 'primary', size = 'md', loading = false, onClick, ...props }) => {
    const [isAnimating, setIsAnimating] = (0, react_1.useState)(false);
    const handleClick = (e) => {
        if (loading || isAnimating)
            return;
        setIsAnimating(true);
        // Animation effect
        setTimeout(() => {
            setIsAnimating(false);
        }, 300);
        if (onClick) {
            onClick(e);
        }
    };
    return ((0, jsx_runtime_1.jsx)("button", { className: `
        animated-button 
        animated-button--${variant} 
        animated-button--${size}
        ${isAnimating ? 'animated-button--animating' : ''}
        ${loading ? 'animated-button--loading' : ''}
      `, onClick: handleClick, disabled: loading || props.disabled, ...props, children: (0, jsx_runtime_1.jsx)("span", { className: "animated-button__content", children: loading ? ((0, jsx_runtime_1.jsx)("span", { className: "animated-button__spinner" })) : (children) }) }));
};
exports.AnimatedButton = AnimatedButton;
