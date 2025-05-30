import React, { useState } from 'react';

const MysticalPanel: React.FC = () => {
  const [secret, setSecret] = useState('');
  const [mode, setMode] = useState(false);
  const [event, setEvent] = useState(false);

  return (
    <div data-testid="mystical-panel">
      <h2 data-testid="mystical-title">Rituels</h2>
      <input name="secretCode" value={secret} onChange={e => setSecret(e.target.value)} placeholder="Code secret" data-testid="secret-code-input" />
      <button data-testid="trigger-btn" onClick={() => setMode(secret === 'SYMBIOSIS')}>Déclencher</button>
      {mode && <div data-testid="symbiosis-mode">Mode Symbiose</div>}
      <button data-testid="trigger-event-btn" onClick={() => setEvent(true)} style={{marginTop: 10}}>Déclencher événement</button>
      {event && <div data-testid="mystical-event">Événement mystique</div>}
    </div>
  );
};

export default MysticalPanel; 