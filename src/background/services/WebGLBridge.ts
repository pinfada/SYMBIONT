// src/background/services/WebGLBridge.ts
// Interface avec moteur WebGL
import { MessageBus } from '../../core/messaging';
import { OrganismState } from '../../types';

export class WebGLBridge {
  private messageBus: MessageBus;
  private renderInterval: number | null = null;
  private currentState: OrganismState | null = null;
  
  constructor(messageBus: MessageBus) {
    this.messageBus = messageBus;
  }
  
  public startRendering(dna: string): void {
    // Demande d'initialisation WebGL dans la popup
    this.messageBus.send({
      type: MessageType.WEBGL_INIT,
      payload: { dna },
      target: 'popup'
    });
    
    // Boucle de rendu à 60fps
    this.renderInterval = window.setInterval(() => {
      if (this.currentState) {
        this.messageBus.send({
          type: MessageType.ORGANISM_RENDER,
          payload: { state: this.currentState },
          target: 'popup'
        });
      }
    }, 16);
  }
  
  public updateState(state: OrganismState): void {
    this.currentState = state;
  }
  
  public triggerMutation(mutation: any): void {
    this.messageBus.send({
      type: MessageType.ORGANISM_MUTATE,
      payload: { mutation },
      target: 'popup'
    });
  }
  
  public stopRendering(): void {
    if (this.renderInterval) {
      clearInterval(this.renderInterval);
      this.renderInterval = null;
    }
  }
}