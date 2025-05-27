// src/background/services/WebGLBridge.ts
// Interface avec moteur WebGL
import { MessageBus } from '../../core/messaging';
import { Message, MessageType, OrganismMutation, OrganismState } from '../../types';

export class WebGLBridge {
  private messageBus: MessageBus;
  private renderInterval: number | null = null;
  private currentState: OrganismState | null = null;
  private isRendering: boolean = false;
  private unsubscribeHandler?: () => void;
  
  constructor(messageBus: MessageBus) {
    this.messageBus = messageBus;
    this.setupMessageHandlers();
  }
  
  private setupMessageHandlers(): void {
    // Écouter les réponses du moteur WebGL
    this.unsubscribeHandler = this.messageBus.on(MessageType.ORGANISM_UPDATE, (message: Message) => {
      if (message.payload?.state) {
        this.updateState(message.payload.state);
      }
    });
  }
  
  public startRendering(dna: string): void {
    if (this.isRendering) {
      console.warn('Le rendu est déjà en cours');
      return;
    }
    
    // Demande d'initialisation WebGL dans la popup
    this.messageBus.send({
      type: MessageType.WEBGL_INIT,
      payload: { dna }
    });
    
    this.isRendering = true;
    
    // Boucle de rendu à 60fps (16ms ≈ 60fps)
    this.renderInterval = window.setInterval(() => {
      if (this.currentState && this.isRendering) {
        this.messageBus.send({
          type: MessageType.ORGANISM_RENDER,
          payload: { state: this.currentState }
        });
      }
    }, 16);
  }
  
  public updateState(state: OrganismState): void {
    // Validation basique de l'état
    if (!state) {
      console.error('État d\'organisme invalide:', state);
      return;
    }
    this.currentState = { ...state }; // Copie défensive
  }
  
  public triggerMutation(mutation: OrganismMutation): void {
    if (!mutation || !mutation.type) {
      console.error('Mutation invalide:', mutation);
      return;
    }
    
    this.messageBus.send({
      type: MessageType.ORGANISM_MUTATE,
      payload: { mutation }
    });
  }
  
  public stopRendering(): void {
    this.isRendering = false;
    
    if (this.renderInterval !== null) {
      clearInterval(this.renderInterval);
      this.renderInterval = null;
    }
  }
  
  public getCurrentState(): OrganismState | null {
    return this.currentState ? { ...this.currentState } : null;
  }
  
  public isCurrentlyRendering(): boolean {
    return this.isRendering;
  }
  
  // Nettoyage des ressources
  public dispose(): void {
    this.stopRendering();
    this.currentState = null;
    
    // Désenregistrer le handler de messages
    if (this.unsubscribeHandler) {
      this.unsubscribeHandler();
      this.unsubscribeHandler = undefined;
    }
  }
}