import React, { useState } from 'react';
import MetricsPanel from './MetricsPanel';
import SettingsPanel from './SettingsPanel';
import OrganismDashboard from './OrganismDashboard';
import Toast from './Toast';
import Loader from './Loader';

const NAV_ITEMS = [
  { key: 'dashboard', label: 'Organisme', icon: '🧬' },
  { key: 'metrics', label: 'Statistiques', icon: '📊' },
  { key: 'settings', label: 'Paramètres', icon: '⚙️' },
];

const App: React.FC = () => {
  const [active, setActive] = useState('dashboard');
  const [toast, setToast] = useState<{message: string, type?: 'success'|'error'|'info'}|null>(null);
  const [loading, setLoading] = useState(false);

  return (
    <div style={{ display: 'flex', minHeight: 400, minWidth: 350, fontFamily: 'Segoe UI, Arial, sans-serif', background: '#181c22', color: '#f0f0f0' }}>
      {/* Navigation latérale */}
      <nav className="navbar">
        <div className="navbar-logo">
          <img src="../assets/icons/icon48.png" alt="SYMBIONT" width={40} height={40} style={{ borderRadius: 8 }} />
        </div>
        {NAV_ITEMS.map(item => (
          <button
            key={item.key}
            onClick={() => setActive(item.key)}
            className={"icon-btn" + (active === item.key ? " active" : "")}
            aria-label={item.label}
            title={item.label}
          >
            {item.icon}
          </button>
        ))}
      </nav>
      {/* Contenu principal */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', padding: 0 }}>
        {active === 'dashboard' && (
          <div className="dashboard-panel panel"><OrganismDashboard /></div>
        )}
        {active === 'metrics' && (
          <div className="metrics-panel panel"><MetricsPanel /></div>
        )}
        {active === 'settings' && (
          <div className="settings-panel panel"><SettingsPanel /></div>
        )}
        {/* Placeholders pour d'autres panels */}
        {['onboarding', 'network'].includes(active) && (
          <div style={{ textAlign: 'center', marginTop: 60, color: '#888' }}>
            <h2>À venir</h2>
            <p>Ce module sera bientôt disponible.</p>
          </div>
        )}
        {/* Loader global */}
        {loading && <Loader />}
        {/* Toast global */}
        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      </main>
    </div>
  );
};

export default App; 