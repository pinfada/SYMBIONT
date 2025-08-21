export declare class ValidationError extends Error {
    field?: string | undefined;
    value?: unknown | undefined;
    constructor(message: string, field?: string | undefined, value?: unknown | undefined);
}
export declare class InputValidator {
    private static readonly EMAIL_REGEX;
    private static readonly ORGANISM_NAME_REGEX;
    private static readonly UUID_REGEX;
    private static readonly SESSION_ID_REGEX;
    private static readonly SAFE_PATH_REGEX;
    private static readonly XSS_PATTERNS;
    private static readonly NOSQL_PATTERNS;
    private static readonly PATH_TRAVERSAL_PATTERNS;
    /**
     * Sanitise les inputs de base en supprimant les caractères dangereux
     */
    static sanitizeUserInput(input: unknown, maxLength?: number): string;
    /**
     * Valide et sanitise les noms d'organismes
     */
    static validateOrganismName(name: unknown): string;
    /**
     * Valide les adresses email
     */
    static validateEmail(email: unknown): string;
    /**
     * Valide les données de mutation d'organisme
     */
    static validateMutationData(data: unknown): MutationData;
    /**
     * Valide et sanitise les chemins de fichiers
     */
    static validateFilePath(path: unknown): string;
    /**
     * Valide les objets JSON en détectant les injections NoSQL
     */
    static validateJSON(jsonString: unknown): any;
    /**
     * Valide les UUIDs
     */
    static validateUUID(uuid: unknown): string;
    /**
     * Valide les IDs de session
     */
    static validateSessionId(sessionId: unknown): string;
    /**
     * Valide les paramètres d'API avec whitelist
     */
    static validateApiParams(params: unknown, allowedParams: string[]): Record<string, any>;
    /**
     * Valide les données de configuration utilisateur
     */
    static validateUserPreferences(preferences: unknown): UserPreferences;
    /**
     * Recherche récursive d'injections dans les objets
     */
    private static validateObjectForInjection;
    /**
     * Valide la sécurité des regex pour éviter ReDoS
     */
    static validateRegexSafety(pattern: string, input: string, timeoutMs?: number): boolean;
    /**
     * Échappe les caractères spéciaux pour utilisation dans regex
     */
    static escapeRegex(string: string): string;
    /**
     * Valide les limites de taux (rate limiting)
     */
    static validateRateLimit(identifier: string, maxRequests?: number, windowMs?: number): boolean;
    private static rateLimitCache;
    private static getRateLimitData;
    private static incrementRateLimit;
}
export interface MutationData {
    type: string;
    strength: number;
    target?: string;
}
export interface UserPreferences {
    theme?: 'light' | 'dark' | 'auto';
    notifications?: boolean;
    language?: string;
}
export declare const sanitize: typeof InputValidator.sanitizeUserInput;
export declare const validateEmail: typeof InputValidator.validateEmail;
export declare const validateJSON: typeof InputValidator.validateJSON;
export declare const validateOrganismName: typeof InputValidator.validateOrganismName;
//# sourceMappingURL=InputValidator.d.ts.map