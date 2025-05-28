declare class BackgroundService {
    private messageBus;
    private storage;
    private navigationObserver;
    private organism;
    private invitationService;
    private murmureService;
    private activated;
    private events;
    private collectiveThresholds;
    private reachedThresholds;
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
