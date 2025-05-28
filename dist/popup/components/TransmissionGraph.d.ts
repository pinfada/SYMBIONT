import React from 'react';
import { Invitation } from '../../shared/types/invitation';
interface TransmissionGraphProps {
    inviter?: Invitation | null;
    invitees?: Invitation[];
    userCode: string;
}
export declare const TransmissionGraph: React.FC<TransmissionGraphProps>;
export {};
