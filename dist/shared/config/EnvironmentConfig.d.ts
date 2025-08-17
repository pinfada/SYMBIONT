/**
 * Configuration d'environnement centralisée et sécurisée
 * Gère les variables d'environnement avec validation et fallbacks
 */
export interface SecurityConfig {
    jwtSecret: string;
    jwtRefreshSecret: string;
    apiKey: string;
    adminApiKey: string;
    encryptionKey: string;
}
export interface ServerConfig {
    port: number;
    adminPort: number;
    corsOrigin: string;
    allowedHosts: string[];
    rateLimit: {
        windowMs: number;
        maxRequests: number;
    };
}
export interface DatabaseConfig {
    url: string;
    mongoUrl?: string;
    name: string;
}
export interface APIConfig {
    baseUrl: string;
    wsUrl: string;
    timeout: number;
}
export interface FeatureFlags {
    useRealMetrics: boolean;
    useRealDNA: boolean;
    useRealBehavior: boolean;
    useBackendAPI: boolean;
    enableDebugLogging: boolean;
    enablePerformanceProfiling: boolean;
}
export interface LoggingConfig {
    level: 'error' | 'warn' | 'info' | 'debug';
    format: 'json' | 'text';
    retentionDays: number;
}
export interface MonitoringConfig {
    enableMetrics: boolean;
    metricsEndpoint: string;
    metricsAuthToken?: string;
    enableTracing: boolean;
    tracingEndpoint?: string;
    traceSampleRate: number;
}
export interface AppConfig {
    environment: 'development' | 'staging' | 'production';
    security: SecurityConfig;
    server: ServerConfig;
    database: DatabaseConfig;
    api: APIConfig;
    features: FeatureFlags;
    logging: LoggingConfig;
    monitoring: MonitoringConfig;
}
export declare class EnvironmentConfig {
    private static instance;
    private config;
    private isValidated;
    private constructor();
    static getInstance(): EnvironmentConfig;
    /**
     * Charge la configuration depuis les variables d'environnement
     */
    private loadConfiguration;
    /**
     * Récupère une variable d'environnement avec validation
     */
    private getEnvVar;
    /**
     * Récupère une variable numérique
     */
    private getEnvNumber;
    /**
     * Récupère une variable booléenne
     */
    private getEnvBoolean;
    /**
     * Configuration environnement
     */
    private getEnvironment;
    /**
     * Configuration sécurité
     */
    private getSecurityConfig;
    /**
     * Configuration serveur
     */
    private getServerConfig;
    /**
     * Configuration base de données
     */
    private getDatabaseConfig;
    /**
     * Configuration API
     */
    private getAPIConfig;
    /**
     * Feature flags
     */
    private getFeatureFlags;
    /**
     * Configuration logging
     */
    private getLoggingConfig;
    /**
     * Configuration monitoring
     */
    private getMonitoringConfig;
    /**
     * Valide la configuration
     */
    validate(): {
        valid: boolean;
        errors: string[];
    };
    /**
     * Accesseurs publics
     */
    getConfig(): AppConfig;
    getSecurity(): SecurityConfig;
    getServer(): ServerConfig;
    getFeatures(): FeatureFlags;
    isProduction(): boolean;
    isDevelopment(): boolean;
    /**
     * Redémarre la configuration (pour les tests)
     */
    reload(): void;
}
export declare const appConfig: EnvironmentConfig;
//# sourceMappingURL=EnvironmentConfig.d.ts.map