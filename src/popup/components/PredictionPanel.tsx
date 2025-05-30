import React, { useState } from 'react';

const PredictionPanel: React.FC = () => {
  const [nextAction, setNextAction] = useState('');
  const [predicted, setPredicted] = useState('');

  return (
    <div data-testid="prediction-panel">
      <h2 data-testid="prediction-title">Prédiction</h2>
      <button data-testid="next-action-btn" onClick={() => setNextAction('Aller sur le dashboard')}>Prochaine action</button>
      {nextAction && <div data-testid="next-action">Prochaine action : <span>{nextAction}</span></div>}
      <button data-testid="simulate-btn" onClick={() => setPredicted('Action prédite : Connexion au réseau')}>Simuler</button>
      {predicted && <div data-testid="predicted-action">{predicted}</div>}
      <section style={{marginTop: 20}}>
        <h3>Métriques ML</h3>
        <svg width="200" height="60" data-testid="ml-metrics-graph"><rect x="10" y="20" width="180" height="20" fill="#4caf50" /></svg>
        <div data-testid="ml-metrics-log">ML | Machine Learning | Prédiction</div>
      </section>
    </div>
  );
};

export default PredictionPanel; 