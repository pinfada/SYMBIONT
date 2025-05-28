import React, { useState } from 'react';
import MetricsPanel from './MetricsPanel';
import SettingsPanel from './SettingsPanel';
import OrganismDashboard from './OrganismDashboard';

const NAV_ITEMS = [
  { key: 'dashboard', label: 'Organisme', icon: '🧬' },
  { key: 'metrics', label: 'Statistiques', icon: '📊' },
  { key: 'settings', label: 'Paramètres', icon: '⚙️' },
];

const App: React.FC = () => {
  const [active, setActive] = useState('dashboard');

  return (
    <div style={{ display: 'flex', minHeight: 400, minWidth: 350, fontFamily: 'Segoe UI, Arial, sans-serif', background: '#181c22', color: '#f0f0f0' }}>
      {/* Navigation latérale */}
      <nav style={{ width: 80, background: '#10101a', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px 0', borderRight: '1px solid #222' }}>
        <div style={{ marginBottom: 32 }}>
          <img src="../assets/icons/icon48.png" alt="SYMBIONT" width={40} height={40} style={{ borderRadius: 8 }} />
        </div>
        {NAV_ITEMS.map(item => (
          <button
            key={item.key}
            onClick={() => setActive(item.key)}
            style={{
              background: active === item.key ? '#00e0ff' : 'transparent',
              color: active === item.key ? '#181c22' : '#f0f0f0',
              border: 'none',
              borderRadius: 8,
              margin: '8px 0',
              padding: 12,
              width: 48,
              height: 48,
              fontSize: 24,
              cursor: 'pointer',
              transition: 'background 0.2s, color 0.2s',
            }}
            aria-label={item.label}
            title={item.label}
          >
            {item.icon}
          </button>
        ))}
      </nav>
      {/* Contenu principal */}
      <main style={{ flex: 1, padding: 24, minHeight: 400 }}>
        {active === 'dashboard' && (
          <OrganismDashboard />
        )}
        {active === 'metrics' && (
          <MetricsPanel />
        )}
        {active === 'settings' && (
          <SettingsPanel />
        )}
        {/* Placeholders pour d'autres panels */}
        {['onboarding', 'network'].includes(active) && (
          <div style={{ textAlign: 'center', marginTop: 60, color: '#888' }}>
            <h2>À venir</h2>
            <p>Ce module sera bientôt disponible.</p>
          </div>
        )}
      </main>
    </div>
  );
};

export default App; 