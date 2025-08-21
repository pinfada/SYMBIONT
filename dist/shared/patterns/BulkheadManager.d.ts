/**
 * Implémentation du pattern Bulkhead pour l'isolation des ressources
 * Évite qu'une défaillance dans un composant affecte les autres
 */
export interface BulkheadConfig {
    name: string;
    maxConcurrentRequests: number;
    timeout: number;
    fallbackStrategy: 'circuit-breaker' | 'fail-fast' | 'retry';
    retryAttempts?: number;
}
export interface BulkheadMetrics {
    name: string;
    activeRequests: number;
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    averageResponseTime: number;
    lastError?: string;
    lastErrorTime?: number;
}
/**
 * Gestionnaire de bulkheads pour l'isolation des services
 */
export declare class BulkheadManager {
    private bulkheads;
    private metrics;
    /**
     * Crée ou récupère un bulkhead pour un service
     */
    createBulkhead(config: BulkheadConfig): Bulkhead;
    /**
     * Exécute une fonction dans un bulkhead isolé
     */
    execute<T>(bulkheadName: string, operation: () => Promise<T>, _context?: string): Promise<T>;
    /**
     * Met à jour les métriques d'un bulkhead
     */
    private updateMetrics;
    /**
     * Récupère les métriques de tous les bulkheads
     */
    getMetrics(): BulkheadMetrics[];
    /**
     * Récupère les métriques d'un bulkhead spécifique
     */
    getBulkheadMetrics(name: string): BulkheadMetrics | null;
    /**
     * Vérifie la santé de tous les bulkheads
     */
    getHealthStatus(): Record<string, 'healthy' | 'degraded' | 'failed'>;
}
/**
 * Implémentation d'un bulkhead individuel
 */
declare class Bulkhead {
    private config;
    private activeRequests;
    private circuitBreakerOpen;
    private lastFailureTime;
    private readonly circuitBreakerTimeout;
    constructor(config: BulkheadConfig);
    execute<T>(operation: () => Promise<T>): Promise<T>;
    private executeWithTimeout;
    private waitForSlot;
    private handleFailure;
}
export declare const bulkheadManager: BulkheadManager;
export {};
//# sourceMappingURL=BulkheadManager.d.ts.map