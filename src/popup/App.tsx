// src/popup/App.tsx
import React, { useState } from 'react';
import { OrganismDashboard } from './components/OrganismDashboard';
import { OrganismViewer } from './components/OrganismViewer';
import { MetricsPanel } from './components/MetricsPanel';
import { SettingsPanel } from './components/SettingsPanel';
import { useTheme } from './hooks/useTheme';

type TabType = 'organism' | 'metrics' | 'settings';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('organism');
  const { theme } = useTheme();
  
  return (
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
      </nav>
      
      <main className="app-content">
        {activeTab === 'organism' && <OrganismDashboard />}
        {activeTab === 'metrics' && <MetricsPanel />}
        {activeTab === 'settings' && <SettingsPanel />}
      </main>
    </div>
  );
};
