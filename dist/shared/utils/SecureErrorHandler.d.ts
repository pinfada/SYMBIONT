export declare class SecureError extends Error {
    readonly cause?: Error | undefined;
    readonly errorId: string;
    readonly timestamp: number;
    readonly category: ErrorCategory;
    readonly severity: ErrorSeverity;
    readonly context: string | undefined;
    constructor(message: string, category: ErrorCategory | undefined, severity: ErrorSeverity | undefined, context: string | undefined, cause?: Error | undefined);
    private generateErrorId;
    toSafeObject(): SafeErrorObject;
    private getSafeMessage;
    private getGenericMessage;
}
export type ErrorCategory = 'AUTHENTICATION' | 'AUTHORIZATION' | 'VALIDATION' | 'NETWORK' | 'STORAGE' | 'CRYPTO' | 'PERFORMANCE' | 'GENERAL';
export type ErrorSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export interface SafeErrorObject {
    errorId: string;
    timestamp: number;
    category: ErrorCategory;
    severity: ErrorSeverity;
    message: string;
    context?: string;
}
export declare class SecureErrorHandler {
    private static readonly MAX_STACK_DEPTH;
    private static readonly SENSITIVE_PATTERNS;
    /**
     * Traite une erreur de manière sécurisée
     */
    static handleError(error: Error | unknown, category?: ErrorCategory, context?: string, additionalInfo?: Record<string, unknown>): SecureError;
    /**
     * Crée une erreur sécurisée à partir d'une erreur standard
     */
    private static createSecureError;
    /**
     * Détermine la sévérité de l'erreur
     */
    private static determineSeverity;
    /**
     * Extrait un message sûr de l'erreur en supprimant les informations sensibles
     */
    private static extractSafeMessage;
    /**
     * Sanitise le message d'erreur en supprimant les informations sensibles
     */
    private static sanitizeErrorMessage;
    /**
     * Logger l'erreur de manière sécurisée
     */
    private static logErrorSecurely;
    /**
     * Sanitise la stack trace
     */
    private static sanitizeStack;
    /**
     * Actions à prendre selon la sévérité
     */
    private static handleErrorBySeverity;
    /**
     * Alerte l'équipe de sécurité (simulation)
     */
    private static alertSecurityTeam;
    /**
     * Incrémente le compteur d'erreurs
     */
    private static incrementErrorCounter;
    /**
     * Track les patterns d'erreurs
     */
    private static trackErrorPattern;
    /**
     * Gère les erreurs async de manière sécurisée
     */
    static handleAsyncError<T>(operation: () => Promise<T>, category?: ErrorCategory, context?: string): Promise<T | null>;
    /**
     * Wrap une fonction pour la gestion d'erreurs sécurisée
     */
    static wrapFunction<T extends (...args: unknown[]) => any>(fn: T, category?: ErrorCategory, context?: string): T;
    /**
     * Crée une réponse d'erreur sécurisée pour les APIs
     */
    static createApiErrorResponse(error: SecureError, includeErrorId?: boolean): ApiErrorResponse;
    /**
     * Valide si une erreur doit être exposée publiquement
     */
    static shouldExposeError(error: SecureError): boolean;
}
export interface ApiErrorResponse {
    success: false;
    message: string;
    timestamp: number;
    errorId?: string;
    category?: ErrorCategory;
    severity?: ErrorSeverity;
}
export declare const handleError: typeof SecureErrorHandler.handleError;
export declare const handleAsyncError: typeof SecureErrorHandler.handleAsyncError;
export declare const wrapFunction: typeof SecureErrorHandler.wrapFunction;
export declare function HandleErrors(category?: ErrorCategory, context?: string): (target: any, propertyKey: string, descriptor: PropertyDescriptor) => PropertyDescriptor;
//# sourceMappingURL=SecureErrorHandler.d.ts.map