export declare class SocialResilience {
    private channel;
    private peerId;
    constructor();
    requestCommunityBackup(organismId: string): void;
    restoreFromCommunity(organismId: string): void;
    detectMassiveFailure(): void;
    launchCommunityAlert(message: string): void;
    private handleMessage;
}
//# sourceMappingURL=social-resilience.d.ts.map