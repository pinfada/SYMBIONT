/**
 * SecurityManager - Sécurité avancée (chiffrement, anonymisation, contrôle d'accès)
 */
import { BehaviorPattern } from '../shared/types/organism';
export declare class SecurityManager {
    private encryptionKey;
    constructor();
    /**
     * Chiffre des données sensibles (AES ou base64 fallback)
     */
    encryptSensitiveData(data: any): Promise<string>;
    /**
     * Déchiffre des données sensibles (AES ou base64 fallback)
     */
    decryptSensitiveData(data: unknown): Promise<any>;
    /**
     * Anonymise un pattern comportemental (suppression PII, hashage)
     */
    anonymizeForSharing(data: BehaviorPattern): any;
    /**
     * Contrôle d'accès par rôle (user/admin), ressource, etc.
     */
    validateDataAccess(request: {
        userId: string;
        resource: string;
        role?: 'user' | 'admin';
    }, requiredRole?: 'user' | 'admin'): boolean;
    /**
     * Hash simple (SHA-256 base64) pour anonymisation
     */
    hash(str: string): string;
}
//# sourceMappingURL=SecurityManager.d.ts.map