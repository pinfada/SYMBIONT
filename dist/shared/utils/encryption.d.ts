/**
 * Module de chiffrement sécurisé pour les données sensibles de SYMBIONT
 * Utilise WebCrypto API pour un chiffrement AES-GCM robuste
 */
export declare class SymbiontEncryption {
    private static readonly ALGORITHM;
    private static readonly KEY_LENGTH;
    private static readonly IV_LENGTH;
    private static readonly TAG_LENGTH;
    /**
     * Génère une clé de chiffrement dérivée du navigateur de l'utilisateur
     */
    private static deriveKey;
    /**
     * Chiffre des données avec AES-GCM
     */
    static encrypt(data: string): Promise<string>;
    /**
     * Déchiffre des données AES-GCM
     */
    static decrypt(encryptedData: string): Promise<string>;
    /**
     * Chiffre un objet JSON
     */
    static encryptObject(obj: unknown): Promise<string>;
    /**
     * Déchiffre vers un objet JSON
     */
    static decryptObject<T>(encryptedData: string): Promise<T>;
    /**
     * Hash sécurisé pour vérification d'intégrité (non réversible)
     */
    static hash(data: string): Promise<string>;
    /**
     * Génère un token de session sécurisé
     */
    static generateSessionToken(): string;
    /**
     * Valide l'intégrité des données avec hash
     */
    static validateIntegrity(data: string, expectedHash: string): Promise<boolean>;
}
//# sourceMappingURL=encryption.d.ts.map