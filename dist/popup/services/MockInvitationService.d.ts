import { Invitation, InvitationStatus } from '../../shared/types/invitation';
export declare const MockInvitationService: {
    getUserCode: () => Promise<string>;
    getInviter: () => Promise<Invitation>;
    getInvitees: () => Promise<Invitation[]>;
    getHistory: () => Promise<(Invitation & {
        status: InvitationStatus;
        type: "envoy\u00E9e" | "re\u00E7ue";
    })[]>;
};
