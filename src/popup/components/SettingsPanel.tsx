// src/popup/components/SettingsPanel.tsx
import React from 'react';

export const SettingsPanel: React.FC = () => {
  return (
    <div className="ext-settings-panel max-w-lg mx-auto p-6 bg-white rounded-xl shadow-lg mt-8">
      <h2 className="text-2xl font-bold text-center text-[#00e0ff] mb-6">Paramètres</h2>

      {/* Info */}
      <div className="p-6 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg border border-blue-200">
        <p className="text-lg text-blue-700 text-center mb-4">
          <span className="text-2xl">🧬</span> SYMBIONT v1.0.0
        </p>
        <p className="text-sm text-blue-600 text-center">
          Extension de vie numérique organique
        </p>
        <div className="mt-4 pt-4 border-t border-blue-200">
          <p className="text-xs text-gray-600 text-center">
            Actuellement, il n'y a aucun paramètre configurable.
            <br />
            L'extension fonctionne automatiquement en arrière-plan.
          </p>
        </div>
      </div>

      {/* Instructions */}
      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <h3 className="font-semibold text-gray-700 mb-2">💡 Comment utiliser SYMBIONT ?</h3>
        <ul className="space-y-2 text-sm text-gray-600">
          <li>• L'organisme numérique évolue automatiquement</li>
          <li>• Consultez l'onglet <strong>Organisme</strong> pour voir son état</li>
          <li>• Visitez l'onglet <strong>Stats</strong> pour les métriques</li>
          <li>• L'onglet <strong>Social</strong> permet le partage d'organismes</li>
        </ul>
      </div>
    </div>
  );
};

export default SettingsPanel;