// src/integration/WebGLMessageAdapter.ts
import { OrganismEngine } from '../generative/OrganismEngine';
import { OrganismState, OrganismMutation } from '../shared/types/organism';

// MessageBus et MessageType doivent être importés selon votre architecture
import { MessageBus, MessageType } from '../shared/messaging/MessageBus';

/**
 * Adaptateur entre le bus de messages et le moteur WebGL
 */
export class WebGLMessageAdapter {
    private engine: OrganismEngine;
    private messageBus: MessageBus;
    
    constructor(engine: OrganismEngine, messageBus: MessageBus) {
      this.engine = engine;
      this.messageBus = messageBus;
      this.setupListeners();
    }
    
  /**
   * Mise en place des listeners sur le bus de messages
   */
    private setupListeners(): void {
      // Écoute des mutations
    this.messageBus.on(MessageType.ORGANISM_MUTATE, (message: any) => {
      try {
        const { mutation } = message.payload;
        this.engine.mutate(mutation as OrganismMutation);
      } catch (err) {
        console.error('Erreur lors de l’application de la mutation WebGL :', err);
      }
      });
      
      // Écoute des changements d'état
    this.messageBus.on(MessageType.ORGANISM_STATE_CHANGE, (message: any) => {
      try {
        const { state } = message.payload;
        this.engine.render(state as OrganismState);
      } catch (err) {
        console.error('Erreur lors du rendu WebGL :', err);
      }
      });
      
      // Notification de performance
      setInterval(() => {
      try {
        const metrics = this.engine.getPerformanceMetrics();
        this.messageBus.send({
          type: MessageType.PERFORMANCE_UPDATE,
          payload: metrics
        });
      } catch (err) {
        // On ignore les erreurs de métriques pour ne pas polluer la console
      }
      }, 1000);
    }
}