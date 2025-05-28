import { SymbiontStorage } from '../../core/storage/SymbiontStorage';
interface Invitation {
    code: string;
    donorId: string;
    receiverId?: string;
    symbolicLink: string;
    used: boolean;
    createdAt: number;
    usedAt?: number;
}
export declare class InvitationService {
    private storage;
    constructor(storage: SymbiontStorage);
    generateInvitation(donorId: string): Promise<Invitation>;
    consumeInvitation(code: string, receiverId: string): Promise<Invitation | null>;
    isValid(code: string): Promise<boolean>;
    private generateSymbolicLink;
    getAllInvitations(): Promise<Invitation[]>;
}
export {};
//# sourceMappingURL=InvitationService.d.ts.map