// src/popup/App.tsx
import React, { useState, useEffect } from 'react';
import OrganismDisplay from './components/OrganismDisplay';
import ConnectionStatus from './components/ConnectionStatus';
import PopupRouter from './components/PopupRouter';

const App: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Initialize app
    setIsLoading(true);
    setTimeout(() => setIsLoading(false), 1000);
  }, []);

  return (
    <div className="app">
      <ConnectionStatus />
      <OrganismDisplay />
      <PopupRouter />
    </div>
  );
};

export default App;
