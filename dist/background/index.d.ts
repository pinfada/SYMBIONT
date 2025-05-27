declare class BackgroundService {
    private messageBus;
    private storage;
    private navigationObserver;
    private organism;
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
}
export { BackgroundService };
