// src/integration/WebGLMessageAdapter.ts
import {OrganismEngine} from '../generative/OrganismEngine';
import { MessageBus, MessageType } from '../core/messaging';
import { OrganismState, OrganismMutation } from '../types';

export class WebGLMessageAdapter {
    private engine: OrganismEngine;
    private messageBus: MessageBus;
    
    constructor(engine: OrganismEngine, messageBus: MessageBus) {
      this.engine = engine;
      this.messageBus = messageBus;
      this.setupListeners();
    }
    
    private setupListeners(): void {
      // Écoute des mutations
      this.messageBus.on(MessageType.ORGANISM_MUTATE, (message) => {
        const { mutation, state } = message.payload;
        
        // Conversion du format message en format moteur
        const engineMutation: VisualMutation = {
          type: mutation.type,
          magnitude: mutation.intensity,
          duration: mutation.duration || 1000,
          easing: mutation.easing || 'ease-out'
        };
        
        this.engine.mutate(engineMutation);
      });
      
      // Écoute des changements d'état
      this.messageBus.on(MessageType.ORGANISM_STATE_CHANGE, (message) => {
        const { state } = message.payload;
        this.engine.render(state);
      });
      
      // Notification de performance
      setInterval(() => {
        const metrics = this.engine.getPerformanceMetrics();
        this.messageBus.send({
          type: MessageType.PERFORMANCE_UPDATE,
          payload: metrics
        });
      }, 1000);
    }
}