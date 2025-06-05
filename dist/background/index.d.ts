import { OrganismState } from '../shared/types/organism';
import { ResilientMessageBus } from '../communication/resilient-message-bus';
import { HybridStorageManager } from '../storage/hybrid-storage-manager';
import { BasicHealthMonitor } from '../monitoring/basic-health-monitor';
import { DistributedOrganismNetwork } from '../social/distributed-organism-network';
import { CollectiveIntelligence } from '../social/collective-intelligence';
import { SocialResilience } from '../social/social-resilience';
import { MysticalEvents } from '../social/mystical-events';
export declare const hybridStorage: HybridStorageManager;
export declare const resilientBus: ResilientMessageBus;
export declare const healthMonitor: BasicHealthMonitor;
declare class BackgroundService {
    private messageBus;
    private storage;
    organism: OrganismState | null;
    private invitationService;
    private murmureService;
    private activated;
    private events;
    private collectiveThresholds;
    private reachedThresholds;
    private security;
    private _organismFactory;
    constructor();
    private initialize;
    private createNewOrganism;
    private generateVisualDNA;
    private setupMessageHandlers;
    private updateOrganismTraits;
    private hasVisitedDomain;
    private checkForMutations;
    private generateMutation;
    private getMutationTrigger;
    private applyMutation;
    private mutateVisualDNA;
    private startPeriodicTasks;
    private isLoop;
    private isIdle;
    private isExploration;
    private isRoutine;
    /**
     * Analyse les patterns contextuels dans l'historique d'événements et déclenche une invitation si nécessaire
     */
    private analyzeContextualPatterns;
    /**
     * Vérifie si un seuil collectif de propagation est atteint et déclenche une invitation spéciale si besoin
     */
    private checkCollectiveThreshold;
    /**
     * Déclenche une invitation contextuelle avancée
     */
    private triggerContextualInvitation;
}
export { BackgroundService };
export declare const distributedNetwork: DistributedOrganismNetwork;
export declare const collectiveIntelligence: CollectiveIntelligence;
export declare const socialResilience: SocialResilience;
export declare const mysticalEvents: MysticalEvents;
//# sourceMappingURL=index.d.ts.map