// src/integration/WebGLMessageAdapter.ts
import { OrganismEngine } from '../generative/OrganismEngine';
import { OrganismState, OrganismMutation } from '../shared/types/organism';
import { logger } from '@shared/utils/secureLogger';

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
    this.messageBus.on(MessageType.ORGANISM_MUTATE, (message: MessageEvent | unknown) => {
      try {
        const { mutation } = (message as any).payload;
        this.engine.mutate(mutation as OrganismMutation);
      } catch (_err) {
        logger.error('Erreur lors de l\'application de la mutation WebGL :', _err);
      }
      });
      
      // Écoute des changements d'état
    this.messageBus.on(MessageType.ORGANISM_STATE_CHANGE, (message: MessageEvent | unknown) => {
      try {
        const { state } = (message as any).payload;
        this.engine.render(state as OrganismState);
      } catch (_err) {
        logger.error('Erreur lors du rendu WebGL :', _err);
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
      } catch (_err) {
        // On ignore les erreurs de métriques pour ne pas polluer la console
      }
      }, 1000);
    }
}