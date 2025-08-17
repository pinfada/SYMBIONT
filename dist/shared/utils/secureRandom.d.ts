/**
 * Utilitaires de génération de nombres aléatoires sécurisés
 * Remplace Math.random() par crypto.getRandomValues() pour la sécurité cryptographique
 */
export declare class SecureRandom {
    private static readonly MAX_UINT32;
    /**
     * Génère un nombre aléatoire sécurisé entre 0 et 1 (équivalent Math.random())
     */
    static random(): number;
    /**
     * Génère un entier aléatoire sécurisé dans une plage
     */
    static randomInt(min: number, max: number): number;
    /**
     * Génère un nombre flottant aléatoire sécurisé dans une plage
     */
    static randomFloat(min: number, max: number): number;
    /**
     * Génère des bytes aléatoires sécurisés
     */
    static randomBytes(length: number): Uint8Array;
    /**
     * Sélectionne un élément aléatoire d'un tableau
     */
    static choice<T>(array: T[]): T;
    /**
     * Génère un UUID v4 sécurisé
     */
    static uuid(): string;
    /**
     * Génère une chaîne aléatoire sécurisée
     */
    static randomString(length: number, charset?: string): string;
    /**
     * Génère un ID court sécurisé pour les identifiants
     */
    static randomId(prefix?: string, length?: number): string;
}
export declare const secureRandom: typeof SecureRandom.random;
export declare const secureRandomInt: typeof SecureRandom.randomInt;
export declare const secureRandomFloat: typeof SecureRandom.randomFloat;
//# sourceMappingURL=secureRandom.d.ts.map