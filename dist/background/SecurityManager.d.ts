import { BehaviorPattern } from '../shared/types/organism';
export declare class SecurityManager {
    private encryptionKey;
    constructor();
    encryptSensitiveData(data: any): string;
    decryptSensitiveData(data: string): any;
    anonymizeForSharing(data: BehaviorPattern): any;
    validateDataAccess(request: {
        userId: string;
        resource: string;
    }): boolean;
}
//# sourceMappingURL=SecurityManager.d.ts.map