import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './components/App';
import { OrganismProvider } from './hooks/useOrganism';

const root = createRoot(document.getElementById('root')!);
root.render(
  <OrganismProvider>
    <App />
  </OrganismProvider>
);
