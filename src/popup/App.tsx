// src/popup/App.tsx
import React, { useState, useEffect } from 'react';
import { OrganismViewer } from './components/OrganismViewer';
import { OrganismDashboard } from './components/OrganismDashboard';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<'viewer' | 'dashboard'>('viewer');

  useEffect(() => {
    // Initialize app
    console.log('SYMBIONT Popup initialized');
  }, []);

  return (
    <div className="app" style={{ width: '400px', height: '600px', padding: '16px' }}>
      <div className="nav-tabs" style={{ display: 'flex', marginBottom: '16px' }}>
        <button 
          onClick={() => setCurrentView('viewer')}
          style={{ 
            padding: '8px 16px', 
            marginRight: '8px',
            backgroundColor: currentView === 'viewer' ? '#00e0ff' : '#333',
            color: currentView === 'viewer' ? '#000' : '#fff',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Organisme
        </button>
        <button 
          onClick={() => setCurrentView('dashboard')}
          style={{ 
            padding: '8px 16px',
            backgroundColor: currentView === 'dashboard' ? '#00e0ff' : '#333',
            color: currentView === 'dashboard' ? '#000' : '#fff',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Dashboard
        </button>
      </div>
      
      <div className="content">
        {currentView === 'viewer' && <OrganismViewer />}
        {currentView === 'dashboard' && <OrganismDashboard />}
      </div>
    </div>
  );
};

export default App;
