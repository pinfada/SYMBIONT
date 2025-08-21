import React, { useState } from 'react';
import MetricsPanel from './MetricsPanel';
import SettingsPanel from './SettingsPanel';
import OrganismDashboard from './OrganismDashboard';
import Toast from './Toast';
import MysticalPanel from './MysticalPanel';
import SocialPanel from './SocialPanel';
import { GlobalNetworkGraph } from './GlobalNetworkGraph';
import { OrganismViewer } from './OrganismViewer';
import { logger } from '@shared/utils/secureLogger';

const NAV_ITEMS = [
  { key: 'dashboard', label: 'Organisme', icon: '🧬', description: 'Votre organisme digital' },
  { key: 'network', label: 'Réseau', icon: '🌐', description: 'Réseau global SYMBIONT' },
  { key: 'metrics', label: 'Statistiques', icon: '📊', description: 'Analytics et métriques' },
  { key: 'mystical', label: 'Rituels', icon: '✨', description: 'Fonctions mystiques' },
  { key: 'social', label: 'Social', icon: '👥', description: 'Invitations et partage' },
  { key: 'settings', label: 'Paramètres', icon: '⚙️', description: 'Configuration' },
];

const App: React.FC = () => {
  const [active, setActive] = useState('dashboard');
  const [toast, setToast] = useState<{message: string, type?: 'success'|'error'|'info'}|null>(null);

  // Ouvrir en fenêtre redimensionnable
  const openInWindow = () => {
    if (typeof chrome !== 'undefined' && chrome.windows) {
      try {
        chrome.windows.create({
          url: chrome.runtime.getURL('popup.html'),
          type: 'popup',
          width: 800,
          height: 700,
          focused: true
        });
        // Fermer le popup actuel
        window.close();
      } catch (_error) {
        logger.warn('Impossible d\'ouvrir en fenêtre:', _error);
        setToast({ 
          message: 'Ouverture en fenêtre non disponible dans ce contexte', 
          type: 'info' 
        });
      }
    } else {
      setToast({ 
        message: 'Fonctionnalité disponible uniquement dans l\'extension Chrome', 
        type: 'info' 
      });
    }
  };

  const renderContent = () => {
    switch (active) {
      case 'dashboard':
        return (
          <div className="content-panel">
            <div className="panel-header">
              <h2>🧬 Votre Organisme</h2>
              <p>Explorez votre créature digitale en évolution</p>
            </div>
            <div className="organism-display">
              <OrganismViewer />
            </div>
            <div className="organism-details">
              <OrganismDashboard />
            </div>
          </div>
        );
      case 'network':
        return (
          <div className="content-panel">
            <div className="panel-header">
              <h2>🌐 Réseau Global</h2>
              <p>Explorez la constellation SYMBIONT</p>
            </div>
            <div className="network-container">
              <GlobalNetworkGraph />
            </div>
          </div>
        );
      case 'metrics':
        return (
          <div className="content-panel">
            <div className="panel-header">
              <h2>📊 Statistiques</h2>
              <p>Analytics de votre organisme</p>
            </div>
            <MetricsPanel />
          </div>
        );
      case 'mystical':
        return (
          <div className="content-panel">
            <div className="panel-header">
              <h2>✨ Rituels</h2>
              <p>Fonctions mystiques et évolution</p>
            </div>
            <MysticalPanel />
          </div>
        );
      case 'social':
        return (
          <div className="content-panel">
            <div className="panel-header">
              <h2>👥 Social</h2>
              <p>Partagez et invitez</p>
            </div>
            <SocialPanel />
          </div>
        );
      case 'settings':
        return (
          <div className="content-panel">
            <div className="panel-header">
              <h2>⚙️ Paramètres</h2>
              <p>Personnalisez votre expérience</p>
            </div>
            <SettingsPanel />
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="symbiont-app">
      {/* Header avec logo et titre */}
      <header className="app-header">
        <div className="logo-section">
          <img src="../assets/icons/icon48.png" alt="SYMBIONT" width={24} height={24} />
          <span className="app-title">SYMBIONT</span>
        </div>
        <div className="header-controls">
          <div className="connection-status">
            <span className="status-dot"></span>
            <span className="status-text">Connecté</span>
          </div>
          <button 
            onClick={openInWindow}
            className="expand-button"
            title="Ouvrir en fenêtre redimensionnable (accessibilité)"
          >
            🔍
          </button>
        </div>
      </header>

      {/* Navigation par onglets */}
      <nav className="tab-navigation">
        {NAV_ITEMS.map(item => (
          <button
            key={item.key}
            onClick={() => setActive(item.key)}
            className={`nav-tab ${active === item.key ? 'active' : ''}`}
            title={item.description}
          >
            <span className="tab-icon">{item.icon}</span>
            <span className="tab-label">{item.label}</span>
          </button>
        ))}
      </nav>

      {/* Contenu principal */}
      <main className="main-content">
        {renderContent()}
      </main>

      {/* Toast notifications */}
      {toast && (
        <Toast
          message={toast.message}
          type={(toast.type || 'info') as 'success' | 'error' | 'info'}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
};

export default App; 