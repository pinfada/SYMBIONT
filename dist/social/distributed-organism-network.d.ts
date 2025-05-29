export declare class DistributedOrganismNetwork {
    private peers;
    private organismState;
    private channel;
    private peerId;
    constructor();
    private announce;
    joinNetwork(peerId: string): void;
    leaveNetwork(peerId: string): void;
    broadcastMutation(mutation: any): void;
    receiveMutation(mutation: any, fromPeer: string): void;
    performCommunityBackup(state: any): void;
    private handleMessage;
}
//# sourceMappingURL=distributed-organism-network.d.ts.map