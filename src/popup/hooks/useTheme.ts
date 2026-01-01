// src/popup/hooks/useTheme.ts
import { useState, useEffect } from 'react';
import { chromeApi } from '@/shared/utils/chromeApiSafe';

export const useTheme = () => {
  const [theme, setTheme] = useState<'light' | 'dark' | 'auto'>('auto');

  useEffect(() => {
    // Charger le thème sauvegardé
    chromeApi.storage.local.get(['theme'], (result) => {
      if (result.theme) {
        setTheme(result.theme);
      }
    });
  }, []);

  useEffect(() => {
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

  const saveTheme = (newTheme: typeof theme) => {
    setTheme(newTheme);
    chromeApi.storage.local.set({ theme: newTheme });
  };

  return { theme, setTheme: saveTheme };
};