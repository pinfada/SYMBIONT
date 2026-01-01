import { Invitation, InvitationStatus } from '../../shared/types/invitation';
declare const FEATURE_FLAGS: {
    USE_REAL_DNA: boolean;
    USE_REAL_BEHAVIOR: boolean;
    USE_REAL_NETWORK: boolean;
    USE_BACKEND_API: boolean;
};
export declare class RealDataService {
    private static instance;
    private behaviorMetrics;
    private apiHeaders;
    private constructor();
    static getInstance(): RealDataService;
    generateRealDNA(userId: string): Promise<string>;
    private collectUserBehaviors;
    private buildDNAFromBehaviors;
    private categorizeWebsite;
    getRealInvitations(userId: string): Promise<{
        userCode: string;
        inviter: Invitation | null;
        invitees: Invitation[];
        history: Array<Invitation & {
            status: InvitationStatus;
            type: 'envoyée' | 'reçue';
        }>;
    }>;
    getRealSystemMetrics(): Promise<{
        cpu: number;
        memory: number;
        latency: number;
    }>;
    private getMemoryUsage;
    private getCPUUsage;
    private getNetworkLatency;
    private initializeBehaviorTracking;
    private processBehaviorData;
    private trackTabChange;
    private trackNavigation;
    static enableFeature(feature: keyof typeof FEATURE_FLAGS): void;
    static disableFeature(feature: keyof typeof FEATURE_FLAGS): void;
    private static getFeatureKey;
    static getFeatureStatus(): typeof FEATURE_FLAGS;
    migrateToRealData(userId: string): Promise<void>;
}
export declare const realDataService: RealDataService;
export declare const RealDataServiceClass: typeof RealDataService;
export {};
//# sourceMappingURL=RealDataService.d.ts.map