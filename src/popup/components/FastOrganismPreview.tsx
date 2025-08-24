import React from 'react';
import { useOrganism } from '../hooks/useOrganism';
import './FastOrganismPreview.css';

export const FastOrganismPreview: React.FC<{ onLoadFull: () => void }> = ({ onLoadFull }) => {
  const { organism } = useOrganism();

  if (!organism) {
    return (
      <div className="fast-preview-loading">
        <div className="pulse-dot"></div>
        <p>Initialisation...</p>
      </div>
    );
  }

  return (
    <div className="fast-organism-preview">
      <div className="organism-icon">🧬</div>
      <div className="organism-summary">
        <div className="organism-id">#{organism.id.substring(0, 8)}</div>
        <div className="organism-gen">Génération {organism.generation}</div>
        <div className="organism-energy">Énergie: {Math.round(organism.energy || 0)}%</div>
      </div>
      <button 
        onClick={onLoadFull}
        className="load-full-button"
        type="button"
      >
        Charger le rendu complet
      </button>
    </div>
  );
};