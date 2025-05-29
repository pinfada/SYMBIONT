export declare class CollectiveIntelligence {
    private proposals;
    private votes;
    private peerId;
    private onCollectiveMutation;
    constructor(onCollectiveMutation?: (mutationId: string) => void);
    proposeMutation(mutation: any, proposerId: string): void;
    vote(mutationId: string, voterId: string): void;
    aggregateVotes(mutationId: string): number;
    triggerCollectiveMutation(mutationId: string, totalPeers: number): boolean;
}
//# sourceMappingURL=collective-intelligence.d.ts.map