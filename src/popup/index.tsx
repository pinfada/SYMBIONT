import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './components/App';
import { OrganismProvider } from './hooks/useOrganism';
import { MessageBusProvider } from './hooks/MessageBusContext';
import './index.css';

const root = createRoot(document.getElementById('root')!);
root.render(
  <MessageBusProvider>
    <OrganismProvider>
      <App />
    </OrganismProvider>
  </MessageBusProvider>
);
