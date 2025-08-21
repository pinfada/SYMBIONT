export interface OrganismEvent {
    id: string;
    type: 'activation' | 'mutation' | 'transmission' | 'consciousness' | 'energy';
    date: number;
    description: string;
    metadata?: Record<string, unknown>;
}
export interface MutationEvent extends OrganismEvent {
    type: 'mutation';
    mutationType: 'visual' | 'cognitive' | 'behavioral' | 'structural';
    severity: 'minor' | 'major' | 'rare';
}
export interface TransmissionEvent extends OrganismEvent {
    type: 'transmission';
    targetUserId?: string;
    invitationCode?: string;
}
export declare class OrganismEventService {
    private static readonly STORAGE_KEY;
    private static readonly MAX_EVENTS;
    /**
     * Récupère tous les événements de l'organisme
     */
    static getEvents(): Promise<OrganismEvent[]>;
    /**
     * Ajoute un nouvel événement
     */
    static addEvent(event: Omit<OrganismEvent, 'id' | 'date'>): Promise<void>;
    /**
     * Ajoute un événement de mutation
     */
    static addMutationEvent(mutationType: MutationEvent['mutationType'], severity?: MutationEvent['severity'], customDescription?: string): Promise<void>;
    /**
     * Ajoute un événement de transmission
     */
    static addTransmissionEvent(targetUserId?: string, invitationCode?: string): Promise<void>;
    /**
     * Ajoute un événement de conscience
     */
    static addConsciousnessEvent(level: number): Promise<void>;
    /**
     * Crée l'événement d'activation initial
     */
    private static createActivationEvent;
    /**
     * Sauvegarde les événements
     */
    private static saveEvents;
    /**
     * Descriptions des mutations selon le type et la sévérité
     */
    private static getMutationDescriptions;
    /**
     * Nettoie les anciens événements
     */
    static cleanOldEvents(maxAge?: number): Promise<void>;
    /**
     * Obtient les statistiques des événements
     */
    static getEventStats(): Promise<{
        total: number;
        byType: Record<string, number>;
        recent: number;
    }>;
}
//# sourceMappingURL=OrganismEventService.d.ts.map