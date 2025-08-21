// src/popup/components/OrganismDashboard.tsx
import React, { useEffect, useState } from 'react';
import { OrganismViewer } from './OrganismViewer';
import { ConsciousnessGauge } from './ConsciousnessGauge';
import { TraitsRadarChart } from './TraitsRadarChart';
import { useOrganism } from '../hooks/useOrganism';
import { LoadingSpinner } from './ui/LoadingSpinner';
import { OrganismTimeline } from './OrganismTimeline';
import { TransmissionGraph } from './TransmissionGraph';
import { useInvitationData } from '../hooks/useInvitationData';
import { UserIdentityService } from '../../core/services/UserIdentityService';
import { OrganismEventService, OrganismEvent } from '../../core/services/OrganismEventService';

export const OrganismDashboard: React.FC = () => {
  const { organism, isLoading } = useOrganism();
  const [userId, setUserId] = useState<string>('');
  const [events, setEvents] = useState<OrganismEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const { inviter, invitees } = useInvitationData(userId);
  
  // Initialiser l'identité utilisateur et charger les événements
  useEffect(() => {
    const initializeData = async () => {
      try {
        setEventsLoading(true);
        
        // Obtenir l'identité utilisateur sécurisée
        const userIdentity = await UserIdentityService.getUserIdentity();
        setUserId(userIdentity.id);
        
        // Charger les événements réels de l'organisme
        const organismEvents = await OrganismEventService.getEvents();
        setEvents(organismEvents);
        
        // Nettoyer les anciens événements pour optimiser le stockage
        await OrganismEventService.cleanOldEvents();
        
      } catch (error) {
        console.error('Failed to initialize dashboard data:', error);
        // Fallback avec un événement d'activation de base
        setEvents([{
          id: 'fallback-activation',
          type: 'activation',
          date: Date.now(),
          description: 'Organisme digital activé avec succès'
        }]);
      } finally {
        setEventsLoading(false);
      }
    };

    initializeData();
  }, []);

  // Détecter et ajouter des événements basés sur l'état de l'organisme
  useEffect(() => {
    if (!organism || !userId) return;

    const checkForNewEvents = async () => {
      try {
        // Événement de conscience si niveau élevé détecté
        if (organism.consciousness && organism.consciousness > 0.8) {
          await OrganismEventService.addConsciousnessEvent(organism.consciousness);
        }

        // Événements de mutation récente
        if (organism.mutations && organism.mutations.length > 0) {
          const recentMutation = organism.mutations[organism.mutations.length - 1];
          if (recentMutation && typeof recentMutation === 'object' && 'timestamp' in recentMutation) {
            const timestamp = (recentMutation as any).timestamp;
            if (timestamp && Date.now() - timestamp < 300000) { // 5 minutes
              await OrganismEventService.addMutationEvent('visual', 'minor');
            }
          }
        }

        // Recharger les événements mis à jour
        const updatedEvents = await OrganismEventService.getEvents();
        setEvents(updatedEvents);
      } catch (error) {
        console.error('Failed to check for new events:', error);
      }
    };

    // Déclencher la vérification avec un délai pour éviter les appels excessifs
    const timeoutId = setTimeout(checkForNewEvents, 1000);
    return () => clearTimeout(timeoutId);
  }, [organism, userId]);
  
  if (isLoading || eventsLoading) {
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
            <span className="info-value text-lg font-bold">{organism.mutations?.length || 0}</span>
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