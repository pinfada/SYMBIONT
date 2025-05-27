"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Tooltip = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
// src/popup/components/ui/Tooltip.tsx
const react_1 = require("react");
const Tooltip = ({ content, children, position = 'top', delay = 300 }) => {
    const [isVisible, setIsVisible] = (0, react_1.useState)(false);
    const [coords, setCoords] = (0, react_1.useState)({ x: 0, y: 0 });
    const targetRef = (0, react_1.useRef)(null);
    const timeoutRef = (0, react_1.useRef)(null);
    const showTooltip = () => {
        if (timeoutRef.current) {
            window.clearTimeout(timeoutRef.current);
        }
        timeoutRef.current = window.setTimeout(() => {
            if (targetRef.current) {
                const rect = targetRef.current.getBoundingClientRect();
                let x = rect.left + rect.width / 2;
                let y = rect.top;
                switch (position) {
                    case 'bottom':
                        y = rect.bottom;
                        break;
                    case 'left':
                        x = rect.left;
                        y = rect.top + rect.height / 2;
                        break;
                    case 'right':
                        x = rect.right;
                        y = rect.top + rect.height / 2;
                        break;
                    default: // top
                        break;
                }
                setCoords({ x, y });
                setIsVisible(true);
            }
        }, delay);
    };
    const hideTooltip = () => {
        if (timeoutRef.current) {
            window.clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
        }
        setIsVisible(false);
    };
    (0, react_1.useEffect)(() => {
        return () => {
            if (timeoutRef.current) {
                window.clearTimeout(timeoutRef.current);
            }
        };
    }, []);
    return ((0, jsx_runtime_1.jsxs)("div", { className: "tooltip-container", ref: targetRef, onMouseEnter: showTooltip, onMouseLeave: hideTooltip, onFocus: showTooltip, onBlur: hideTooltip, children: [children, isVisible && ((0, jsx_runtime_1.jsx)("div", { className: `tooltip tooltip--${position}`, style: {
                    '--tooltip-x': `${coords.x}px`,
                    '--tooltip-y': `${coords.y}px`
                }, children: (0, jsx_runtime_1.jsx)("div", { className: "tooltip__content", children: content }) }))] }));
};
exports.Tooltip = Tooltip;
