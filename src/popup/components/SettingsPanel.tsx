// src/popup/components/SettingsPanel.tsx
import React from 'react';
import { useTheme } from '../hooks/useTheme';

export const SettingsPanel: React.FC = () => {
  const { theme, setTheme } = useTheme();

  return (
    <div className="ext-settings-panel max-w-lg mx-auto p-6 bg-white rounded-xl shadow-lg mt-8">
      <h2 className="text-2xl font-bold text-center text-[#00e0ff] mb-6">Paramètres</h2>

      {/* Section Thème */}
      <section className="ext-settings-section">
        <h3 className="text-lg font-bold text-[#00e0ff] mb-4">🎨 Thème de l'interface</h3>
        <div className="flex gap-4 justify-center">
          <button
            onClick={() => setTheme('light')}
            className={`rounded-lg px-4 py-2 font-bold transition-all ${
              theme === 'light'
                ? 'bg-[#00e0ff] text-[#181c22] shadow-lg scale-105'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300 hover:scale-105'
            }`}
          >
            ☀️ Clair
          </button>
          <button
            onClick={() => setTheme('dark')}
            className={`rounded-lg px-4 py-2 font-bold transition-all ${
              theme === 'dark'
                ? 'bg-[#00e0ff] text-[#181c22] shadow-lg scale-105'
                : 'bg-gray-700 text-white hover:bg-gray-600 hover:scale-105'
            }`}
          >
            🌙 Sombre
          </button>
          <button
            onClick={() => setTheme('auto')}
            className={`rounded-lg px-4 py-2 font-bold transition-all ${
              theme === 'auto'
                ? 'bg-[#00e0ff] text-[#181c22] shadow-lg scale-105'
                : 'bg-gray-500 text-white hover:bg-gray-400 hover:scale-105'
            }`}
          >
            🔄 Auto
          </button>
        </div>
        <p className="mt-4 text-sm text-gray-600 text-center">
          Le thème <strong>Auto</strong> s'adapte automatiquement aux préférences de votre système
        </p>
      </section>

      {/* Info footer */}
      <div className="mt-8 p-4 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg border border-blue-200">
        <p className="text-sm text-blue-700 text-center">
          <span className="text-lg">🧬</span> SYMBIONT v1.0.0 - Extension de vie numérique organique
        </p>
      </div>
    </div>
  );
};

export default SettingsPanel;