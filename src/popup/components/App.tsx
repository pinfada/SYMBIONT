import React, { useState } from 'react';
import MetricsPanel from './MetricsPanel';
import SettingsPanel from './SettingsPanel';
import OrganismDashboard from './OrganismDashboard';
import Toast from './Toast';
import MysticalPanel from './MysticalPanel';
import ResiliencePanel from './ResiliencePanel';
import SocialPanel from './SocialPanel';
import { GlobalNetworkGraph } from './GlobalNetworkGraph';
// @ts-expect-error Import réservé pour usage futur
import { MessageBus } from '../../core/messaging/MessageBus';
// @ts-expect-error Import réservé pour usage futur
import { OrganismViewer } from './OrganismViewer';

const NAV_ITEMS = [
  { key: 'dashboard', label: 'Organisme', icon: '🧬' },
  { key: 'metrics', label: 'Statistiques', icon: '📊' },
  { key: 'settings', label: 'Paramètres', icon: '⚙️' },
  { key: 'network', label: 'Réseau', icon: '🌐' },
];

const App: React.FC = () => {
  const [active, setActive] = useState('dashboard');
  const [toast, setToast] = useState<{message: string, type?: 'success'|'error'|'info'}|null>(null);
  const [networkNodeCount, setNetworkNodeCount] = useState(0);

  return (
    <div style={{ display: 'flex', minHeight: 400, minWidth: 350, fontFamily: 'Segoe UI, Arial, sans-serif', background: '#181c22', color: '#f0f0f0' }}>
      {/* Navigation latérale */}
      <nav className="ext-navbar">
        <div className="ext-navbar-logo">
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
        <nav style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
          <button onClick={() => setActive('dashboard')} data-testid="nav-dashboard" aria-label="Dashboard">Dashboard</button>
          <button onClick={() => setActive('network')} data-testid="nav-network" aria-label="Réseau">Réseau</button>
          <button onClick={() => setActive('onboarding')} data-testid="nav-onboarding" aria-label="Onboarding">Onboarding</button>
          <button onClick={() => setActive('prediction')} data-testid="nav-prediction" aria-label="Prédiction">Prédiction</button>
          <button onClick={() => setActive('mystical')} data-testid="nav-mystical" aria-label="Rituels">Rituels</button>
          <button onClick={() => setActive('resilience')} data-testid="nav-resilience" aria-label="Monitoring">Monitoring</button>
          <button onClick={() => setActive('social')} data-testid="nav-social" aria-label="Inviter">Inviter</button>
        </nav>
        {active === 'dashboard' && (
          <div className="ext-dashboard-panel ext-panel" data-testid="dashboard-panel">
            <h2 data-testid="dashboard-title">Dashboard|Tableau de bord</h2>
            <p>Bienvenue sur le dashboard principal de Symbiont.</p>
            <section style={{margin: '20px 0'}}>
              <h3>État de l'organisme</h3>
              <ul>
                <li>Connexions réseau : <strong>{networkNodeCount}</strong></li>
                <li>Modules actifs : <strong>Intelligence, Social, Monitoring</strong></li>
                <li>Statut du réseau : <span style={{color: '#4caf50'}}>Connecté</span></li>
              </ul>
            </section>
            <section style={{margin: '20px 0'}}>
              <h3>Accès rapide</h3>
              <button onClick={() => setActive('network')} style={{marginRight: 10}}>Voir le réseau</button>
              <button onClick={() => setActive('metrics')} style={{marginRight: 10}}>Statistiques</button>
              <button onClick={() => setActive('settings')}>Paramètres</button>
              <button onClick={() => setActive('prediction')} style={{marginLeft: 10}}>Prédiction</button>
              <button onClick={() => setActive('mystical')} style={{marginLeft: 10}}>Rituels</button>
              <button onClick={() => setActive('resilience')} style={{marginLeft: 10}}>Monitoring</button>
              <button onClick={() => setActive('social')} style={{marginLeft: 10}}>Inviter</button>
            </section>
            <section style={{margin: '20px 0', color: '#888'}}>
              <em>Votre organisme évolue en symbiose avec le réseau.</em>
            </section>
            <section style={{margin: '20px 0'}}>
              <OrganismDashboard />
            </section>
          </div>
        )}
        {active === 'metrics' && (
          <div className="ext-metrics-panel ext-panel"><MetricsPanel /></div>
        )}
        {active === 'settings' && (
          <div className="ext-settings-panel ext-panel"><SettingsPanel /></div>
        )}
        {active === 'network' && (
          <div className="network-panel panel" data-testid="network-panel">
            <GlobalNetworkGraph onNodeCountChange={setNetworkNodeCount} />
          </div>
        )}
        {active === 'onboarding' && (
          <div className="onboarding-panel panel">
            <OnboardingPanel />
          </div>
        )}
        {active === 'prediction' && (
          <div className="prediction-panel panel"><PredictionPanel /></div>
        )}
        {active === 'mystical' && (
          <div className="mystical-panel panel"><MysticalPanel /></div>
        )}
        {active === 'resilience' && (
          <div className="resilience-panel panel"><ResiliencePanel /></div>
        )}
        {active === 'social' && (
          <div className="social-panel panel"><SocialPanel /></div>
        )}
        {/* Placeholders pour d'autres panels */}
        {['onboarding', 'network'].includes(active) && (
          <div style={{ textAlign: 'center', marginTop: 60, color: '#888' }}>
            <h2>À venir</h2>
            <p>Ce module sera bientôt disponible.</p>
          </div>
        )}
        {/* Toast global */}
        {toast && (
          <Toast
            message={toast.message}
            type={(toast.type || 'info') as 'success' | 'error' | 'info'}
            onClose={() => setToast(null)}
          />
        )}
      </main>
    </div>
  );
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const OnboardingPanel = () => <div>Onboarding à venir...</div>;
// eslint-disable-next-line @typescript-eslint/no-unused-vars  
const PredictionPanel = () => <div>Prédiction à venir...</div>;

export default App; 