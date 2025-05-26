// src/popup/components/OrganismDashboard.tsx
import React from 'react';
import { OrganismViewer } from './OrganismViewer';
import { ConsciousnessGauge } from './ConsciousnessGauge';
import { TraitsRadarChart } from './TraitsRadarChart';
import { useOrganism } from '../hooks/useOrganism';
import { LoadingSpinner } from './ui/LoadingSpinner';

export const OrganismDashboard: React.FC = () => {
  const { organism, isLoading } = useOrganism();
  
  if (isLoading) {
    return (
      <div className="organism-dashboard--loading">
        <LoadingSpinner size="large" />
        <p>Initializing organism...</p>
      </div>
    );
  }
  
  if (!organism) {
    return (
      <div className="organism-dashboard--empty">
        <h2>No Organism Found</h2>
        <p>Your digital organism is being created...</p>
      </div>
    );
  }
  
  return (
    <div className="organism-dashboard">
      <section className="dashboard-section dashboard-section--viewer">
        <OrganismViewer />
      </section>
      
      <section className="dashboard-section dashboard-section--vitals">
        <div className="vital-stats">
          <div className="vital-stat">
            <span className="vital-stat__label">Health</span>
            <div className="vital-stat__bar">
              <div 
                className="vital-stat__fill vital-stat__fill--health"
                style={{ width: `${organism.health * 100}%` }}
              />
            </div>
            <span className="vital-stat__value">{Math.round(organism.health * 100)}%</span>
          </div>
          
          <div className="vital-stat">
            <span className="vital-stat__label">Energy</span>
            <div className="vital-stat__bar">
              <div 
                className="vital-stat__fill vital-stat__fill--energy"
                style={{ width: `${organism.energy * 100}%` }}
              />
            </div>
            <span className="vital-stat__value">{Math.round(organism.energy * 100)}%</span>
          </div>
        </div>
        
        <ConsciousnessGauge value={organism.consciousness || 0.1} />
      </section>
      
      <section className="dashboard-section dashboard-section--traits">
        <h3>Personality Traits</h3>
        <TraitsRadarChart traits={organism.traits} />
      </section>
      
      <section className="dashboard-section dashboard-section--info">
        <div className="organism-info">
          <div className="info-item">
            <span className="info-label">Generation</span>
            <span className="info-value">{organism.generation}</span>
          </div>
          <div className="info-item">
            <span className="info-label">DNA Signature</span>
            <span className="info-value" title={organism.dna}>
              {organism.dna.substring(0, 8)}...
            </span>
          </div>
          <div className="info-item">
            <span className="info-label">Mutations</span>
            <span className="info-value">{organism.mutations.length}</span>
          </div>
        </div>
      </section>
    </div>
  );
};