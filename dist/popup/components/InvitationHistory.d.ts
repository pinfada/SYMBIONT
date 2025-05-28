import React from 'react';
import { Invitation, InvitationStatus } from '../../shared/types/invitation';
interface InvitationHistoryProps {
    invitations: Array<Invitation & {
        status: InvitationStatus;
        type: 'envoyée' | 'reçue';
    }>;
}
export declare const InvitationHistory: React.FC<InvitationHistoryProps>;
export {};
//# sourceMappingURL=InvitationHistory.d.ts.map