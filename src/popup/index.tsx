import { createRoot } from 'react-dom/client';
import App from './components/App';
import { OrganismProvider } from './hooks/useOrganism';
import { MessageBusProvider } from './hooks/MessageBusContext';
import './index.css';

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(
    <MessageBusProvider>
      <OrganismProvider>
        <App />
      </OrganismProvider>
    </MessageBusProvider>
  );
}
