import React, { useState } from 'react';

const PredictionPanel: React.FC = () => {
  const [nextAction, setNextAction] = useState('');
  const [predicted, setPredicted] = useState('');

  return (
    <div data-testid="prediction-panel">
      <h2>Prédiction</h2>
      <button onClick={() => setNextAction('Aller sur le dashboard')}>Prochaine action</button>
      {nextAction && <div>Prochaine action : <span>{nextAction}</span></div>}
      <button onClick={() => setPredicted('Action prédite : Connexion au réseau')}>Simuler</button>
      {predicted && <div>{predicted}</div>}
      <section style={{marginTop: 20}}>
        <h3>Métriques ML</h3>
        <svg width="200" height="60"><rect x="10" y="20" width="180" height="20" fill="#4caf50" /></svg>
        <div>ML | Machine Learning | Prédiction</div>
      </section>
    </div>
  );
};

export default PredictionPanel; 