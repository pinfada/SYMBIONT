/**
 * Gestionnaire de health checks automatiques pour surveiller la santé du système
 */
export interface HealthCheckConfig {
    name: string;
    interval: number;
    timeout: number;
    retryAttempts: number;
    criticalLevel: 'low' | 'medium' | 'high';
}
export interface HealthCheckResult {
    name: string;
    status: 'healthy' | 'warning' | 'critical' | 'unknown';
    message: string;
    responseTime: number;
    timestamp: number;
    details?: Record<string, unknown>;
}
export interface SystemHealthStatus {
    overallStatus: 'healthy' | 'degraded' | 'critical' | 'unknown';
    checks: HealthCheckResult[];
    lastUpdate: number;
    totalChecks: number;
    healthyChecks: number;
    criticalChecks: number;
}
/**
 * Gestionnaire principal des health checks
 */
export declare class HealthCheckManager {
    private checks;
    private results;
    private intervals;
    private isRunning;
    constructor();
    /**
     * Configure les health checks par défaut
     */
    private setupDefaultChecks;
    /**
     * Enregistre un nouveau health check
     */
    registerCheck(name: string, config: HealthCheckConfig, checkFunction: () => Promise<Omit<HealthCheckResult, 'name'>>): void;
    /**
     * Démarre tous les health checks
     */
    start(): void;
    /**
     * Arrête tous les health checks
     */
    stop(): void;
    /**
     * Démarre un health check spécifique
     */
    private startCheck;
    /**
     * Exécute un health check avec gestion des erreurs et retry
     */
    private executeCheck;
    /**
     * Récupère le statut global du système
     */
    getSystemHealth(): SystemHealthStatus;
    /**
     * Récupère le résultat d'un check spécifique
     */
    getCheckResult(name: string): HealthCheckResult | null;
    /**
     * Force l'exécution d'un check spécifique
     */
    forceCheck(name: string): Promise<HealthCheckResult | null>;
}
export declare const healthCheckManager: HealthCheckManager;
//# sourceMappingURL=HealthCheckManager.d.ts.map