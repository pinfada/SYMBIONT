// src/popup/components/SettingsPanel.tsx
import React, { useEffect, useState } from 'react';

export const SettingsPanel: React.FC = () => {
  // Protection anti-fingerprinting : active par défaut (posture privacy-first).
  const [fpProtection, setFpProtection] = useState(true);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      chrome.storage?.local?.get(['symbiont_fp_protection'], (res) => {
        setFpProtection(res?.symbiont_fp_protection !== false);
        setLoaded(true);
      });
    } catch {
      setLoaded(true);
    }
  }, []);

  const toggleFp = () => {
    const next = !fpProtection;
    setFpProtection(next);
    try {
      chrome.storage?.local?.set({ symbiont_fp_protection: next });
    } catch { /* contexte non-extension */ }
  };

  return (
    <div className="ext-settings-panel max-w-lg mx-auto p-6 bg-white rounded-xl shadow-lg mt-8">
      <h2 className="text-2xl font-bold text-center text-[#00e0ff] mb-6">Paramètres</h2>

      {/* Protection anti-fingerprinting */}
      <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="font-semibold text-gray-800">🛡️ Protection anti-fingerprinting</h3>
            <p className="text-xs text-gray-600 mt-1">
              Rend ton empreinte de navigateur fausse et différente sur chaque site
              (canvas, WebGL, audio), sans casser les pages. Casse le pistage par
              corrélation entre sites. Recommandé.
            </p>
          </div>
          <button
            role="switch"
            aria-checked={fpProtection}
            onClick={toggleFp}
            disabled={!loaded}
            data-testid="fp-protection-toggle"
            style={{
              flex: '0 0 auto', width: 46, height: 26, borderRadius: 13, border: 'none',
              cursor: loaded ? 'pointer' : 'default', position: 'relative',
              background: fpProtection ? '#00c176' : '#c9ced6', transition: 'background .2s'
            }}
          >
            <span style={{
              position: 'absolute', top: 3, left: fpProtection ? 23 : 3, width: 20, height: 20,
              borderRadius: '50%', background: '#fff', transition: 'left .2s',
              boxShadow: '0 1px 3px rgba(0,0,0,0.3)'
            }} />
          </button>
        </div>
        <p className="text-[11px] text-gray-400 mt-2">
          Si un site casse (rare), désactive ce réglage.
        </p>
      </div>

      {/* Info */}
      <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg border border-blue-200">
        <p className="text-lg text-blue-700 text-center mb-2">
          <span className="text-2xl">🧬</span> SYMBIONT v1.0.0
        </p>
        <p className="text-sm text-blue-600 text-center">
          L&apos;organisme perçoit la structure invisible du web et te prévient seul.
        </p>
      </div>

      {/* Instructions */}
      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <h3 className="font-semibold text-gray-700 mb-2">💡 Comment ça marche ?</h3>
        <ul className="space-y-2 text-sm text-gray-600">
          <li>• L&apos;organisme évolue automatiquement selon ta navigation</li>
          <li>• Onglet <strong>Vigilance</strong> : infrastructures de surveillance perçues</li>
          <li>• Il te <strong>chuchote dans la page</strong> quand il détecte fingerprinting, script obfusqué, cadre invisible…</li>
          <li>• Rien à cliquer au quotidien : il décide seul quand parler</li>
        </ul>
      </div>
    </div>
  );
};

export default SettingsPanel;
