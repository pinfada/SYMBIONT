import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './components/App';
import { OrganismProvider } from './hooks/useOrganism';
import { MessageBusProvider } from './hooks/MessageBusContext';

const root = createRoot(document.getElementById('root')!);
root.render(
  <MessageBusProvider>
    <OrganismProvider>
      <App />
    </OrganismProvider>
  </MessageBusProvider>
);
