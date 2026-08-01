import React, { useState, useCallback, Suspense, lazy, useEffect } from 'react';
import OrganismDashboard from './OrganismDashboard';
import Toast from './Toast';
import ErrorBoundary from './ErrorBoundary';
import { useKeyboardNavigation } from '../hooks/useKeyboardNavigation';
import { logger } from '@shared/utils/secureLogger';
import { SecurityMonitor } from '@shared/security/SecurityMonitor';

// Lazy loading des panneaux lourds pour optimiser le bundle
const MetricsPanel = lazy(() => import('./MetricsPanel'));
const SettingsPanel = lazy(() => import('./SettingsPanel'));
const MysticalPanel = lazy(() => import('./MysticalPanel'));
const SocialPanel = lazy(() => import('./SocialPanel'));
const GlobalNetworkGraph = lazy(() => import('./GlobalNetworkGraph').then(module => ({ default: module.GlobalNetworkGraph })));
const OrganismViewer = lazy(() => import('./OrganismViewer').then(module => ({ default: module.OrganismViewer })));

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

  // Vérifications sécurité
  useEffect(() => {
    // Vérifier le mode verrouillage sécuritaire
    if (SecurityMonitor.isInLockdown()) {
      setToast({
        message: 'Extension en mode sécurisé - Fonctionnalités limitées',
        type: 'error'
      });
    }
  }, []);
  
  // Nom descriptif pour le panel actuel (pour screen readers)
  const getActivePageTitle = (): string => {
    const activeItem = NAV_ITEMS.find(item => item.key === active);
    return activeItem ? `${activeItem.label} - ${activeItem.description}` : 'Contenu principal';
  };

  // Index actuel pour la navigation clavier
  const activeIndex = NAV_ITEMS.findIndex(item => item.key === active);

  // Gestion de la navigation clavier
  const handleTabChange = useCallback((newIndex: number) => {
    const newTab = NAV_ITEMS[newIndex];
    if (newTab) {
      setActive(newTab.key);
      // Annoncer le changement aux lecteurs d'écran
      const announcement = `Navigation vers ${newTab.label}: ${newTab.description}`;
      // Utiliser une région live pour annoncer le changement
      const liveRegion = document.getElementById('navigation-announcer');
      if (liveRegion) {
        liveRegion.textContent = announcement;
      }
    }
  }, []);

  const handleTabActivate = useCallback((index: number) => {
    handleTabChange(index);
  }, [handleTabChange]);

  // Configuration de la navigation clavier
  const { containerProps, getItemProps } = useKeyboardNavigation({
    items: NAV_ITEMS.map((_, index) => `#tab-${NAV_ITEMS[index].key}`),
    activeIndex,
    onActiveIndexChange: handleTabChange,
    onActivate: handleTabActivate,
    circular: true
  });

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
        //window.close();
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
            <ErrorBoundary>
              <div className="organism-display">
                <Suspense fallback={<div className="panel-loading">🧬 Chargement de l&apos;organisme...</div>}>
                  <OrganismViewer />
                </Suspense>
              </div>
            </ErrorBoundary>
            <ErrorBoundary>
              <div className="organism-details">
                <OrganismDashboard />
              </div>
            </ErrorBoundary>
          </div>
        );
      case 'network':
        return (
          <div className="content-panel">
            <div className="panel-header">
              <h2>🌐 Réseau Global</h2>
              <p>Explorez la constellation SYMBIONT</p>
            </div>
            <ErrorBoundary>
              <Suspense fallback={<div className="panel-loading">🌐 Chargement du réseau global...</div>}>
                <div className="network-container">
                  <GlobalNetworkGraph />
                </div>
              </Suspense>
            </ErrorBoundary>
          </div>
        );
      case 'metrics':
        return (
          <div className="content-panel">
            <div className="panel-header">
              <h2>📊 Statistiques</h2>
              <p>Analytics de votre organisme</p>
            </div>
            <ErrorBoundary>
              <Suspense fallback={<div className="panel-loading">📊 Chargement des statistiques...</div>}>
                <MetricsPanel />
              </Suspense>
            </ErrorBoundary>
          </div>
        );
      case 'mystical':
        return (
          <div className="content-panel">
            <div className="panel-header">
              <h2>✨ Rituels</h2>
              <p>Fonctions mystiques et évolution</p>
            </div>
            <ErrorBoundary>
              <Suspense fallback={<div className="panel-loading">🔮 Chargement des rituels...</div>}>
                <MysticalPanel />
              </Suspense>
            </ErrorBoundary>
          </div>
        );
      case 'social':
        return (
          <div className="content-panel">
            <div className="panel-header">
              <h2>👥 Social</h2>
              <p>Partagez et invitez</p>
            </div>
            <ErrorBoundary>
              <Suspense fallback={<div className="panel-loading">👥 Chargement du panneau social...</div>}>
                <SocialPanel />
              </Suspense>
            </ErrorBoundary>
          </div>
        );
      case 'settings':
        return (
          <div className="content-panel">
            <div className="panel-header">
              <h2>⚙️ Paramètres</h2>
              <p>Personnalisez votre expérience</p>
            </div>
            <ErrorBoundary>
              <Suspense fallback={<div className="panel-loading">⚙️ Chargement des paramètres...</div>}>
                <SettingsPanel />
              </Suspense>
            </ErrorBoundary>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="symbiont-app" role="application" aria-label="SYMBIONT - Extension de bureau">
      {/* Skip to main content link */}
      <a href="#main-content" className="skip-link">
        Aller au contenu principal
      </a>
      
      {/* Header avec logo et titre */}
      <header className="app-header" role="banner">
        <div className="logo-section">
          <span style={{ fontSize: '24px', marginRight: '8px' }}>🧬</span>
          <h1 className="app-title">SYMBIONT</h1>
        </div>
        <div className="header-controls">
          <div 
            className="connection-status" 
            role="status" 
            aria-live="polite"
            aria-label="État de connexion"
          >
            <span 
              className="status-dot" 
              aria-hidden="true"
            ></span>
            <span className="status-text">Connecté</span>
          </div>
          <button 
            onClick={openInWindow}
            className="expand-button"
            aria-label="Ouvrir en fenêtre redimensionnable pour une meilleure accessibilité"
            type="button"
          >
            <span aria-hidden="true">🔍</span>
            <span className="sr-only">Agrandir</span>
          </button>
        </div>
      </header>

      {/* Navigation par onglets avec navigation clavier améliorée */}
      <nav 
        {...containerProps}
        className="tab-navigation" 
        aria-label="Navigation principale de l'application"
      >
        {NAV_ITEMS.map((item, index) => (
          <button
            key={item.key}
            onClick={() => handleTabChange(index)}
            className={`nav-tab ${active === item.key ? 'active' : ''}`}
            {...getItemProps(index)}
            type="button"
          >
            <span className="tab-icon" aria-hidden="true">{item.icon}</span>
            <span className="tab-label">{item.label}</span>
            <span className="sr-only"> - {item.description}</span>
          </button>
        ))}
      </nav>

      {/* Région live pour les annonces de navigation */}
      <div 
        id="navigation-announcer"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      ></div>

      {/* Contenu principal */}
      <main 
        className="main-content" 
        id="main-content"
        role="main"
        aria-label={getActivePageTitle()}
        tabIndex={-1}
      >
        <div 
          role="tabpanel" 
          id={`panel-${active}`}
          aria-labelledby={`tab-${active}`}
        >
          {renderContent()}
        </div>
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