/**
 * FeatureFlagService - Gestion centralisée des feature flags
 * Sépare proprement le comportement dev/staging/production
 */
export interface FeatureFlags {
    USE_REAL_METRICS: boolean;
    USE_REAL_DNA: boolean;
    USE_REAL_BEHAVIOR: boolean;
    USE_BACKEND_API: boolean;
    ENABLE_DEBUG_LOGGING: boolean;
    ENABLE_PERFORMANCE_PROFILING: boolean;
    ENABLE_MOCK_DATA: boolean;
    ENABLE_SECURITY_AUDIT: boolean;
    ENABLE_ADVANCED_ANALYTICS: boolean;
    ENABLE_A_B_TESTING: boolean;
}
export type Environment = 'development' | 'staging' | 'production';
declare class FeatureFlagService {
    private static instance;
    private environment;
    private flags;
    private overrides;
    private constructor();
    static getInstance(): FeatureFlagService;
    /**
     * Détecte l'environnement actuel
     */
    private detectEnvironment;
    /**
     * Initialise les flags selon l'environnement
     */
    private initializeFlags;
    /**
     * Charge les overrides depuis localStorage et variables d'env
     */
    private loadOverrides;
    /**
     * Obtient la valeur d'un feature flag
     */
    isEnabled(flag: keyof FeatureFlags): boolean;
    /**
     * Override temporaire d'un flag (dev uniquement)
     */
    setFlag(flag: keyof FeatureFlags, value: boolean): void;
    /**
     * Remet à zéro tous les overrides
     */
    resetOverrides(): void;
    /**
     * Obtient l'environnement actuel
     */
    getEnvironment(): Environment;
    /**
     * Obtient tous les flags actuels (pour debug)
     */
    getAllFlags(): FeatureFlags & {
        environment: Environment;
    };
    /**
     * Vérifie si on est en mode développement
     */
    isDevelopment(): boolean;
    /**
     * Vérifie si on est en mode staging
     */
    isStaging(): boolean;
    /**
     * Vérifie si on est en mode production
     */
    isProduction(): boolean;
    /**
     * Exécute du code conditionnel selon l'environnement
     */
    runInEnvironment<T>(handlers: {
        development?: () => T;
        staging?: () => T;
        production?: () => T;
        default?: () => T;
    }): T | undefined;
    /**
     * Log conditionnel selon les feature flags
     */
    debugLog(message: string, ...args: unknown[]): void;
    /**
     * Performance profiling conditionnel
     */
    profileOperation<T>(name: string, operation: () => T): T;
    /**
     * Exécution conditionnelle selon feature flag
     */
    whenEnabled<T>(flag: keyof FeatureFlags, operation: () => T): T | undefined;
    /**
     * Utilitaire pour lire variables d'environnement boolean
     */
    private getEnvBoolean;
    /**
     * Validation de sécurité - vérifie qu'on n'utilise pas de données mock en prod
     */
    validateProductionSafety(): void;
}
export default FeatureFlagService;
//# sourceMappingURL=FeatureFlagService.d.ts.map