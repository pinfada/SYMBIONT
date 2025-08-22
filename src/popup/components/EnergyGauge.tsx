// src/popup/components/EnergyGauge.tsx
import React from 'react';

interface EnergyGaugeProps {
  /** Niveau d'énergie actuel (0-100) */
  currentEnergy: number;
  /** Énergie maximale */
  maxEnergy: number;
  /** Taux de métabolisme (optionnel) */
  metabolismRate?: number;
  /** État de l'énergie (optionnel) */
  status?: 'low' | 'normal' | 'high';
}

export const EnergyGauge: React.FC<EnergyGaugeProps> = ({ 
  currentEnergy, 
  maxEnergy, 
  metabolismRate,
  status 
}) => {
  // Calculer le pourcentage d'énergie
  const percentage = Math.min(100, Math.max(0, (currentEnergy / maxEnergy) * 100));
  
  // Déterminer automatiquement le statut si non fourni
  const energyStatus = status || (
    percentage <= 20 ? 'low' : 
    percentage >= 80 ? 'high' : 
    'normal'
  );

  // Couleurs selon le niveau d'énergie
  const getEnergyColor = (level: typeof energyStatus) => {
    switch (level) {
      case 'low': return '#ff4b6e';     // Rouge pour énergie faible
      case 'high': return '#2ead33';    // Vert pour énergie élevée
      case 'normal': 
      default: return '#ffb700';        // Orange pour énergie normale
    }
  };

  const energyColor = getEnergyColor(energyStatus);

  // Styles dynamiques pour la jauge
  const gaugeStyle = {
    width: `${percentage}%`,
    backgroundColor: energyColor,
    transition: 'width 0.3s ease, background-color 0.3s ease'
  };

  // Icône selon le niveau d'énergie
  const getEnergyIcon = () => {
    switch (energyStatus) {
      case 'low': return '🪫';      // Batterie faible
      case 'high': return '⚡';     // Énergie élevée
      case 'normal': 
      default: return '🔋';         // Batterie normale
    }
  };

  return (
    <div className="energy-gauge-container">
      <div className="energy-gauge-header">
        <span className="energy-icon" title={`Énergie ${energyStatus}`}>
          {getEnergyIcon()}
        </span>
        <span className="energy-label">Énergie</span>
        <span className="energy-value">
          {Math.round(currentEnergy)}/{maxEnergy}
        </span>
      </div>
      
      <div className="energy-gauge-bar-container">
        <div 
          className="energy-gauge-bar-background"
          style={{ 
            position: 'relative',
            width: '100%',
            height: '12px',
            backgroundColor: '#232946',
            borderRadius: '6px',
            overflow: 'hidden',
            boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.3)'
          }}
        >
          <div 
            className="energy-gauge-bar-fill"
            style={{
              ...gaugeStyle,
              height: '100%',
              borderRadius: '6px',
              boxShadow: `0 0 8px ${energyColor}44`,
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            {/* Effet de brillance sur la barre */}
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: '50%',
                background: 'linear-gradient(to bottom, rgba(255,255,255,0.3), transparent)',
                borderRadius: '6px 6px 0 0'
              }}
            />
          </div>
        </div>
        
        <div className="energy-percentage">
          {Math.round(percentage)}%
        </div>
      </div>

      {/* Informations supplémentaires sur le métabolisme */}
      {metabolismRate !== undefined && (
        <div className="energy-metabolism-info">
          <span className="metabolism-rate">
            ⚙️ Métabolisme: {metabolismRate.toFixed(1)}/s
          </span>
        </div>
      )}

      {/* Indicateur d'état textuel */}
      <div className="energy-status-text">
        <span 
          className={`energy-status energy-status--${energyStatus}`}
          style={{ 
            color: energyColor,
            fontSize: '0.85em',
            fontWeight: '600',
            textTransform: 'capitalize'
          }}
        >
          {energyStatus === 'low' && 'Énergie faible'}
          {energyStatus === 'normal' && 'Énergie stable'}
          {energyStatus === 'high' && 'Énergie élevée'}
        </span>
      </div>
    </div>
  );
};

export default EnergyGauge;