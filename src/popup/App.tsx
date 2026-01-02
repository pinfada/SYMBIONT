// src/popup/App.tsx
import React, { useState, useEffect, Suspense } from 'react';
import { logger } from '@shared/utils/secureLogger';

// Import des composants
import { UnifiedOrganismViewer } from './components/UnifiedOrganismViewer';
import { OrganismNutrition } from './components/OrganismNutrition';
import OrganismControl from './components/OrganismControl';
import { GlobalNetworkGraph } from './components/GlobalNetworkGraph';
import MetricsPanel from './components/MetricsPanel';
import MysticalPanel from './components/MysticalPanel';
import SocialPanel from './components/SocialPanel';
import SettingsPanel from './components/SettingsPanel';

type ViewType = 'organism' | 'network' | 'metrics' | 'mystical' | 'social' | 'settings';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<ViewType>('organism');

  useEffect(() => {
    logger.info('SYMBIONT Popup initialized');
  }, []);

  const navButtons = [
    { id: 'organism', label: 'Organisme', icon: '🧬', view: 'organism' as ViewType },
    { id: 'network', label: 'Réseau', icon: '🌐', view: 'network' as ViewType },
    { id: 'metrics', label: 'Stats', icon: '📊', view: 'metrics' as ViewType },
    { id: 'mystical', label: 'Rituels', icon: '✨', view: 'mystical' as ViewType },
    { id: 'social', label: 'Social', icon: '👥', view: 'social' as ViewType },
    { id: 'settings', label: 'Params', icon: '⚙️', view: 'settings' as ViewType },
  ];

  const appStyles = {
    container: {
      width: '400px',
      height: '600px',
      backgroundColor: '#0f1419',
      color: '#e1e8ed',
      display: 'flex',
      flexDirection: 'column' as const,
      fontFamily: 'system-ui, -apple-system, sans-serif',
      overflow: 'hidden'
    },
    header: {
      padding: '12px 16px',
      background: 'linear-gradient(180deg, #1a1f2e 0%, #0f1419 100%)',
      borderBottom: '1px solid rgba(0, 224, 255, 0.1)',
      display: 'flex',
      alignItems: 'center',
      gap: '8px'
    },
    logo: {
      fontSize: '20px',
      display: 'flex',
      alignItems: 'center',
      gap: '8px'
    },
    title: {
      fontSize: '16px',
      fontWeight: '600',
      background: 'linear-gradient(135deg, #00e0ff 0%, #4fc3f7 100%)',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      backgroundClip: 'text'
    },
    nav: {
      display: 'flex',
      padding: '0 8px',
      gap: '2px',
      backgroundColor: '#0a0d13',
      borderBottom: '1px solid rgba(0, 224, 255, 0.1)',
      overflowX: 'auto' as const,
      scrollbarWidth: 'none' as const
    },
    navButton: (isActive: boolean) => ({
      padding: '10px 12px',
      backgroundColor: isActive ? 'rgba(0, 224, 255, 0.1)' : 'transparent',
      color: isActive ? '#00e0ff' : '#8899a6',
      border: 'none',
      borderBottom: isActive ? '2px solid #00e0ff' : '2px solid transparent',
      cursor: 'pointer',
      fontSize: '11px',
      fontWeight: '500',
      transition: 'all 0.2s ease',
      display: 'flex',
      flexDirection: 'column' as const,
      alignItems: 'center',
      gap: '4px',
      minWidth: '60px',
      textTransform: 'uppercase' as const,
      letterSpacing: '0.5px'
    }),
    navIcon: {
      fontSize: '16px'
    },
    content: {
      flex: 1,
      overflow: 'auto',
      backgroundColor: '#0f1419',
      padding: '16px'
    },
    loadingContainer: {
      display: 'flex',
      flexDirection: 'column' as const,
      alignItems: 'center',
      justifyContent: 'center',
      height: '200px',
      gap: '12px'
    },
    loadingSpinner: {
      width: '40px',
      height: '40px',
      border: '3px solid rgba(0, 224, 255, 0.1)',
      borderTop: '3px solid #00e0ff',
      borderRadius: '50%',
      animation: 'spin 1s linear infinite'
    },
    sectionTitle: {
      fontSize: '18px',
      fontWeight: '600',
      marginBottom: '16px',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      color: '#00e0ff'
    }
  };

  const LoadingComponent = ({ message }: { message: string }) => (
    <div style={appStyles.loadingContainer}>
      <div style={appStyles.loadingSpinner} />
      <div style={{ color: '#8899a6', fontSize: '13px' }}>{message}</div>
    </div>
  );

  const renderContent = () => {
    switch (currentView) {
      case 'organism':
        return (
          <div>
            <h2 style={appStyles.sectionTitle}>
              <span>🧬</span>
              <span>Votre Organisme Digital</span>
            </h2>
            <UnifiedOrganismViewer />
            <div style={{ marginTop: '20px' }}>
              <OrganismNutrition />
            </div>
            <div style={{ marginTop: '20px' }}>
              <OrganismControl />
            </div>
          </div>
        );

      case 'network':
        return (
          <div>
            <h2 style={appStyles.sectionTitle}>
              <span>🌐</span>
              <span>Réseau Global SYMBIONT</span>
            </h2>
            <Suspense fallback={<LoadingComponent message="Connexion au réseau..." />}>
              <GlobalNetworkGraph />
            </Suspense>
          </div>
        );

      case 'metrics':
        return (
          <div>
            <h2 style={appStyles.sectionTitle}>
              <span>📊</span>
              <span>Statistiques & Métriques</span>
            </h2>
            <Suspense fallback={<LoadingComponent message="Analyse des données..." />}>
              <MetricsPanel />
            </Suspense>
          </div>
        );

      case 'mystical':
        return (
          <div>
            <h2 style={appStyles.sectionTitle}>
              <span>✨</span>
              <span>Rituels Mystiques</span>
            </h2>
            <Suspense fallback={<LoadingComponent message="Préparation des rituels..." />}>
              <MysticalPanel />
            </Suspense>
          </div>
        );

      case 'social':
        return (
          <div>
            <h2 style={appStyles.sectionTitle}>
              <span>👥</span>
              <span>Connexions Sociales</span>
            </h2>
            <Suspense fallback={<LoadingComponent message="Chargement du réseau social..." />}>
              <SocialPanel />
            </Suspense>
          </div>
        );

      case 'settings':
        return (
          <div>
            <h2 style={appStyles.sectionTitle}>
              <span>⚙️</span>
              <span>Paramètres</span>
            </h2>
            <Suspense fallback={<LoadingComponent message="Chargement des paramètres..." />}>
              <SettingsPanel />
            </Suspense>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div style={appStyles.container}>
      {/* Header avec logo et titre */}
      <div style={appStyles.header}>
        <div style={appStyles.logo}>
          <span>🧬</span>
          <span style={appStyles.title}>SYMBIONT</span>
        </div>
      </div>

      {/* Navigation */}
      <nav style={appStyles.nav}>
        {navButtons.map((btn) => (
          <button
            key={btn.id}
            onClick={() => setCurrentView(btn.view)}
            style={appStyles.navButton(currentView === btn.view)}
            onMouseEnter={(e) => {
              if (currentView !== btn.view) {
                e.currentTarget.style.backgroundColor = 'rgba(0, 224, 255, 0.05)';
                e.currentTarget.style.color = '#4fc3f7';
              }
            }}
            onMouseLeave={(e) => {
              if (currentView !== btn.view) {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = '#8899a6';
              }
            }}
          >
            <span style={appStyles.navIcon}>{btn.icon}</span>
            <span>{btn.label}</span>
          </button>
        ))}
      </nav>

      {/* Contenu principal */}
      <div style={appStyles.content}>
        {renderContent()}
      </div>

      {/* Styles globaux pour l'animation */}
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        /* Scrollbar personnalisée */
        div::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }

        div::-webkit-scrollbar-track {
          background: rgba(0, 224, 255, 0.05);
          border-radius: 4px;
        }

        div::-webkit-scrollbar-thumb {
          background: rgba(0, 224, 255, 0.2);
          border-radius: 4px;
        }

        div::-webkit-scrollbar-thumb:hover {
          background: rgba(0, 224, 255, 0.3);
        }
      `}</style>
    </div>
  );
};

export default App;