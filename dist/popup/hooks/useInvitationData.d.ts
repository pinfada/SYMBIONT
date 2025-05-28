import { Invitation } from '../../shared/types/invitation';
export declare function useInvitationData(userId: string): {
    inviter: Invitation | null;
    invitees: Invitation[];
    history: any[];
};
