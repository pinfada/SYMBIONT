/**
 * SecurityManager - Sécurité avancée (chiffrement, anonymisation, contrôle d'accès)
 */
import { BehaviorPattern } from '../shared/types/organism';
export declare class SecurityManager {
    private encryptionKey;
    private keyPromise;
    constructor(skipAutoInit?: boolean);
    /**
     * Initialise une clé de chiffrement sécurisée avec WebCrypto
     */
    private initializeSecureKey;
    /**
     * Génère une clé AES-GCM 256 bits sécurisée
     */
    private generateSecureKey;
    /**
     * Crée une clé factice pour le développement (NON SÉCURISÉ)
     */
    private createDevelopmentKey;
    /**
     * Récupère la clé stockée de manière sécurisée
     */
    private getStoredKey;
    /**
     * Stocke la clé de manière sécurisée
     */
    private storeKey;
    /**
     * Garantit que la clé est initialisée avant utilisation
     */
    private ensureKeyReady;
    /**
     * Chiffre des données sensibles avec AES-GCM sécurisé
     */
    encryptSensitiveData(data: any): Promise<string>;
    /**
     * Déchiffre des données sensibles avec AES-GCM sécurisé
     */
    decryptSensitiveData(data: unknown): Promise<any>;
    /**
     * Anonymise un pattern comportemental (suppression PII, hashage sécurisé)
     */
    anonymizeForSharing(data: BehaviorPattern): Promise<any>;
    /**
     * Version synchrone pour compatibilité (utilise hashSync)
     */
    anonymizeForSharingSync(data: BehaviorPattern): any;
    /**
     * Contrôle d'accès par rôle (user/admin), ressource, etc.
     */
    validateDataAccess(request: {
        userId: string;
        resource: string;
        role?: 'user' | 'admin';
    }, requiredRole?: 'user' | 'admin'): boolean;
    /**
     * Hash cryptographique SHA-256 pour anonymisation sécurisée
     */
    hash(str: string): Promise<string>;
    /**
     * Version synchrone du hash pour compatibilité (non recommandée pour nouveau code)
     */
    hashSync(str: string): string;
}
//# sourceMappingURL=SecurityManager.d.ts.map