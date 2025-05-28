// src/popup/App.tsx
import React, { useState } from 'react';
import { OrganismDashboard } from './components/OrganismDashboard';
import { OrganismViewer } from './components/OrganismViewer';
import { MetricsPanel } from './components/MetricsPanel';
import { SettingsPanel } from './components/SettingsPanel';
import { useTheme } from './hooks/useTheme';
import { MessageBusProvider } from './hooks/MessageBusContext';
import { InvitationLanding } from './components/InvitationLanding';
import { MurmureNotification } from './components/MurmureNotification';
import { SharedMutationRitual } from './components/SharedMutationRitual';
import { CollectiveWakeRitual } from './components/CollectiveWakeRitual';
import { ContextualInvitationNotification } from './components/ContextualInvitationNotification';
import { SecretRitualInput } from './components/SecretRitualInput';
import { SecretRitualNotification } from './components/SecretRitualNotification';
import { GlobalNetworkGraph } from './components/GlobalNetworkGraph';
import { OnboardingWizard } from './components/OnboardingWizard';
import { AdminRitualsPanel } from './components/AdminRitualsPanel';

type TabType = 'organism' | 'metrics' | 'settings' | 'rituals' | 'network' | 'admin';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('organism');
  const { theme } = useTheme();
  const [activated, setActivated] = useState<boolean>(() => {
    return localStorage.getItem('symbiont_activated') === 'true';
  });
  const [adminKey, setAdminKey] = useState(() => localStorage.getItem('symbiont_admin_key') || '');

  // Callback à passer à InvitationLanding pour activer l'organisme après succès
  const handleActivation = () => {
    localStorage.setItem('symbiont_activated', 'true');
    setActivated(true);
  };

  // Callback à passer à OnboardingWizard pour activer l'organisme après onboarding
  const handleOnboardingFinish = () => {
    localStorage.setItem('symbiont_activated', 'true');
    setActivated(true);
  };

  // --- Données mock pour la démo des rituels ---
  const userId = localStorage.getItem('symbiont_user_id') || 'USER-' + Math.random().toString(36).substr(2, 6).toUpperCase();
  const traits = {
    curiosity: 42,
    focus: 58,
    rhythm: 67,
    empathy: 33,
    creativity: 77,
    energy: 50,
    harmony: 60,
    wisdom: 12
  };
  // Stocker l'userId si pas déjà fait
  if (!localStorage.getItem('symbiont_user_id')) {
    localStorage.setItem('symbiont_user_id', userId);
  }

  return (
    <MessageBusProvider>
      {!activated ? (
        <OnboardingWizard onFinish={handleOnboardingFinish} />
      ) : (
        <div className="app-container" data-theme={theme}>
          <header className="app-header">
            <h1 className="app-title">SYMBIONT</h1>
            <div className="app-subtitle">Digital Organism v1.0</div>
          </header>
          
          <nav className="tab-navigation">
            <button
              className={`tab-navigation__item ${activeTab === 'organism' ? 'tab-navigation__item--active' : ''}`}
              onClick={() => setActiveTab('organism')}
            >
              Organism
            </button>
            <button
              className={`tab-navigation__item ${activeTab === 'metrics' ? 'tab-navigation__item--active' : ''}`}
              onClick={() => setActiveTab('metrics')}
            >
              Metrics
            </button>
            <button
              className={`tab-navigation__item ${activeTab === 'settings' ? 'tab-navigation__item--active' : ''}`}
              onClick={() => setActiveTab('settings')}
            >
              Settings
            </button>
            <button
              className={`tab-navigation__item ${activeTab === 'rituals' ? 'tab-navigation__item--active' : ''}`}
              onClick={() => setActiveTab('rituals')}
            >
              Rituels
            </button>
            <button
              className={`tab-navigation__item ${activeTab === 'network' ? 'tab-navigation__item--active' : ''}`}
              onClick={() => setActiveTab('network')}
            >
              Réseau
            </button>
            {adminKey && <button onClick={()=>setActiveTab('admin')}>Admin</button>}
          </nav>
          
          {!adminKey && (
            <div style={{margin:18}}>
              <input type="password" placeholder="Clé admin…" value={adminKey} onChange={e=>setAdminKey(e.target.value)} />
              <button onClick={()=>{localStorage.setItem('symbiont_admin_key',adminKey);window.location.reload();}}>Valider</button>
            </div>
          )}
          
          <main className="app-content">
            {activeTab === 'organism' && <OrganismDashboard />}
            {activeTab === 'metrics' && <MetricsPanel />}
            {activeTab === 'settings' && <SettingsPanel />}
            {activeTab === 'rituals' && (
              <section>
                <h2 style={{ textAlign: 'center', margin: '18px 0 24px 0', color: '#00e0ff' }}>Rituels collectifs</h2>
                <SharedMutationRitual userId={userId} traits={traits} />
                <div style={{ height: 32 }} />
                <CollectiveWakeRitual userId={userId} />
                <div style={{ height: 32 }} />
                <SecretRitualInput />
              </section>
            )}
            {activeTab === 'network' && (
              <section>
                <GlobalNetworkGraph />
              </section>
            )}
            {activeTab === 'admin' && adminKey && <AdminRitualsPanel />}
          </main>
          <MurmureNotification />
          <ContextualInvitationNotification />
          <SecretRitualNotification />
        </div>
      )}
    </MessageBusProvider>
  );
};
