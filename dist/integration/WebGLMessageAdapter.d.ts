import { OrganismEngine } from '../generative/OrganismEngine';
import { MessageBus } from '../shared/messaging/MessageBus';
/**
 * Adaptateur entre le bus de messages et le moteur WebGL
 */
export declare class WebGLMessageAdapter {
    private engine;
    private messageBus;
    constructor(engine: OrganismEngine, messageBus: MessageBus);
    /**
     * Mise en place des listeners sur le bus de messages
     */
    private setupListeners;
}
