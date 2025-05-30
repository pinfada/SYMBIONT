import React, { useState } from 'react';

const ResiliencePanel: React.FC = () => {
  const [backup, setBackup] = useState(false);
  return (
    <div data-testid="resilience-panel">
      <h2>Monitoring</h2>
      <div>[ResilientMessageBus] Log de résilience</div>
      <div>[HybridStorageManager] Log de stockage</div>
      <div>[Perf] Log de performance</div>
      <button onClick={() => setBackup(true)} style={{marginTop: 10}}>Backup communautaire</button>
      {backup && <div>Backup lancé</div>}
    </div>
  );
};

export default ResiliencePanel; 