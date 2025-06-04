// src/background/services/WebGLBridge.ts
// Interface avec moteur WebGL
import { MessageBus } from '../../core/messaging';
import { Message, MessageType } from '../../shared/messaging/MessageBus';
import { OrganismMutation, OrganismState } from '../../shared/types/organism';

export class WebGLBridge {
  private messageBus: MessageBus;
  private renderInterval: number | null = null;
  private currentState: OrganismState | null = null;
  private isRendering: boolean = false;
  // @ts-expect-error Handler réservé pour usage futur
  private unsubscribeHandler?: () => void;
  private pendingFrames = new Set<number>();
  private renderQueue: OrganismState[] = [];
  private cleanup?: () => void;
  
  constructor(messageBus: MessageBus) {
    this.messageBus = messageBus;
    this.setupMessageHandlers();
  }
  
  private setupMessageHandlers(): void {
    // Écouter les réponses du moteur WebGL
    const handler = (message: Message) => {
      if (message.payload?.state) {
        this.updateState(message.payload.state);
      }
    };
    this.messageBus.on(MessageType.ORGANISM_UPDATE, handler);
    this.unsubscribeHandler = () => this.messageBus.off(MessageType.ORGANISM_UPDATE, handler);
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
          type: MessageType.ORGANISM_STATE_CHANGE,
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
    // Clear pending frames
    this.pendingFrames.clear();
    
    // Clear render queue
    this.renderQueue.length = 0;
    
    // Run cleanup if it exists
    if (this.cleanup) {
      this.cleanup();
      delete this.cleanup;
    }
  }
}