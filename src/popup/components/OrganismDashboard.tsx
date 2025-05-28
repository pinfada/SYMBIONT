// src/popup/components/OrganismDashboard.tsx
import React from 'react';
import { OrganismViewer } from './OrganismViewer';
import { ConsciousnessGauge } from './ConsciousnessGauge';
import { TraitsRadarChart } from './TraitsRadarChart';
import { useOrganism } from '../hooks/useOrganism';
import { LoadingSpinner } from './ui/LoadingSpinner';
import { OrganismTimeline } from './OrganismTimeline';
import { TransmissionGraph } from './TransmissionGraph';
import { useInvitationData } from '../hooks/useInvitationData';
// import { OrganismState } from '@shared/types/organism';

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
  
  // Pour la démo, on génère des événements mockés
  const now = Date.now();
  const events = [
    { type: 'activation' as const, date: now - 1000 * 60 * 60 * 24 * 7, description: "L'organisme a été activé." },
    { type: 'mutation' as const, date: now - 1000 * 60 * 60 * 24 * 6, description: 'Mutation visuelle : variation de couleur.' },
    { type: 'mutation' as const, date: now - 1000 * 60 * 60 * 24 * 4, description: 'Mutation cognitive rare : éveil de la conscience.' },
    { type: 'transmission' as const, date: now - 1000 * 60 * 60 * 24 * 3, description: 'Invitation transmise à un autre utilisateur.' },
    { type: 'mutation' as const, date: now - 1000 * 60 * 60 * 24 * 2, description: 'Mutation comportementale : curiosité accrue.' },
    { type: 'mutation' as const, date: now - 1000 * 60 * 60 * 24 * 1, description: 'Mutation visuelle : motif fractal généré.' },
  ];
  
  // Données de transmission (mock/demo)
  const userId = localStorage.getItem('symbiont_user_id') || 'ABC123';
  const { inviter, invitees } = useInvitationData(userId);

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
      <OrganismTimeline events={events} />
      <h3 style={{ textAlign: 'center', color: '#ffb700', margin: '32px 0 12px 0' }}>Carte de transmission</h3>
      <TransmissionGraph inviter={inviter} invitees={invitees} userCode={userId} />
    </div>
  );
};

export default OrganismDashboard;