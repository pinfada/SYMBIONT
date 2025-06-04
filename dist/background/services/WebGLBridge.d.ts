import { MessageBus } from '../../core/messaging';
import { OrganismMutation, OrganismState } from '../../shared/types/organism';
export declare class WebGLBridge {
    private messageBus;
    private renderInterval;
    private currentState;
    private isRendering;
    private unsubscribeHandler?;
    private pendingFrames;
    private renderQueue;
    private cleanup?;
    constructor(messageBus: MessageBus);
    private setupMessageHandlers;
    startRendering(dna: string): void;
    updateState(state: OrganismState): void;
    triggerMutation(mutation: OrganismMutation): void;
    stopRendering(): void;
    getCurrentState(): OrganismState | null;
    isCurrentlyRendering(): boolean;
    dispose(): void;
}
//# sourceMappingURL=WebGLBridge.d.ts.map