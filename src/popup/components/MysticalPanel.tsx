import React, { useState } from 'react';

const MysticalPanel: React.FC = () => {
  const [secret, setSecret] = useState('');
  const [mode, setMode] = useState(false);
  const [event, setEvent] = useState(false);

  return (
    <div data-testid="mystical-panel">
      <h2>Rituels</h2>
      <input name="secretCode" value={secret} onChange={e => setSecret(e.target.value)} placeholder="Code secret" />
      <button onClick={() => setMode(secret === 'SYMBIOSIS')}>Déclencher</button>
      {mode && <div>Mode Symbiose</div>}
      <button onClick={() => setEvent(true)} style={{marginTop: 10}}>Déclencher événement</button>
      {event && <div>Événement mystique</div>}
    </div>
  );
};

export default MysticalPanel; 