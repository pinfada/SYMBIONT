// src/popup/components/OrganismDashboard.tsx
import React, { useEffect, useState, Suspense, lazy } from 'react';
import { ConsciousnessGauge } from './ConsciousnessGauge';
import { TraitsRadarChart } from './TraitsRadarChart';
import { useOrganism } from '../hooks/useOrganism';
import { LoadingSpinner } from './ui/LoadingSpinner';
import { OrganismTimeline } from './OrganismTimeline';
import { useInvitationData } from '../hooks/useInvitationData';
import { UserIdentityService } from '../../core/services/UserIdentityService';
import { OrganismEventService, OrganismEvent } from '../../core/services/OrganismEventService';
import { EnergyGauge } from './EnergyGauge';

// Lazy loading des composants lourds pour optimiser le bundle
const WebGLOrganismViewer = lazy(() => import('./WebGLOrganismViewer').then(module => ({ default: module.WebGLOrganismViewer })));
const TransmissionGraph = lazy(() => import('./TransmissionGraph').then(module => ({ default: module.TransmissionGraph })));

export const OrganismDashboard: React.FC = () => {
  const { organism, isLoading } = useOrganism();
  const [userId, setUserId] = useState<string>('');
  const [events, setEvents] = useState<OrganismEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const { inviter, invitees } = useInvitationData(userId);
  
  // Initialiser l'identité utilisateur et charger les événements (différé)
  useEffect(() => {
    const initializeData = async () => {
      try {
        setEventsLoading(true);
        
        // Délai pour éviter le blocage initial
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Obtenir l'identité utilisateur sécurisée
        const userIdentity = await UserIdentityService.getUserIdentity();
        setUserId(userIdentity.id);
        
        // Charger les événements réels de l'organisme (avec timeout)
        const eventsPromise = OrganismEventService.getEvents();
        const timeoutPromise = new Promise<OrganismEvent[]>((_, reject) => 
          setTimeout(() => reject(new Error('Events timeout')), 3000)
        );
        
        try {
          const organismEvents = await Promise.race([eventsPromise, timeoutPromise]);
          setEvents(organismEvents);
          
          // Nettoyer les anciens événements pour optimiser le stockage (async)
          OrganismEventService.cleanOldEvents().catch(err => 
            console.warn('Failed to clean old events:', err)
          );
        } catch (timeoutError) {
          throw timeoutError;
        }
        
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
    <div className="organism-dashboard">
      <h2 className="dashboard-title" data-testid="organism-dashboard-title">Tableau de bord de l'organisme</h2>
      <section className="dashboard-section dashboard-section--info">
        <div className="organism-info">
          <div className="info-item">
            <span className="info-label">Génération</span>
            <span className="info-value">{organism.generation}</span>
          </div>
          <div className="info-item">
            <span className="info-label">Signature ADN</span>
            <span className="info-value info-value--mono" title={organism.dna}>
              {organism.dna.substring(0, 8)}...
            </span>
          </div>
          <div className="info-item">
            <span className="info-label">Mutations</span>
            <span className="info-value">{organism.mutations?.length || 0}</span>
          </div>
          <div className="info-item">
            <span className="info-label">Énergie</span>
            <span className="info-value">
              {organism.energy || 0}/{organism.maxEnergy || 100}
            </span>
          </div>
        </div>
        <div className="dashboard-components">
          <Suspense fallback={<div className="webgl-loading"><LoadingSpinner />Chargement du rendu 3D...</div>}>
            <WebGLOrganismViewer />
          </Suspense>
          <div className="dashboard-gauges">
            <ConsciousnessGauge value={organism.consciousness ?? 0.5} />
            <EnergyGauge 
              currentEnergy={organism.energy || 0}
              maxEnergy={organism.maxEnergy || 100}
              {...(organism.metabolismRate !== undefined && { metabolismRate: organism.metabolismRate })}
            />
            <TraitsRadarChart traits={organism.traits} />
          </div>
        </div>
      </section>
      <OrganismTimeline events={events} />
      <h3 className="dashboard-subtitle">Carte de transmission</h3>
      <Suspense fallback={<div className="graph-loading"><LoadingSpinner />Chargement de la carte réseau...</div>}>
        <TransmissionGraph inviter={inviter} invitees={invitees} userCode={userId} />
      </Suspense>
    </div>
  );
};

export default OrganismDashboard;