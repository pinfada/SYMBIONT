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
    <div className="organism-dashboard max-w-2xl mx-auto p-6 bg-white rounded-xl shadow-lg mt-8">
      <h2 className="text-2xl font-bold text-center text-[#00e0ff] mb-6" data-testid="organism-dashboard-title">Tableau de bord de l'organisme</h2>
      <section className="dashboard-section dashboard-section--info mb-6 p-4 bg-[#eaf6fa] rounded-lg">
        <div className="organism-info flex flex-wrap gap-6 justify-center">
          <div className="info-item flex flex-col items-center">
            <span className="info-label text-[#888] text-sm">Génération</span>
            <span className="info-value text-lg font-bold">{organism.generation}</span>
          </div>
          <div className="info-item flex flex-col items-center">
            <span className="info-label text-[#888] text-sm">Signature ADN</span>
            <span className="info-value text-lg font-mono" title={organism.dna}>
              {organism.dna.substring(0, 8)}...
            </span>
          </div>
          <div className="info-item flex flex-col items-center">
            <span className="info-label text-[#888] text-sm">Mutations</span>
            <span className="info-value text-lg font-bold">{organism.mutations.length}</span>
          </div>
        </div>
        <div className="flex flex-col md:flex-row gap-8 justify-center items-center mt-8">
          <OrganismViewer />
          <div className="flex flex-col gap-6 items-center">
            <ConsciousnessGauge value={organism.consciousness ?? 0.5} />
            <TraitsRadarChart traits={organism.traits} />
          </div>
        </div>
      </section>
      <OrganismTimeline events={events} />
      <h3 className="text-center text-[#ffb700] text-xl font-semibold my-8">Carte de transmission</h3>
      <TransmissionGraph inviter={inviter} invitees={invitees} userCode={userId} />
    </div>
  );
};

export default OrganismDashboard;