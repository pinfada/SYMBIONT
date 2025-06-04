import { InvitationContext, InvitationCode, SharedMutationResult, CollectiveTrigger, WakeResult } from '../shared/types/social';
import { OrganismMemoryBank } from '../background/OrganismMemoryBank';
import { SecurityManager } from '../background/SecurityManager';
export declare class SocialNetworkManager {
    private invitations;
    private memoryBank;
    private security;
    private _collectiveSessions;
    constructor(memoryBank: OrganismMemoryBank, security: SecurityManager);
    generateInvitation(inviterId: string, context: InvitationContext): Promise<InvitationCode>;
    facilitateSharedMutation(source: string, target: string): Promise<SharedMutationResult>;
    detectCollectiveSync(userIds: string[]): Promise<boolean>;
    fuseTraits(userIds: string[]): Promise<Record<string, number>>;
    applyCollectiveBonus(userIds: string[], bonus: Record<string, number>): Promise<void>;
    triggerCollectiveWake(trigger: CollectiveTrigger, userIds: string[]): Promise<WakeResult>;
}
//# sourceMappingURL=SocialNetworkManager.d.ts.map