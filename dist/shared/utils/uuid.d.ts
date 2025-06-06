/**
 * Génère un UUID v4 avec fallback pour les environnements sans crypto.randomUUID
 */
export declare function generateUUID(): string;
/**
 * Vérifie si crypto.randomUUID est disponible dans l'environnement actuel
 */
export declare function isCryptoUUIDAvailable(): boolean;
/**
 * Génère un UUID v4 cryptographiquement sécurisé si possible
 * Sinon utilise Math.random() comme fallback
 */
export declare function generateSecureUUID(): string;
//# sourceMappingURL=uuid.d.ts.map