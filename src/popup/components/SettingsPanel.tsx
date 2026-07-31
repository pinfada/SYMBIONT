// src/popup/components/SettingsPanel.tsx
// Page Paramètres fonctionnelle : réglages réels, persistés dans
// chrome.storage.local et câblés au rendu de l'organisme.
import React, { useEffect, useState } from 'react';
import {
  organismPreferences,
  RenderQuality,
  OrganismPreferences,
} from '@shared/services/OrganismPreferences';

const c = {
  accent: '#00e0ff',
  text: '#e1e8ed',
  dim: '#8899a6',
  card: 'rgba(0, 224, 255, 0.04)',
  border: 'rgba(0, 224, 255, 0.15)',
};

const QUALITY_OPTIONS: { value: RenderQuality; label: string; hint: string }[] = [
  { value: 'high', label: 'Élevée', hint: 'Contours ultra-nets (2×)' },
  { value: 'standard', label: 'Standard', hint: 'Équilibré (1.5×)' },
  { value: 'eco', label: 'Éco', hint: 'Économie de batterie (1×)' },
];

const Toggle: React.FC<{ on: boolean; onClick: () => void }> = ({ on, onClick }) => (
  <button
    onClick={onClick}
    aria-pressed={on}
    style={{
      width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer',
      background: on ? c.accent : 'rgba(255,255,255,0.15)',
      position: 'relative', transition: 'background 0.2s ease', flexShrink: 0,
    }}
  >
    <span style={{
      position: 'absolute', top: 2, left: on ? 22 : 2, width: 20, height: 20,
      borderRadius: '50%', background: on ? '#001018' : '#fff', transition: 'left 0.2s ease',
    }} />
  </button>
);

const Row: React.FC<{ title: string; desc: string; children: React.ReactNode }> = ({ title, desc, children }) => (
  <div style={{
    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
    padding: '14px 16px', background: c.card, border: `1px solid ${c.border}`,
    borderRadius: 10, marginBottom: 10,
  }}>
    <div style={{ minWidth: 0 }}>
      <div style={{ color: c.text, fontSize: 14, fontWeight: 600 }}>{title}</div>
      <div style={{ color: c.dim, fontSize: 12, marginTop: 2 }}>{desc}</div>
    </div>
    {children}
  </div>
);

export const SettingsPanel: React.FC = () => {
  const [prefs, setPrefs] = useState<OrganismPreferences>(organismPreferences.get());

  useEffect(() => organismPreferences.subscribe(setPrefs), []);

  const set = (patch: Partial<OrganismPreferences>) => organismPreferences.update(patch);

  return (
    <div>
      <Row title="Réduire les animations" desc="Fige l'organisme (accessibilité, batterie)">
        <Toggle on={prefs.reduceMotion} onClick={() => set({ reduceMotion: !prefs.reduceMotion })} />
      </Row>

      <div style={{
        padding: '14px 16px', background: c.card, border: `1px solid ${c.border}`,
        borderRadius: 10, marginBottom: 10,
      }}>
        <div style={{ color: c.text, fontSize: 14, fontWeight: 600 }}>Qualité du rendu</div>
        <div style={{ color: c.dim, fontSize: 12, margin: '2px 0 10px' }}>
          Netteté de l'organisme vs consommation
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {QUALITY_OPTIONS.map((opt) => {
            const active = prefs.renderQuality === opt.value;
            return (
              <button
                key={opt.value}
                onClick={() => set({ renderQuality: opt.value })}
                title={opt.hint}
                style={{
                  flex: 1, padding: '8px 6px', borderRadius: 8, cursor: 'pointer',
                  fontSize: 12, fontWeight: active ? 600 : 400,
                  background: active ? c.accent : 'transparent',
                  color: active ? '#001018' : c.dim,
                  border: `1px solid ${active ? c.accent : c.border}`,
                  transition: 'all 0.2s ease',
                }}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      <div style={{
        marginTop: 18, padding: 16, background: 'rgba(0,0,0,0.25)',
        border: `1px solid ${c.border}`, borderRadius: 10,
      }}>
        <div style={{ textAlign: 'center', color: c.text, fontSize: 14 }}>
          <span style={{ fontSize: 20 }}>🧬</span> SYMBIONT v1.0.0
        </div>
        <div style={{ textAlign: 'center', color: c.dim, fontSize: 12, marginTop: 4 }}>
          Extension de vie numérique organique — 100 % local, aucune donnée personnelle transmise.
        </div>
      </div>

      <div style={{ marginTop: 14 }}>
        <div style={{ color: c.accent, fontSize: 13, fontWeight: 600, marginBottom: 8 }}>
          💡 Comment utiliser SYMBIONT ?
        </div>
        <ul style={{ margin: 0, paddingLeft: 18, color: c.dim, fontSize: 12, lineHeight: 1.7 }}>
          <li>L'organisme évolue automatiquement pendant votre navigation</li>
          <li>Onglet <strong style={{ color: c.text }}>Organisme</strong> : voir sa forme et son état</li>
          <li>Onglet <strong style={{ color: c.text }}>Stats</strong> : ses métriques d'évolution</li>
          <li>Onglet <strong style={{ color: c.text }}>Social</strong> : transmettre sa lignée</li>
        </ul>
      </div>
    </div>
  );
};

export default SettingsPanel;
