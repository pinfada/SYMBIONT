"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useTheme = void 0;
// src/popup/hooks/useTheme.ts
const react_1 = require("react");
const useTheme = () => {
    const [theme, setTheme] = (0, react_1.useState)('auto');
    (0, react_1.useEffect)(() => {
        // Charger le thème sauvegardé
        chrome.storage.local.get(['theme'], (result) => {
            if (result.theme) {
                setTheme(result.theme);
            }
        });
    }, []);
    (0, react_1.useEffect)(() => {
        const updateTheme = () => {
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            const activeTheme = theme === 'auto' ? (prefersDark ? 'dark' : 'light') : theme;
            document.documentElement.setAttribute('data-theme', activeTheme);
        };
        updateTheme();
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        mediaQuery.addEventListener('change', updateTheme);
        return () => mediaQuery.removeEventListener('change', updateTheme);
    }, [theme]);
    const saveTheme = (newTheme) => {
        setTheme(newTheme);
        chrome.storage.local.set({ theme: newTheme });
    };
    return { theme, setTheme: saveTheme };
};
exports.useTheme = useTheme;
